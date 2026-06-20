import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  try {
    const { message, overview, metrics, risk_score, income_analysis, liability_analysis, bounce_analysis, balance_risks, monthly_analysis, api_key, provider } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const contextText = JSON.stringify({
      overview,
      metrics,
      risk_score,
      income_analysis,
      liability_analysis,
      bounce_analysis,
      balance_risks_count: balance_risks?.length || 0,
      monthly_analysis
    }, null, 2);

    const systemPrompt = `You are FinScope AI, a world-class financial underwriting assistant designed for loan agencies and credit analysts.
Analyze the provided bank statement summary and answer the user's question with institutional precision, clarity, and depth.
Format your answer with clean Markdown (bullet points, bold text).

--- FINANCIAL CONTEXT ---
${contextText}

--- INSTRUCTIONS ---
- Answer the question directly using the provided financial context.
- Be objective and detail-oriented.
- Highlight specific figures, ratios (e.g. debt service, cash retention, EMI burden), and flags (e.g. cheque returns, low balance occurrences).
- If asked about loan repayment capacity (e.g., "repay a ₹10 lakh loan"), compute the DSCR (Debt Service Coverage Ratio) or debt ratio, and provide a clear, reasoned recommendation.`;

    // 1. If API Key is provided, use LLM
    if (api_key && api_key.trim() !== "") {
      const activeProvider = provider || "gemini";
      
      if (activeProvider === "gemini") {
        try {
          const genAI = new GoogleGenerativeAI(api_key);
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
          
          const result = await model.generateContent([
            { text: systemPrompt },
            { text: `User Question: ${message}` }
          ]);
          
          return NextResponse.json({ response: result.response.text() });
        } catch (e: any) {
          console.error("Gemini API call failed:", e);
          return NextResponse.json({ error: `Gemini API error: ${e.message}` }, { status: 502 });
        }
      } 
      
      if (activeProvider === "groq" || activeProvider === "openai") {
        try {
          const openai = new OpenAI({
            apiKey: api_key,
            baseURL: activeProvider === "groq" ? "https://api.groq.com/openai/v1" : undefined
          });
          
          const chatCompletion = await openai.chat.completions.create({
            model: activeProvider === "groq" ? "llama3-8b-8192" : "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: message }
            ]
          });
          
          return NextResponse.json({ response: chatCompletion.choices[0].message.content || "No response generated." });
        } catch (e: any) {
          console.error("OpenAI/Groq API call failed:", e);
          return NextResponse.json({ error: `LLM provider API error: ${e.message}` }, { status: 502 });
        }
      }
    }

    // 2. Fallback rule-based local response if no API key is provided
    const localResponse = generateLocalResponse(message, {
      overview,
      metrics,
      risk_score,
      income_analysis,
      liability_analysis,
      bounce_analysis,
      balance_risks,
      monthly_analysis
    });

    return NextResponse.json({ response: localResponse });

  } catch (error: any) {
    console.error("Chat route failed:", error);
    return NextResponse.json({ error: `Internal server error: ${error.message || error}` }, { status: 500 });
  }
}

