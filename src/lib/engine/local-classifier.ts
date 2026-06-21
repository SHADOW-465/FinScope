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

// ─── Web Worker Lifecycle Management ───────────────────────────────────────

let activeWorker: Worker | null = null;

/**
 * Terminates the background Web Worker thread immediately if it is active.
 * Reclaims browser memory and stops CPU usage.
 */
export function terminateClassifier() {
  if (activeWorker) {
    activeWorker.terminate();
    activeWorker = null;
  }
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
 * Runs the ONNX model inside a background Web Worker on ambiguous transactions
 * and returns an updated copy of the full transaction array.
 *
 * This function keeps the main UI thread 100% responsive and lag-free.
 *
 * @param transactions  Full classified transaction list from the API
 * @param onProgress    Callback fired after each inference step
 * @returns             Updated transaction list (new array, original untouched)
 */
export async function enhanceClassifications(
  transactions: ClassifiedTransaction[],
  onProgress: (p: LocalClassifierProgress) => void
): Promise<ClassifiedTransaction[]> {
  // Terminate any previous active worker to prevent concurrent run collisions
  terminateClassifier();

  const needsAny = transactions.some(needsEnhancement);
  if (!needsAny) {
    onProgress({ status: "done", processed: 0, total: 0, enhanced: 0 });
    return transactions;
  }

  return new Promise((resolve) => {
    // Instantiate the background worker
    const worker = new Worker(new URL("./classifier.worker.ts", import.meta.url));
    activeWorker = worker;

    worker.onmessage = (e: MessageEvent) => {
      const { status, processed, total, enhanced, error, result } = e.data;

      if (status === "error") {
        onProgress({ status, processed, total, enhanced, error });
        resolve(transactions); // graceful fallback to original transaction array
        terminateClassifier();
      } else if (status === "done") {
        onProgress({ status, processed, total, enhanced });
        resolve(result || transactions);
        terminateClassifier();
      } else {
        onProgress({ status, processed, total, enhanced });
      }
    };

    worker.onerror = (err) => {
      console.warn("[FinScope] Classifier Web Worker failed to run:", err);
      onProgress({
        status: "error",
        processed: 0,
        total: 0,
        enhanced: 0,
        error: "Worker thread crashed or failed to compile.",
      });
      resolve(transactions);
      terminateClassifier();
    };

    // Trigger processing
    worker.postMessage({ action: "enhance", transactions });
  });
}
