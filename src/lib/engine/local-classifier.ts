/**
 * local-classifier.ts
 *
 * Client-side ONNX Transaction Classifier powered by 🤗 Transformers.js.
 *
 * Model  : Xenova/distilbert-base-uncased-mnli  (int8 quantised, ~68 MB)
 * Runtime: ONNX Runtime Web (WebAssembly, no SharedArrayBuffer required)
 *
 * Design goals
 * ────────────
 * • Non-blocking — the keyword classifier in classifier.ts always runs first.
 *   This module only reclassifies transactions that are "Miscellaneous" or
 *   have a confidence score below 0.75 (edge-case threshold).
 *
 * • Privacy-preserving — the model runs entirely in the user's browser.
 *   No transaction data leaves the device during this step.
 *
 * • Progressive — results stream back via an `onProgress` callback so the
 *   UI can update incrementally rather than waiting for the full batch.
 *
 * • Singleton pipeline — the pipeline is initialised once and reused across
 *   all subsequent calls (model weights are also cached by the browser).
 */

import type { ClassifiedTransaction } from "./classifier";

// ─── Label Sets ────────────────────────────────────────────────────────────
// Descriptive natural-language labels work better than terse category names
// for zero-shot classification because the NLI model compares them against
// the transaction description as an entailment hypothesis.

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

// Maps the winning label back to our internal category strings
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

// ─── Progress Reporting ────────────────────────────────────────────────────

export type LocalClassifierStatus = "idle" | "loading" | "running" | "done" | "error";

export interface LocalClassifierProgress {
  status: LocalClassifierStatus;
  processed: number;
  total: number;
  enhanced: number;
  error?: string;
}

// ─── Singleton Pipeline ────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _pipeline: any = null;

async function getClassifier() {
  if (_pipeline) return _pipeline;

  // Dynamic import keeps this entirely out of the SSR bundle
  const { pipeline, env } = await import("@huggingface/transformers");

  // Always pull from the HuggingFace CDN; rely on browser cache for repeat visits
  env.allowLocalModels = false;
  env.useBrowserCache = true;

  _pipeline = await pipeline(
    "zero-shot-classification",
    "Xenova/distilbert-base-uncased-mnli",
    { dtype: "q8" }
  );

  return _pipeline;
}

// ─── Selection Heuristic ───────────────────────────────────────────────────

/**
 * Returns true when a transaction's classification should be re-evaluated
 * by the local ONNX model.
 */
export function needsEnhancement(txn: ClassifiedTransaction): boolean {
  return txn.category === "Miscellaneous" || txn.confidenceScore < 0.75;
}

// ─── Main Export ───────────────────────────────────────────────────────────

/**
 * Runs the ONNX model on ambiguous transactions and returns an updated copy
 * of the full transaction array.
 *
 * Only transactions where `needsEnhancement` returns true are touched.
 * The model result is accepted only when its top-label score exceeds 0.60.
 *
 * @param transactions  Full classified transaction list from the API
 * @param onProgress    Callback fired after each inference step
 * @returns             Updated transaction list (new array, original untouched)
 */
export async function enhanceClassifications(
  transactions: ClassifiedTransaction[],
  onProgress: (p: LocalClassifierProgress) => void
): Promise<ClassifiedTransaction[]> {
  // Collect indices that need re-evaluation
  const targets: Array<{ txn: ClassifiedTransaction; idx: number }> = [];
  transactions.forEach((txn, idx) => {
    if (needsEnhancement(txn)) targets.push({ txn, idx });
  });

  if (targets.length === 0) {
    onProgress({ status: "done", processed: 0, total: 0, enhanced: 0 });
    return transactions;
  }

  // ── Step 1: Load model ──
  onProgress({ status: "loading", processed: 0, total: targets.length, enhanced: 0 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let classifier: any;
  try {
    classifier = await getClassifier();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    onProgress({
      status: "error",
      processed: 0,
      total: targets.length,
      enhanced: 0,
      error: `Model failed to load: ${message}`,
    });
    return transactions; // graceful fallback – original classifications kept
  }

  // ── Step 2: Inference loop ──
  onProgress({ status: "running", processed: 0, total: targets.length, enhanced: 0 });

  const result = [...transactions];
  let enhanced = 0;

  for (let i = 0; i < targets.length; i++) {
    const { txn, idx } = targets[i];
    const labels = txn.transactionType === "CREDIT" ? CREDIT_LABELS : DEBIT_LABELS;

    try {
      const output = await classifier!(txn.description, labels, { multi_label: false });
      const topLabel: string = output.labels[0];
      const topScore: number = output.scores[0];
      const newCategory = LABEL_TO_CATEGORY[topLabel];

      // Accept the model's answer only when it is confident enough
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
      // Per-item failure is non-fatal; keep the original classification
    }

    onProgress({
      status: i === targets.length - 1 ? "done" : "running",
      processed: i + 1,
      total: targets.length,
      enhanced,
    });
  }

  return result;
}