function generateLocalResponse(query: string, data: any): string {
  const q = query.toLowerCase();
  
  const overview = data.overview || {};
  const metrics = data.metrics || {};
  const risk = data.risk_score || {};
  const incomes = data.income_analysis || [];
  const liabilities = data.liability_analysis || [];
  const bounces = data.bounce_analysis || [];
  const balanceRisks = data.balance_risks || [];
  const months = data.monthly_analysis || [];

  // Helper to format currency
  const fmt = (val: number) => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(val);
  };

  // Heuristic matching
  if (q.includes("income") || q.includes("earn") || q.includes("salary") || q.includes("revenue")) {
    const totalCredits = overview.totalCredits || 0;
    const monthlyAvg = totalCredits / Math.max(1, overview.durationMonths || 1);
    let sourcesList = incomes.map((i: any) => `- **${i.source}**: ${fmt(i.amount)} (${i.frequency}, category: ${i.category})`).join("\n");
    if (!sourcesList) sourcesList = "- No explicit monthly income sources identified.";
    
    return `### Income Estimation Analysis
Based on the statement for **${overview.accountHolder}**, we estimate:
- **Total Credits (Turnover)**: ${fmt(totalCredits)}
- **Average Monthly Income**: ${fmt(monthlyAvg)}
- **Income Stability Index**: \`${metrics.income_stability || 0}%\`

**Detected Income Streams**:
${sourcesList}

*Note: You can add a Gemini / Groq API key in Settings for general conversational questions.*`;
  }

  if (q.includes("loan") || q.includes("emi") || q.includes("liability") || q.includes("borrow") || q.includes("debt")) {
    let loanList = liabilities.map((l: any) => `- **${l.lender}**: ${fmt(l.emi_amount)}/month`).join("\n");
    if (!loanList) loanList = "- No active EMI payments or recurring loan debits identified in this statement period.";
    
    const monthlyIncome = (overview.totalCredits || 0) / Math.max(1, overview.durationMonths || 1);
    const emiBurden = metrics.emi_burden || 0;
    
    return `### Liabilities & Debt Obligations
The risk engine scanned transactions for recurring EMI keywords and lender counterparties:
- **Total Detected EMIs**: ${fmt(liabilities.reduce((sum: number, l: any) => sum + l.emi_amount, 0))} / month
- **EMI Burden Ratio**: \`${emiBurden}%\` (percentage of average credits spent on EMIs)
- **Debt-to-Balance Ratio**: \`${metrics.debt_ratio || 0}%\`

**Active Obligations**:
${loanList}

${emiBurden > 40 ? "⚠️ **Warning**: The customer has an EMI burden above 40%, indicating potential debt-servicing stress." : "✅ **Notice**: Debt servicing levels appear manageable relative to credits."}`;
  }

  if (q.includes("bounce") || q.includes("cheque") || q.includes("return") || q.includes("fail")) {
    let bounceList = bounces.map((b: any) => `- **${b.date}**: Cheque return narration: *"${b.description.slice(0, 45)}..."* (Charge: ${fmt(b.charge)})`).join("\n");
    if (!bounceList) bounceList = "- Zero cheque bounces, failed ECS clearances, or return charges detected.";
    
    return `### Cheque Returns & Payment Bounces
A critical check for payment defaults and insufficient funds (NSF) was performed:
- **Cheque Returns / ECS Failures**: \`${bounces.length}\` events
- **Bounces Penalty Impact**: ${bounces.length > 0 ? "High risk impact on underwriting score." : "No defaults flagged (Low Risk)."}

**Flagged Transactions**:
${bounceList}`;
  }

  if (q.includes("risk") || q.includes("score") || q.includes("health") || q.includes("underwrite")) {
    const riskScore = risk.score || 0;
    const level = risk.risk_level || "Unknown";
    
    return `### Underwriting Risk Assessment
FinScope has generated the following credit profile for this statement:
- **Underwriting Score**: \`${riskScore} / 100\`
- **Assigned Risk Level**: **${level}**
- **Average Banking Balance**: ${fmt(overview.averageBalance || 0)}
- **Negative Balance Events**: \`${balanceRisks.filter((r: any) => r.risk_type === "Negative Balance").length}\`

**Risk Parameter Performance**:
- **Income Stability**: \`${risk.breakdown?.["Income Stability"] || 0} / 100\`
- **Average Balance Score**: \`${risk.breakdown?.["Average Balance"] || 0} / 100\`
- **Cheque Bounce Score**: \`${risk.breakdown?.["Cheque Bounces"] || 0} / 100\`
- **EMI Debt Burden Score**: \`${risk.breakdown?.["Debt Burden (EMIs)"] || 0} / 100\``;
  }

  if (q.includes("repay") || q.includes("repayment") || q.includes("10 lakh") || q.includes("lakh") || q.includes("loan capacity")) {
    const monthlyIncome = (overview.totalCredits || 0) / Math.max(1, overview.durationMonths || 1);
    const existingEmi = liabilities.reduce((sum: number, l: any) => sum + l.emi_amount, 0);
    const freeCashFlow = (overview.totalCredits - overview.totalDebits) / Math.max(1, overview.durationMonths || 1);
    
    // Estimate a ₹10 lakh loan EMI at 12% interest for 3 years is approx ₹33,200/month
    const proposedEmi = 33200; 
    const newEmiBurden = ((existingEmi + proposedEmi) / Math.max(1, monthlyIncome)) * 100;
    const isFeasible = newEmiBurden < 45 && freeCashFlow > proposedEmi && bounces.length === 0 && risk.score >= 60;
    
    return `### Underwriting Assessment: Repayment Capacity (₹10 Lakh Loan Estimate)
We evaluate the feasibility of servicing a new **₹10 Lakh Loan** (estimated monthly EMI of **${fmt(proposedEmi)}** for 36 months at 12%):

1. **Serviceability Analysis**:
   - **Average Monthly Credit Flow**: ${fmt(monthlyIncome)}
   - **Existing Debt EMIs**: ${fmt(existingEmi)} / month
   - **Combined EMI Debt Burden (Existing + Proposed)**: \`${newEmiBurden.toFixed(1)}%\`
   - **Net Monthly Free Cash Flow**: ${fmt(freeCashFlow)}

2. **Risk Indicators**:
   - **Risk Level**: **${risk.risk_level || "Unknown"}** (Score: \`${risk.score || 0}/100\`)
   - **Cheque Bounces**: \`${bounces.length}\` events
   - **Balance Risk Flags**: \`${balanceRisks.length}\` flags

3. **Underwriting Decision**:
   ${isFeasible 
     ? `✅ **Approved (Moderate-to-Low Credit Risk)**: The customer has sufficient banking activity and net cash reserves to service this loan. Combined debt burden remains under the 45% threshold.` 
     : `❌ **Rejected (High Credit Risk)**: Loan servicing is not recommended. Factors: ${newEmiBurden >= 45 ? "Debt service ratio exceeds 45% standard." : ""} ${freeCashFlow < proposedEmi ? "Net cash retention is insufficient." : ""} ${bounces.length > 0 ? "Active payment returns/bounces detected." : ""} ${risk.score < 60 ? "Underwriting health score is too low." : ""}`}
     
---
*Disclaimer: This is a heuristic underwriting estimate. Please verify with official credit bureau reports.*`;
  }

  // Default Fallback
  return `### Hello! I am FinScope Financial Assistant.
I have parsed **${overview.accountHolder || "the bank statements"}** from **${overview.bankName || "the bank"}**.
I can answer specific questions such as:
- *What is the average monthly income and major sources?*
- *Are there any existing EMIs or loans?*
- *How many cheque bounces or payment returns occurred?*
- *What are the risk factors and final underwriting score?*
- *Can this customer repay a ₹10 lakh loan?*

Please enter one of the queries above, or input a Google Gemini / Groq API key in **Settings** (gear icon) to start an unrestricted conversation.`;
}
