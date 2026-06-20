import { ClassifiedTransaction } from "./classifier";

export interface RiskProfile {
  overview: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    statementPeriod: string;
    openingBalance: number;
    closingBalance: number;
    totalCredits: number;
    totalDebits: number;
    averageBalance: number;
    durationMonths: number;
  };
  metrics: {
    avg_monthly_banking: number;
    net_cash_flow: number;
    income_stability: number;
    expense_ratio: number;
    emi_burden: number;
    debt_ratio: number;
    cash_retention: number;
  };
  risk_score: {
    score: number;
    risk_level: "Low Risk" | "Moderate Risk" | "High Risk" | "Critical Risk";
    breakdown: Record<string, number>;
  };
  monthly_analysis: Array<{
    month: string;
    credits: number;
    debits: number;
    net_flow: number;
  }>;
  income_analysis: Array<{
    source: string;
    amount: number;
    category: string;
    frequency: string;
    confidence: number;
  }>;
  liability_analysis: Array<{
    lender: string;
    emi_amount: number;
    frequency: string;
    confidence: number;
  }>;
  bounce_analysis: Array<{
    date: string;
    description: string;
    amount: number;
    charge: number;
  }>;
  balance_risks: Array<{
    date: string;
    balance: number;
    description: string;
    risk_type: string;
  }>;
}

