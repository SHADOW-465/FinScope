"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, FileText, X, Lock, Unlock, Loader2 } from "lucide-react";

interface UploadZoneProps {
  onProcessStart: () => void;
  onProcessComplete: (data: any) => void;
  onProcessError: () => void;
  /** When set, the analysis is persisted against this applicant case. */
  caseId?: string;
  /** Show loan-ask inputs (used on the case-less "/" flow to enable FOIR/policy). */
  showLoanAsk?: boolean;
}

const PRODUCT_OPTIONS: Array<[string, string]> = [
  ["personal", "Personal Loan"],
  ["vehicle", "Vehicle Finance"],
  ["gold", "Gold Loan"],
  ["msme", "MSME / Business Loan"],
  ["lap", "Loan Against Property"],
  ["working_capital", "Working Capital"],
];

export default function UploadZone({ onProcessStart, onProcessComplete, onProcessError, caseId, showLoanAsk }: UploadZoneProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [productType, setProductType] = useState("personal");
  const [requestedAmount, setRequestedAmount] = useState("");
  const [tenureMonths, setTenureMonths] = useState("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPasswordIssue = error ? (error.toLowerCase().includes("password") || error.toLowerCase().includes("decrypt")) : false;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFiles = Array.from(e.dataTransfer.files).filter(
        (file) => file.type === "application/pdf"
      );
      if (droppedFiles.length === 0) {
        setError("Only PDF bank statements are supported");
        return;
      }
      setFiles((prev) => [...prev, ...droppedFiles]);
      setError(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFiles = Array.from(e.target.files).filter(
        (file) => file.type === "application/pdf"
      );
      setFiles((prev) => [...prev, ...selectedFiles]);
      setError(null);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    onProcessStart(); // lock parent UI and display global spinner
    setIsProcessing(true);
    setError(null);

    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });
    if (password.trim()) {
      formData.append("password", password);
    }
    if (caseId) {
      formData.append("caseId", caseId);
    }
    if (showLoanAsk && Number(requestedAmount) > 0 && Number(tenureMonths) > 0) {
      formData.append("productType", productType);
      formData.append("requestedAmount", requestedAmount);
      formData.append("tenureMonths", tenureMonths);
    }

    try {
      const response = await fetch("/api/process", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        const errorObj = new Error(data.error || "Failed to process bank statements.");
        (errorObj as any).code = data.code;
        throw errorObj;
      }

      onProcessComplete(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during processing.");
      
      if (err.code === "PASSWORD_REQUIRED" || err.message?.toLowerCase().includes("password")) {
        setShowPassword(true);
      }
      
      onProcessError(); // revert parent block state
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Upload Panel */}
      <div
        className={`glass-panel rounded-2xl p-8 flex flex-col items-center justify-center border-dashed border-2 transition-all relative ${
          dragActive
            ? "border-indigo-500 bg-indigo-950/20 scale-[1.01]"
            : "border-slate-700/60"
        } ${isProcessing ? "pointer-events-none opacity-50" : ""}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="p-4 bg-indigo-500/10 rounded-full mb-4">
          <UploadCloud className="w-12 h-12 text-indigo-400" />
        </div>

        <h3 className="text-xl font-semibold mb-2">Upload your bank statements</h3>
        <p className="text-slate-400 text-sm text-center max-w-md mb-6">
          Drag & drop multiple PDF statement files here, or click to browse.
          Supports SBI, HDFC, ICICI, Axis, Bank of Baroda, Canara, and IndusInd.
        </p>

        <button
          type="button"
          onClick={triggerFileInput}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-all shadow-lg hover:shadow-indigo-500/20 flex items-center gap-2 cursor-pointer"
        >
          Select PDF Files
        </button>

        {dragActive && (
          <div className="absolute inset-0 w-full h-full rounded-2xl flex items-center justify-center bg-indigo-950/40 backdrop-blur-sm pointer-events-none">
            <span className="text-indigo-400 font-semibold text-lg">
              Drop your files here
            </span>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-red-950/30 border border-red-500/30 text-red-400 rounded-xl text-sm text-center">
          {error}
        </div>
      )}

      {/* Files List & Options */}
      {files.length > 0 && (
        <div className="mt-6 glass-panel rounded-2xl p-6 transition-all animate-in fade-in slide-in-from-bottom-3 duration-300">
          <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            Selected Statements ({files.length})
          </h4>

          <div className="space-y-2 mb-6 max-h-48 overflow-y-auto pr-2">
            {files.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-800 rounded-lg">
                    <FileText className="w-5 h-5 text-indigo-300" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-200 truncate max-w-md">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                  disabled={isProcessing}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Loan Ask (optional, enables FOIR + policy verdict) */}
          {showLoanAsk && (
            <div className="border-t border-slate-800/80 pt-5 pb-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Loan Product</label>
                <select
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  disabled={isProcessing}
                >
                  {PRODUCT_OPTIONS.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Requested Amount (₹)</label>
                <input
                  type="number"
                  min={1}
                  placeholder="e.g. 500000"
                  value={requestedAmount}
                  onChange={(e) => setRequestedAmount(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  disabled={isProcessing}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Tenure (months)</label>
                <input
                  type="number"
                  min={1}
                  placeholder="e.g. 36"
                  value={tenureMonths}
                  onChange={(e) => setTenureMonths(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  disabled={isProcessing}
                />
              </div>
              <p className="sm:col-span-3 text-[10px] text-slate-500 -mt-1">
                Optional — fill these to compute post-loan FOIR and the lender-policy verdict.
              </p>
            </div>
          )}

          {/* Password Prompt */}
          <div className="border-t border-slate-800/80 pt-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`p-2 rounded-xl border flex items-center justify-center cursor-pointer transition-colors ${
                  showPassword || isPasswordIssue
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-400"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                {showPassword || isPasswordIssue ? (
                  <Lock className="w-4 h-4 animate-pulse" />
                ) : (
                  <Unlock className="w-4 h-4" />
                )}
              </button>
              <div>
                <p className="text-xs font-semibold text-slate-300">
                  Password Protected?
                </p>
                <p className="text-[10px] text-slate-400">
                  {isPasswordIssue ? (
                    <span className="text-amber-400 font-medium">Please enter the correct password to decrypt files.</span>
                  ) : (
                    "Check if any statement requires a decryption pin."
                  )}
                </p>
              </div>
            </div>

            {(showPassword || isPasswordIssue) && (
              <div className="flex-1 max-w-xs transition-all duration-300 animate-in fade-in slide-in-from-left-2">
                <input
                  type="password"
                  placeholder="Enter statement password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  className={`w-full px-3 py-2 bg-slate-900 border rounded-xl text-sm focus:outline-none transition-colors ${
                    isPasswordIssue
                      ? "border-amber-500/60 focus:border-amber-500"
                      : "border-slate-800 focus:border-indigo-500"
                  }`}
                  disabled={isProcessing}
                />
              </div>
            )}

            <button
              type="button"
              onClick={handleProcess}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-indigo-500/10 disabled:opacity-50"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  Analyzing Statements...
                </>
              ) : (
                "Run Underwriting Engine"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
