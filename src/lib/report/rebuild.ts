/**
 * Rebuilds a case's dashboard report from persisted rows.
 *
 * Numbers are never stored and re-served stale: transactions are the source
 * of truth, and every metric is recomputed by the same deterministic engines
 * the upload path uses. Grouped per account_key so multi-account cases keep
 * separate ledgers.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkStatementIntegrity } from "@/lib/parser/integrity";
import type { ClassifiedTransaction } from "@/lib/engine/classifier";
import { computeRiskProfile } from "@/lib/engine/risk";
import {
  evaluatePolicy,
  getDefaultPolicy,
  policyInputFromRiskProfile,
} from "@/lib/policy/policies";
import type { LoanAsk, ProductType } from "@/types/domain";

export interface CaseReportBundle {
  accounts: Array<{
    id: string;
    accountNumber: string;
    accountHolder: string;
    bankName: string;
    statementPeriod: string;
    transactionsCount: number;
  }>;
  reports: Record<string, any>;
}

export async function rebuildCaseReport(
  supabase: SupabaseClient,
  caseId: string
): Promise<CaseReportBundle | null> {
  const { data: caseRow } = await supabase
    .from("applicant_cases")
    .select("id, product_type, requested_amount, tenure_months, interest_rate_annual_pct")
    .eq("id", caseId)
    .maybeSingle();

  if (!caseRow) return null;

  const loanAsk: LoanAsk = {
    productType: caseRow.product_type as ProductType,
    requestedAmount: caseRow.requested_amount as number,
    tenureMonths: caseRow.tenure_months as number,
    interestRateAnnualPct: (caseRow.interest_rate_annual_pct as number | null) ?? undefined,
  };

  const { data: documents } = await supabase
    .from("documents")
    .select("id, bank_name, account_key, account_holder, account_number, statement_period, opening_balance, closing_balance")
    .eq("case_id", caseId);

  const { data: txns } = await supabase
    .from("transactions")
    .select("document_id, seq, date, raw_desc, credit, debit, balance, category, counterparty, confidence, ai_enhanced")
    .eq("case_id", caseId)
    .order("seq", { ascending: true });

  if (!documents || documents.length === 0 || !txns || txns.length === 0) {
    return null;
  }

  const accountKeyByDocumentId = new Map<string, string>();
  const docMetaByAccountKey = new Map<string, (typeof documents)[number]>();
  for (const doc of documents) {
    const key = doc.account_key || "default";
    accountKeyByDocumentId.set(doc.id, key);
    if (!docMetaByAccountKey.has(key)) docMetaByAccountKey.set(key, doc);
  }

  const txnsByAccountKey = new Map<string, ClassifiedTransaction[]>();
  for (const t of txns) {
    const key = accountKeyByDocumentId.get(t.document_id) || "default";
    const classified: ClassifiedTransaction = {
      date: t.date,
      description: t.raw_desc,
      credit: Number(t.credit),
      debit: Number(t.debit),
      balance: Number(t.balance),
      transactionType: Number(t.credit) > 0 ? "CREDIT" : "DEBIT",
      category: t.category || "Miscellaneous",
      counterparty: t.counterparty || "Unknown",
      confidenceScore: t.confidence !== null ? Number(t.confidence) : 0.7,
      aiEnhanced: !!t.ai_enhanced,
    };
    const list = txnsByAccountKey.get(key);
    if (list) list.push(classified);
    else txnsByAccountKey.set(key, [classified]);
  }

  const accounts: CaseReportBundle["accounts"] = [];
  const reports: Record<string, any> = {};

  for (const [key, accountTxns] of txnsByAccountKey.entries()) {
    const meta = docMetaByAccountKey.get(key);
    const bankName = meta?.bank_name || "Unknown";
    const accountHolder = meta?.account_holder || "Unknown";
    const accountNumber = meta?.account_number || "Unknown";
    const statementPeriod =
      meta?.statement_period ||
      `${accountTxns[0].date} to ${accountTxns[accountTxns.length - 1].date}`;

    const firstTx = accountTxns[0];
    const openingBalance =
      meta?.opening_balance !== null && meta?.opening_balance !== undefined
        ? Number(meta.opening_balance)
        : firstTx.balance - (firstTx.credit - firstTx.debit);
    const closingBalance =
      meta?.closing_balance !== null && meta?.closing_balance !== undefined
        ? Number(meta.closing_balance)
        : accountTxns[accountTxns.length - 1].balance;

    const integrity = checkStatementIntegrity(accountTxns, { openingBalance });

    const riskProfile = computeRiskProfile(
      accountTxns,
      openingBalance,
      closingBalance,
      accountNumber,
      accountHolder,
      bankName,
      statementPeriod,
      loanAsk
    );

    const policy = evaluatePolicy(
      policyInputFromRiskProfile(riskProfile),
      getDefaultPolicy(loanAsk.productType)
    );

    reports[key] = {
      overview: riskProfile.overview,
      metrics: riskProfile.metrics,
      foir: riskProfile.foir,
      risk_score: riskProfile.risk_score,
      transactions: accountTxns,
      monthly_analysis: riskProfile.monthly_analysis,
      income_analysis: riskProfile.income_analysis,
      liability_analysis: riskProfile.liability_analysis,
      bounce_analysis: riskProfile.bounce_analysis,
      balance_risks: riskProfile.balance_risks,
      integrity,
      policy,
    };

    accounts.push({
      id: key,
      accountNumber,
      accountHolder,
      bankName,
      statementPeriod,
      transactionsCount: accountTxns.length,
    });
  }

  return { accounts, reports };
}
