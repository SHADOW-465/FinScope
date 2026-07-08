import { NextRequest, NextResponse } from "next/server";
import pdfParser from "pdf-parse/lib/pdf-parse.js";
import { detectBank } from "@/lib/parser/detector";
import { parseStatementText, RawTransaction } from "@/lib/parser/extractors";
import { checkStatementIntegrity } from "@/lib/parser/integrity";
import { classifyTransactions, ClassifiedTransaction } from "@/lib/engine/classifier";
import { computeRiskProfile } from "@/lib/engine/risk";
import { evaluatePolicy, getDefaultPolicy, policyInputFromRiskProfile } from "@/lib/policy/policies";
import { createSupabaseServerClient } from "@/lib/db/server";
import type { LoanAsk, ProductType } from "@/types/domain";
import { extractScannedPages, performGroqOCR } from "@/lib/parser/ocr";

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const password = formData.get("password") as string | null;
    const caseId = formData.get("caseId") as string | null;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files uploaded" },
        { status: 400 }
      );
    }

    // If a caseId was supplied, resolve the case (and its loan ask) up front.
    // RLS on applicant_cases means this only succeeds for a case the caller's
    // organization actually owns — no manual org check needed here.
    let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>> | null = null;
    let caseOrgId: string | null = null;
    let loanAsk: LoanAsk | undefined = undefined;

    // Case-less (ephemeral) uploads can pass the loan ask directly so FOIR
    // and the policy verdict still compute without auth.
    const formProductType = formData.get("productType") as string | null;
    const formAmount = Number(formData.get("requestedAmount"));
    const formTenure = Number(formData.get("tenureMonths"));
    if (!caseId && formProductType && formAmount > 0 && Number.isInteger(formTenure) && formTenure > 0) {
      loanAsk = {
        productType: formProductType as ProductType,
        requestedAmount: formAmount,
        tenureMonths: formTenure,
      };
    }

    if (caseId) {
      supabase = await createSupabaseServerClient();
      const { data: caseRow, error: caseErr } = await supabase
        .from("applicant_cases")
        .select("id, org_id, product_type, requested_amount, tenure_months, interest_rate_annual_pct")
        .eq("id", caseId)
        .maybeSingle();

      if (caseErr || !caseRow) {
        return NextResponse.json({ error: "Case not found" }, { status: 404 });
      }

      caseOrgId = caseRow.org_id as string;
      loanAsk = {
        productType: caseRow.product_type as ProductType,
        requestedAmount: caseRow.requested_amount as number,
        tenureMonths: caseRow.tenure_months as number,
        interestRateAnnualPct: (caseRow.interest_rate_annual_pct as number | null) ?? undefined,
      };

      await supabase.from("applicant_cases").update({ status: "processing" }).eq("id", caseId);
    }

    const groups = new Map<string, any>();

    for (let idx = 0; idx < files.length; idx++) {
      const file = files[idx];
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      let pdfData;
      try {
        if (password) {
          // pdf-parse doesn't forward custom parameters to getDocument by default,
          // but we can pass a DocumentInitParameters object as the first argument,
          // which is directly passed to PDFJS.getDocument().
          pdfData = await pdfParser({ data: buffer, password } as any);
        } else {
          pdfData = await pdfParser(buffer);
        }
      } catch (err: any) {
        console.error(`Error parsing PDF ${file.name}:`, err);
        const isPasswordRequired = err.name === "PasswordException" || 
                                   err.message?.toLowerCase().includes("password") ||
                                   err.message?.toLowerCase().includes("decrypt");
        
        if (isPasswordRequired) {
          return NextResponse.json(
            { 
              error: `Password protected PDF: Failed to decrypt ${file.name}. Please enter the correct password.`,
              code: "PASSWORD_REQUIRED",
              fileName: file.name
            },
            { status: 422 }
          );
        }
        
        return NextResponse.json(
          { error: `Failed to parse PDF ${file.name}: ${err.message || err}` },
          { status: 422 }
        );
      }

      let parsedData;
      let bankName;
      let ocrUsed = false;
      const extractedText = pdfData.text || "";

      if (extractedText.trim().length < 150) {
        // Scanned statement PDF - needs OCR!
        ocrUsed = true;
        try {
          const images = await extractScannedPages(buffer);
          if (images.length === 0) {
            return NextResponse.json(
              { error: `No readable text found in PDF ${file.name}, and image extraction failed.` },
              { status: 422 }
            );
          }
          const ocrResult = await performGroqOCR(images);
          
          parsedData = {
            accountNumber: ocrResult.accountNumber,
            accountHolder: ocrResult.accountHolder,
            statementPeriod: ocrResult.statementPeriod,
            openingBalance: ocrResult.openingBalance,
            closingBalance: ocrResult.closingBalance,
            transactions: ocrResult.transactions.map((t) => ({
              date: t.date,
              description: t.description,
              debit: t.debit,
              credit: t.credit,
              balance: t.balance,
            })),
          };
          bankName = ocrResult.bankName || "GENERIC";
        } catch (ocrErr: any) {
          console.error(`OCR failed for PDF ${file.name}:`, ocrErr);
          return NextResponse.json(
            { error: `Failed to perform OCR on scanned PDF ${file.name}: ${ocrErr.message}` },
            { status: 422 }
          );
        }
      } else {
        // Native text PDF
        // Detect Bank
        bankName = detectBank(extractedText);

        // Parse text to extract transactions & metadata
        parsedData = parseStatementText(extractedText, bankName);
      }

      // Determine unique group key for this account
      let groupKey = `${bankName}_${parsedData.accountNumber}`;
      if (parsedData.accountNumber === "Unknown") {
        groupKey = `${bankName}_${parsedData.accountHolder}`;
      }
      if (parsedData.accountNumber === "Unknown" && parsedData.accountHolder === "Unknown") {
        groupKey = `Unknown_File_${idx}`;
      }
      groupKey = groupKey.replace(/[^a-zA-Z0-9_]/g, "_");

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          id: groupKey,
          bankName: bankName,
          accountNumber: parsedData.accountNumber,
          accountHolder: parsedData.accountHolder,
          statementPeriod: parsedData.statementPeriod,
          openingBalance: parsedData.openingBalance || 0,
          closingBalance: parsedData.closingBalance || 0,
          files: []
        });
      }

      groups.get(groupKey).files.push({
        name: file.name,
        index: idx,
        parsed: parsedData,
        ocrUsed: ocrUsed
      });
    }

    const reports: Record<string, any> = {};
    const accountsList: any[] = [];

    for (const [key, group] of groups.entries()) {
      const allTxns: RawTransaction[] = [];

      // Merge transactions from files in this group
      group.files.forEach((fObj: any, fIdx: number) => {
        const txnsWithOrigin = fObj.parsed.transactions.map((tx: any, tIdx: number) => ({
          ...tx,
          fileOrigin: fObj.name,
          fileIndex: fIdx,
          txnIndex: tIdx
        }));
        allTxns.push(...txnsWithOrigin);
      });

      if (allTxns.length === 0) continue;

      // Stable sort transactions chronologically by date, then fileIndex, then txnIndex
      allTxns.sort((a: any, b: any) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;

        const fileCompare = a.fileIndex - b.fileIndex;
        if (fileCompare !== 0) return fileCompare;

        return a.txnIndex - b.txnIndex;
      });

      // Deduce overall metadata for this group
      let groupAccountNumber = "Unknown";
      let groupAccountHolder = "Unknown";
      for (const fObj of group.files) {
        if (fObj.parsed.accountNumber !== "Unknown") {
          groupAccountNumber = fObj.parsed.accountNumber;
          break;
        }
      }
      for (const fObj of group.files) {
        if (fObj.parsed.accountHolder !== "Unknown") {
          groupAccountHolder = fObj.parsed.accountHolder;
          break;
        }
      }
      if (groupAccountNumber === "Unknown") groupAccountNumber = group.accountNumber;
      if (groupAccountHolder === "Unknown") groupAccountHolder = group.accountHolder;

      // Opening balance of the first transaction (in chronological order)
      const firstTx = allTxns[0];
      const change = firstTx.credit - firstTx.debit;
      const groupOpeningBalance = firstTx.balance - change;

      // Closing balance of the last transaction
      const groupClosingBalance = allTxns[allTxns.length - 1].balance;

      // Statement period
      const groupStatementPeriod = `${allTxns[0].date} to ${allTxns[allTxns.length - 1].date}`;

      // Statement integrity: running-balance reconciliation (PRD-v2 §B.4).
      // Surfaced separately from the risk score, not folded into it.
      const integrityReport = checkStatementIntegrity(allTxns, { openingBalance: groupOpeningBalance });

      // Classify transactions
      const classifiedTransactions: ClassifiedTransaction[] = classifyTransactions(allTxns);

      // Compute Underwriting Score and Risk Profile for this group
      const riskProfile = computeRiskProfile(
        classifiedTransactions,
        groupOpeningBalance,
        groupClosingBalance,
        groupAccountNumber,
        groupAccountHolder,
        group.bankName,
        groupStatementPeriod,
        loanAsk
      );

      // Lender policy verdict, only meaningful once a loan ask exists.
      const policyEvaluation = loanAsk
        ? evaluatePolicy(policyInputFromRiskProfile(riskProfile), getDefaultPolicy(loanAsk.productType))
        : null;

      // ---------------------------------------------------------------
      // Persist to Supabase when this upload is attached to a case.
      // ---------------------------------------------------------------
      if (supabase && caseId && caseOrgId) {
        const documentIdByFileIndex: string[] = [];
        for (const fObj of group.files) {
          const { data: doc, error: docErr } = await supabase
            .from("documents")
            .insert({
              case_id: caseId,
              org_id: caseOrgId,
              bank_name: group.bankName,
              account_key: key,
              account_holder: groupAccountHolder,
              account_number: groupAccountNumber,
              statement_period: groupStatementPeriod,
              opening_balance: groupOpeningBalance,
              closing_balance: groupClosingBalance,
              file_path: null,
              sha256: null,
              page_count: null,
              integrity_status: integrityReport.status,
              ocr_used: !!fObj.ocrUsed,
              processing_status: "done",
            })
            .select("id")
            .single();

          if (docErr || !doc) {
            throw new Error(`Failed to persist document record: ${docErr?.message}`);
          }
          documentIdByFileIndex[fObj.index] = doc.id;
        }

        const documentIdByLocalFileIndex = group.files.map((fObj: any) => documentIdByFileIndex[fObj.index]);

        const txnRows = classifiedTransactions.map((t: any, seq: number) => ({
          document_id: documentIdByLocalFileIndex[t.fileIndex] ?? documentIdByLocalFileIndex[0],
          case_id: caseId,
          org_id: caseOrgId,
          seq,
          date: t.date,
          raw_desc: t.description,
          normalized_desc: null,
          credit: t.credit,
          debit: t.debit,
          balance: t.balance,
          category: t.category,
          counterparty: t.counterparty,
          counterparty_type: null,
          payment_method: null,
          confidence: t.confidenceScore,
          page_number: null,
          ai_enhanced: !!t.aiEnhanced,
        }));

        for (const batch of chunk(txnRows, 500)) {
          const { error: txnErr } = await supabase.from("transactions").insert(batch);
          if (txnErr) throw new Error(`Failed to persist transactions: ${txnErr.message}`);
        }

        const { error: riskErr } = await supabase.from("risk_results").insert({
          case_id: caseId,
          org_id: caseOrgId,
          account_key: key,
          overall_score: riskProfile.risk_score.score,
          component_scores: riskProfile.risk_score.breakdown,
          triggered_rules: policyEvaluation ? policyEvaluation.triggeredRules.map((r) => r.id) : [],
          recommendation: policyEvaluation ? policyEvaluation.verdict : null,
          policy_profile_id: policyEvaluation ? policyEvaluation.policyName : null,
        });
        if (riskErr) throw new Error(`Failed to persist risk result: ${riskErr.message}`);

        const metricRows = [
          { metric_id: "average_daily_balance", value: riskProfile.overview.averageBalance, unit: "INR" },
          { metric_id: "income_stability", value: riskProfile.metrics.income_stability, unit: "score_0_100" },
          { metric_id: "emi_burden", value: riskProfile.metrics.emi_burden, unit: "pct" },
          { metric_id: "foir_pre_loan", value: riskProfile.foir.pre_loan_pct, unit: "pct" },
          { metric_id: "foir_post_loan", value: riskProfile.foir.post_loan_pct, unit: "pct" },
          { metric_id: "underwriting_score", value: riskProfile.risk_score.score, unit: "score_0_100" },
        ].map((m) => ({
          case_id: caseId,
          org_id: caseOrgId,
          account_key: key,
          metric_id: m.metric_id,
          value: m.value,
          unit: m.unit,
          formula_version: "v1",
          source_refs: [],
        }));
        const { error: metricsErr } = await supabase.from("metrics").insert(metricRows);
        if (metricsErr) throw new Error(`Failed to persist metrics: ${metricsErr.message}`);

        await supabase.from("applicant_cases").update({ status: "ready" }).eq("id", caseId);

        await supabase.from("audit_log").insert({
          org_id: caseOrgId,
          action: "analysis_completed",
          target: caseId,
          metadata: {
            account_group: key,
            transactions: classifiedTransactions.length,
            integrity_status: integrityReport.status,
            policy_verdict: policyEvaluation?.verdict ?? null,
          },
        });
      }

      reports[key] = {
        overview: riskProfile.overview,
        metrics: riskProfile.metrics,
        foir: riskProfile.foir,
        risk_score: riskProfile.risk_score,
        transactions: classifiedTransactions,
        monthly_analysis: riskProfile.monthly_analysis,
        income_analysis: riskProfile.income_analysis,
        liability_analysis: riskProfile.liability_analysis,
        bounce_analysis: riskProfile.bounce_analysis,
        balance_risks: riskProfile.balance_risks,
        integrity: integrityReport,
        policy: policyEvaluation
      };

      accountsList.push({
        id: key,
        accountNumber: groupAccountNumber,
        accountHolder: groupAccountHolder,
        bankName: group.bankName,
        statementPeriod: groupStatementPeriod,
        transactionsCount: classifiedTransactions.length
      });
    }

    if (accountsList.length === 0) {
      return NextResponse.json(
        { error: "No transactions could be extracted from the uploaded statements. Please verify they are valid commercial statements." },
        { status: 422 }
      );
    }

    return NextResponse.json({
      accounts: accountsList,
      reports: reports,
      caseId: caseId || undefined
    });

  } catch (error: any) {
    console.error("Statement processing crashed:", error);
    return NextResponse.json(
      { error: `Internal server error: ${error.message || error}` },
      { status: 500 }
    );
  }
}
export const maxDuration = 60; // statement parsing + Supabase writes can exceed the previous 30s budget
export const dynamic = "force-dynamic";