export function computeRiskProfile(
  txns: ClassifiedTransaction[],
  openingBal: number,
  closingBal: number,
  accNum: string,
  accHolder: string,
  bankName: string,
  stmtPeriod: string
): RiskProfile {
  // 1. Calculate general stats
  let totalCredits = 0;
  let totalDebits = 0;
  let sumBalances = 0;
  
  const uniqueMonths = new Set<string>();
  const monthlyData: Record<string, { credits: number; debits: number; balances: number[]; count: number }> = {};
  
  txns.forEach(txn => {
    if (txn.transactionType === "CREDIT") {
      totalCredits += txn.credit;
    } else {
      totalDebits += txn.debit;
    }
    sumBalances += txn.balance;
    
    // Parse month (e.g., "2025-11-19" -> "Nov 2025")
    const dateObj = new Date(txn.date);
    if (!isNaN(dateObj.getTime())) {
      const monthStr = dateObj.toLocaleString("en-US", { month: "short", year: "numeric" });
      uniqueMonths.add(monthStr);
      
      if (!monthlyData[monthStr]) {
        monthlyData[monthStr] = { credits: 0, debits: 0, balances: [], count: 0 };
      }
      if (txn.transactionType === "CREDIT") {
        monthlyData[monthStr].credits += txn.credit;
      } else {
        monthlyData[monthStr].debits += txn.debit;
      }
      monthlyData[monthStr].balances.push(txn.balance);
      monthlyData[monthStr].count++;
    }
  });

  const durationMonths = Math.max(1, uniqueMonths.size);
  const averageBalance = txns.length > 0 ? sumBalances / txns.length : openingBal;
  
  // 2. Monthly analysis rollup
  const monthly_analysis = Object.entries(monthlyData).map(([month, data]) => {
    return {
      month,
      credits: Math.round(data.credits * 100) / 100,
      debits: Math.round(data.debits * 100) / 100,
      net_flow: Math.round((data.credits - data.debits) * 100) / 100
    };
  });

  // Sort monthly analysis chronologically
  monthly_analysis.sort((a, b) => {
    const dateA = new Date(a.month);
    const dateB = new Date(b.month);
    return dateA.getTime() - dateB.getTime();
  });

  // 3. Income sources analysis
  const incomeMap: Record<string, { total: number; category: string; count: number; conf: number }> = {};
  txns.forEach(txn => {
    if (txn.transactionType === "CREDIT" && ["Salary", "Business Revenue", "Personal Transfer"].includes(txn.category)) {
      const key = `${txn.counterparty} (${txn.category})`;
      if (!incomeMap[key]) {
        incomeMap[key] = { total: 0, category: txn.category, count: 0, conf: txn.confidenceScore };
      }
      incomeMap[key].total += txn.credit;
      incomeMap[key].count++;
      incomeMap[key].conf = Math.max(incomeMap[key].conf, txn.confidenceScore);
    }
  });
  
  const income_analysis = Object.entries(incomeMap).map(([source, data]) => ({
    source,
    amount: Math.round(data.total * 100) / 100,
    category: data.category,
    frequency: data.count >= durationMonths ? "Monthly" : "Ad-hoc",
    confidence: data.conf
  }));

  // 4. Liability analysis (active EMIs / loans)
  const liabilityMap: Record<string, { total: number; count: number; conf: number }> = {};
  txns.forEach(txn => {
    if (txn.transactionType === "DEBIT" && txn.category === "EMI Payment") {
      const lender = txn.counterparty;
      if (!liabilityMap[lender]) {
        liabilityMap[lender] = { total: 0, count: 0, conf: txn.confidenceScore };
      }
      liabilityMap[lender].total += txn.debit;
      liabilityMap[lender].count++;
      liabilityMap[lender].conf = Math.max(liabilityMap[lender].conf, txn.confidenceScore);
    }
  });

  const liability_analysis = Object.entries(liabilityMap).map(([lender, data]) => ({
    lender,
    // Average monthly EMI amount paid to this lender
    emi_amount: Math.round((data.total / Math.max(1, data.count)) * 100) / 100,
    frequency: "Monthly",
    confidence: data.conf
  }));

  // 5. Bounce Analysis
  const bounce_analysis: RiskProfile["bounce_analysis"] = [];
  txns.forEach(txn => {
    const descLower = txn.description.toLowerCase();
    const isBounce = descLower.includes("bounce") || 
                     descLower.includes("nsf") || 
                     descLower.includes("return") && descLower.includes("chg") ||
                     descLower.includes("dishonour") || 
                     descLower.includes("ecs rt");
                     
    if (txn.transactionType === "DEBIT" && isBounce) {
      bounce_analysis.push({
        date: txn.date,
        description: txn.description,
        amount: txn.debit,
        charge: txn.debit // Heuristic charge value
      });
    }
  });

  // 6. Balance Risk (Negative and Low Balance Events)
  const balance_risks: RiskProfile["balance_risks"] = [];
  const lowBalanceThreshold = 2000.0;
  txns.forEach(txn => {
    if (txn.balance < 0) {
      balance_risks.push({
        date: txn.date,
        balance: txn.balance,
        description: txn.description,
        risk_type: "Negative Balance"
      });
    } else if (txn.balance < lowBalanceThreshold) {
      balance_risks.push({
        date: txn.date,
        balance: txn.balance,
        description: txn.description,
        risk_type: "Low Balance"
      });
    }
  });

  // 7. Calculate Financial metrics
  const avg_monthly_banking = durationMonths > 0 ? averageBalance : openingBal;
  const net_cash_flow = totalCredits - totalDebits;
  
  // Income stability: frequency and distribution of credits
  let income_stability = 100;
  if (monthly_analysis.length > 0) {
    const activeMonths = monthly_analysis.filter(m => m.credits > 0).length;
    const activeRatio = activeMonths / monthly_analysis.length;
    income_stability = activeRatio * 100;
  }
  
  const expense_ratio = totalCredits > 0 ? Math.min(100, (totalDebits / totalCredits) * 100) : 100;
  
  const totalMonthlyIncome = totalCredits / durationMonths;
  const totalMonthlyEMIs = liability_analysis.reduce((sum, l) => sum + l.emi_amount, 0);
  const emi_burden = totalMonthlyIncome > 0 ? Math.min(100, (totalMonthlyEMIs / totalMonthlyIncome) * 100) : (totalMonthlyEMIs > 0 ? 100 : 0);
  
  const debt_ratio = averageBalance > 0 ? Math.min(100, (totalMonthlyEMIs / averageBalance) * 100) : (totalMonthlyEMIs > 0 ? 100 : 0);
  
  const cash_retention = totalCredits > 0 ? Math.max(0, Math.min(100, (net_cash_flow / totalCredits) * 100)) : 0;

  // 8. Compute Underwriting Risk Score (0-100)
  // Income Stability: 20%
  // Average Balance: 15%
  // Cheque Bounces: 20%
  // Debt Burden: 20%
  // Cash Flow Consistency: 15%
  // Negative Balances: 10%
  
  // a. Income Stability score
  const incomeStabilityScore = income_stability; // 0 to 100
  
  // b. Average Balance score (100 if average balance is >= 30,000 INR, scaling down)
  const averageBalanceScore = Math.min(100, Math.max(0, (averageBalance / 30000) * 100));
  
  // c. Cheque Bounces score
  let chequeBouncesScore = 100;
  if (bounce_analysis.length === 1) chequeBouncesScore = 70;
  else if (bounce_analysis.length === 2) chequeBouncesScore = 40;
  else if (bounce_analysis.length >= 3) chequeBouncesScore = 0;
  
  // d. Debt Burden score (Inverse of EMI Burden: 100 if EMI burden is 0%, 0 if EMI burden >= 60%)
  const debtBurdenScore = Math.max(0, 100 - (emi_burden / 60) * 100);
  
  // e. Cash Flow Consistency score (Percentage of months with net positive flow)
  const positiveMonthsCount = monthly_analysis.filter(m => m.net_flow > 0).length;
  const cashFlowConsistencyScore = monthly_analysis.length > 0 ? (positiveMonthsCount / monthly_analysis.length) * 100 : 100;
  
  // f. Negative Balances score
  const negativeBalanceEvents = balance_risks.filter(r => r.risk_type === "Negative Balance").length;
  let negativeBalancesScore = 100;
  if (negativeBalanceEvents === 1) negativeBalancesScore = 70;
  else if (negativeBalanceEvents === 2) negativeBalancesScore = 40;
  else if (negativeBalanceEvents >= 3) negativeBalancesScore = 0;

  // Weighted Risk Score
  const score = Math.round(
    (incomeStabilityScore * 0.20) +
    (averageBalanceScore * 0.15) +
    (chequeBouncesScore * 0.20) +
    (debtBurdenScore * 0.20) +
    (cashFlowConsistencyScore * 0.15) +
    (negativeBalancesScore * 0.10)
  );

  let risk_level: RiskProfile["risk_score"]["risk_level"] = "Low Risk";
  if (score < 40) risk_level = "Critical Risk";
  else if (score < 60) risk_level = "High Risk";
  else if (score < 80) risk_level = "Moderate Risk";

  const breakdown = {
    "Income Stability": Math.round(incomeStabilityScore * 100) / 100,
    "Average Balance": Math.round(averageBalanceScore * 100) / 100,
    "Cheque Bounces": chequeBouncesScore,
    "Debt Burden (EMIs)": Math.round(debtBurdenScore * 100) / 100,
    "Cash Flow Consistency": Math.round(cashFlowConsistencyScore * 100) / 100,
    "Negative Balance Avoidance": negativeBalancesScore
  };

  return {
    overview: {
      bankName,
      accountNumber: accNum,
      accountHolder: accHolder,
      statementPeriod: stmtPeriod,
      openingBalance: Math.round(openingBal * 100) / 100,
      closingBalance: Math.round(closingBal * 100) / 100,
      totalCredits: Math.round(totalCredits * 100) / 100,
      totalDebits: Math.round(totalDebits * 100) / 100,
      averageBalance: Math.round(averageBalance * 100) / 100,
      durationMonths
    },
    metrics: {
      avg_monthly_banking: Math.round(avg_monthly_banking * 100) / 100,
      net_cash_flow: Math.round(net_cash_flow * 100) / 100,
      income_stability: Math.round(income_stability * 100) / 100,
      expense_ratio: Math.round(expense_ratio * 100) / 100,
      emi_burden: Math.round(emi_burden * 100) / 100,
      debt_ratio: Math.round(debt_ratio * 100) / 100,
      cash_retention: Math.round(cash_retention * 100) / 100
    },
    risk_score: {
      score,
      risk_level,
      breakdown
    },
    monthly_analysis,
    income_analysis,
    liability_analysis,
    bounce_analysis,
    balance_risks
  };
}
