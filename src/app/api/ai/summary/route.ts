import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { buildAIContext } from "@/lib/ai/context-builder";
import { validateAIResponse, RECOMMENDATIONS } from "@/lib/ai/validate";
import { createSupabaseServerClient } from "@/lib/db/server";

export const dynamic = "force-dynamic";

const MODEL = "llama3-70b-8192";

export async function POST(req: NextRequest) {
  try {
    const { report, caseId } = await req.json();
    if (!report?.risk_score || !report?.foir) {
      return NextResponse.json({ error: "report with risk_score and foir is required" }, { status: 400 });
    }

    const apiKey = process.env.GROK_API_KEY || process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "No AI provider configured (GROK_API_KEY missing in .env.local)" }, { status: 503 });
    }

    const context = buildAIContext(report, report.policy ?? undefined);

    const systemPrompt = `You are a credit officer writing an underwriting opinion. You may ONLY use the metrics and evidence supplied below — never invent numbers or transactions.

METRICS:
${context.metrics.map((m) => `${m.id}: ${m.label} = ${m.value}`).join("\n")}

EVIDENCE:
${context.evidence.map((e) => `${e.id}: [${e.kind}] ${e.label} — ${e.amount}`).join("\n")}
${report.policy ? `\nPOLICY VERDICT: ${report.policy.verdict} (${report.policy.policyName})\nRULES:\n${report.policy.allRules.map((r: any) => `rule.${r.id}: ${r.label} — ${r.passed ? "PASS" : "FAIL"}`).join("\n")}` : ""}

Respond with ONLY a JSON object, no markdown fences, exactly this shape:
{"strengths": ["..."], "concerns": ["..."], "recommendation": "${RECOMMENDATIONS.join('" | "')}", "evidence": ["<ids from the lists above that support your statements>"]}`;

    const client = new OpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1" });

    const started = Date.now();
    let parsed: unknown = null;
    let lastError = "";

    // One retry on validation failure, then give up honestly.
    for (let attempt = 0; attempt < 2; attempt++) {
      const completion = await client.chat.completions.create({
        model: MODEL,
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Write the underwriting opinion for this applicant." },
        ],
      });
      const raw = completion.choices[0]?.message?.content || "";
      try {
        parsed = JSON.parse(raw.replace(/^```json?\s*|```\s*$/g, "").trim());
      } catch {
        lastError = "Model did not return valid JSON.";
        continue;
      }
      const validation = validateAIResponse(parsed, context.allowedIds);
      if (validation.valid) {
        if (caseId) {
          const supabase = await createSupabaseServerClient();
          // RLS-scoped: silently skipped if the case isn't the caller's.
          const { data: caseRow } = await supabase
            .from("applicant_cases").select("org_id").eq("id", caseId).maybeSingle();
          if (caseRow) {
            await supabase.from("ai_responses").insert({
              case_id: caseId,
              org_id: caseRow.org_id,
              prompt_version: "credit-officer-v1",
              model: MODEL,
              question: "underwriting_summary",
              answer: parsed,
              referenced_metric_ids: (parsed as any).evidence ?? [],
              latency_ms: Date.now() - started,
              validated: true,
            });
          }
        }
        return NextResponse.json({ summary: parsed });
      }
      lastError = validation.errors.join(" ");
    }

    return NextResponse.json(
      { error: `AI response failed validation: ${lastError}` },
      { status: 502 }
    );
  } catch (error: any) {
    console.error("AI summary failed:", error);
    return NextResponse.json({ error: error.message || "AI summary failed" }, { status: 500 });
  }
}
