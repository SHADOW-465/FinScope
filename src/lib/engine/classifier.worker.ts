import { pipeline, env } from "@huggingface/transformers";

// Configure transformers to pull from HuggingFace CDN and use browser cache
env.allowLocalModels = false;
env.useBrowserCache = true;

let _pipeline: any = null;

async function getClassifier() {
  if (_pipeline) return _pipeline;
  _pipeline = await pipeline(
    "zero-shot-classification",
    "Xenova/distilbert-base-uncased-mnli",
    { dtype: "q8" }
  );
  return _pipeline;
}

const CREDIT_LABELS = [
  "salary or payroll deposit",
  "loan disbursement or credit line received",
  "cash deposited at branch",
  "UPI payment received",
  "business revenue or collection",
  "interest or dividend income",
  "personal transfer received",
];

const DEBIT_LABELS = [
  "EMI or loan repayment",
  "rent or lease payment",
  "utility or phone bill payment",
  "insurance premium payment",
  "mutual fund or investment purchase",
  "ATM cash withdrawal",
  "UPI payment sent",
  "vendor or supplier payment",
];

const LABEL_TO_CATEGORY: Record<string, string> = {
  "salary or payroll deposit": "Salary",
  "loan disbursement or credit line received": "Loan Credit",
  "cash deposited at branch": "Cash Deposit",
  "UPI payment received": "UPI Transfer",
  "business revenue or collection": "Business Revenue",
  "interest or dividend income": "Investment",
  "personal transfer received": "Personal Transfer",

  "EMI or loan repayment": "EMI Payment",
  "rent or lease payment": "Rent",
  "utility or phone bill payment": "Utility",
  "insurance premium payment": "Insurance",
  "mutual fund or investment purchase": "Investment",
  "ATM cash withdrawal": "ATM Withdrawal",
  "UPI payment sent": "UPI Transfer",
  "vendor or supplier payment": "Vendor Payment",
};

self.onmessage = async (e: MessageEvent) => {
  const { action, transactions } = e.data;

  if (action === "enhance") {
    try {
      const targets: Array<{ txn: any; idx: number }> = [];
      transactions.forEach((txn: any, idx: number) => {
        const needsEnhancement = txn.category === "Miscellaneous" || txn.confidenceScore < 0.75;
        if (needsEnhancement) targets.push({ txn, idx });
      });

      if (targets.length === 0) {
        self.postMessage({ status: "done", processed: 0, total: 0, enhanced: 0, result: transactions });
        return;
      }

      // Step 1: Load model
      self.postMessage({ status: "loading", processed: 0, total: targets.length, enhanced: 0 });
      let classifier;
      try {
        classifier = await getClassifier();
      } catch (err: any) {
        self.postMessage({
          status: "error",
          processed: 0,
          total: targets.length,
          enhanced: 0,
          error: `Model failed to load: ${err.message || String(err)}`,
        });
        return;
      }

      // Step 2: Inference loop
      self.postMessage({ status: "running", processed: 0, total: targets.length, enhanced: 0 });
      const result = [...transactions];
      let enhanced = 0;

      for (let i = 0; i < targets.length; i++) {
        const { txn, idx } = targets[i];
        const labels = txn.transactionType === "CREDIT" ? CREDIT_LABELS : DEBIT_LABELS;

        try {
          const output = await classifier(txn.description, labels, { multi_label: false });
          const topLabel: string = output.labels[0];
          const topScore: number = output.scores[0];
          const newCategory = LABEL_TO_CATEGORY[topLabel];

          if (newCategory && topScore > 0.60) {
            result[idx] = {
              ...txn,
              category: newCategory,
              confidenceScore: Math.round(topScore * 100) / 100,
              aiEnhanced: true,
            };
            enhanced++;
          }
        } catch {
          // ignore item error
        }

        self.postMessage({
          status: i === targets.length - 1 ? "done" : "running",
          processed: i + 1,
          total: targets.length,
          enhanced,
          result: i === targets.length - 1 ? result : undefined,
        });
      }
    } catch (err: any) {
      self.postMessage({
        status: "error",
        processed: 0,
        total: 0,
        enhanced: 0,
        error: err.message || String(err),
      });
    }
  }
};
