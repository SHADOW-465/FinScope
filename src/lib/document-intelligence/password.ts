import { DecryptionResult } from "./types";

/**
 * Validates the password for an encrypted PDF document and returns the decryption status.
 * All operations are completed in-memory; decrypted copies are never written to disk.
 * The password is never logged.
 * 
 * @param buffer - The raw PDF document buffer
 * @param password - The password to validate (if any)
 */
export async function validatePassword(
  buffer: Buffer,
  password?: string
): Promise<DecryptionResult> {
  const pdfParser = require("pdf-parse/lib/pdf-parse.js");

  try {
    if (password) {
      // Attempt load using the password
      await pdfParser({ data: buffer, password } as any);
    } else {
      // Attempt load without password to see if it is encrypted
      await pdfParser(buffer);
    }

    // Success - PDF parsed without throwing password exceptions
    return {
      success: true,
      decryptedBuffer: buffer
    };
  } catch (err: any) {
    const isPasswordException = err.name === "PasswordException" || 
                                err.message?.toLowerCase().includes("password") ||
                                err.message?.toLowerCase().includes("decrypt");
    
    if (isPasswordException) {
      if (password) {
        return {
          success: false,
          error: "Incorrect password. Please verify and try again."
        };
      } else {
        return {
          success: false,
          error: "Password required. This document is encrypted."
        };
      }
    }

    return {
      success: false,
      error: `Failed to open PDF document: ${err.message || err}`
    };
  }
}
