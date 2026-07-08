import { ParserErrorCategory } from "./types";

/**
 * Standardized Credalyzer Parser Exception model.
 */
export class ParserError extends Error {
  constructor(
    message: string,
    public category: ParserErrorCategory,
    public originalError?: any
  ) {
    super(message);
    this.name = "ParserError";
  }
}

/**
 * Classifies runtime exceptions into actionable validation groups.
 * Ensures the platform never crashes on bad inputs.
 */
export function categorizeError(error: any): ParserErrorCategory {
  if (error instanceof ParserError) {
    return error.category;
  }

  const msg = String(error?.message || "").toUpperCase();

  if (msg.includes("PASSWORD") || msg.includes("ENCRYPT") || msg.includes("DECRYPT")) {
    return "manual_review";
  }
  if (msg.includes("CORRUPT") || msg.includes("INVALID PDF") || msg.includes("BAD HEADER")) {
    return "fatal";
  }
  if (msg.includes("TIMEOUT") || msg.includes("NETWORK") || msg.includes("RATE LIMIT")) {
    return "retryable";
  }

  return "recoverable";
}
