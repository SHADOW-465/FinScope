import { DocumentMetadata, PDFType, ProcessingStrategy, PageMetadata } from "./types";
import { detectBank } from "../parser/detector";

/**
 * Process a PDF document buffer for classification and metadata intake.
 * This runs checks for encryption, size, corruption, and identifies if the pages are text-based or image-based.
 * 
 * @param buffer - The raw PDF file buffer
 * @param fileName - The original file name
 * @param password - Optional decryption password
 */
export async function processIntake(
  buffer: Buffer,
  fileName: string,
  password?: string
): Promise<DocumentMetadata> {
  const crypto = require("crypto");
  const id = crypto.createHash("sha256").update(buffer).digest("hex");
  const fileSize = buffer.length;

  const pageDetails: PageMetadata[] = [];
  let accumulatedText = "";

  const customPageRender = (pageData: any): Promise<string> => {
    return pageData.getTextContent({
      normalizeWhitespace: true,
      disableCombineTextItems: false
    }).then(function(textContent: any) {
      const textItems = textContent.items || [];
      let text = "";
      for (const item of textItems) {
        if (item.str) {
          text += item.str + " ";
        }
      }
      
      const textLength = text.trim().length;
      const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
      const isTextBased = textLength > 20;
      
      pageDetails.push({
        pageNumber: pageData.pageIndex + 1,
        textLength,
        wordCount,
        isTextBased
      });
      
      accumulatedText += text + "\n";
      return text;
    });
  };

  let pdfData;
  let encrypted = false;
  let pdf_type: PDFType = "unknown";
  let pages = 0;

  const pdfParser = require("pdf-parse/lib/pdf-parse.js");

  try {
    if (password) {
      pdfData = await pdfParser({ data: buffer, password } as any, { pagerender: customPageRender });
    } else {
      pdfData = await pdfParser(buffer, { pagerender: customPageRender });
    }
    pages = pdfData.numpages || pageDetails.length;
  } catch (err: any) {
    const isPasswordRequired = err.name === "PasswordException" || 
                               err.message?.toLowerCase().includes("password") ||
                               err.message?.toLowerCase().includes("decrypt");
    if (isPasswordRequired) {
      encrypted = true;
      return {
        id,
        fileName,
        fileSize,
        pages: 0,
        encrypted: true,
        pdf_type: "unknown",
        language: "unknown",
        estimated_quality: 0.5,
        bank_unknown: true,
        processing_strategy: "unsupported"
      };
    } else {
      return {
        id,
        fileName,
        fileSize,
        pages: 0,
        encrypted: false,
        pdf_type: "corrupt",
        language: "unknown",
        estimated_quality: 0.0,
        bank_unknown: true,
        processing_strategy: "unsupported"
      };
    }
  }

  // Classify PDF type based on pages
  const textPages = pageDetails.filter(p => p.isTextBased).length;
  const imagePages = pageDetails.length - textPages;

  if (pageDetails.length === 0) {
    pdf_type = "unknown";
  } else if (textPages === pageDetails.length) {
    pdf_type = "digital";
  } else if (imagePages === pageDetails.length) {
    pdf_type = "scanned";
  } else {
    pdf_type = "hybrid";
  }

  // Detect bank
  const bankName = detectBank(accumulatedText);
  const bank_unknown = bankName === "Generic";

  // Check language (heuristic based on common English financial keywords)
  const englishKeywords = ["date", "description", "balance", "transaction", "statement", "amount"];
  const lowerText = accumulatedText.toLowerCase();
  const keywordMatches = englishKeywords.filter(k => lowerText.includes(k)).length;
  const language = keywordMatches >= 3 ? "en" : "unknown";

  // Estimate quality
  let estimated_quality = 1.0;
  if (pdf_type === "scanned") {
    estimated_quality = 0.6; // OCR baseline
  } else if (pdf_type === "hybrid") {
    estimated_quality = 0.8;
  }

  // Processing strategy
  let processing_strategy: ProcessingStrategy = "native";
  if (pdf_type === "scanned") {
    processing_strategy = "ocr";
  } else if (pdf_type === "hybrid") {
    processing_strategy = "hybrid_fallback";
  }

  return {
    id,
    fileName,
    fileSize,
    pages,
    encrypted,
    pdf_type,
    language,
    estimated_quality,
    bank_unknown,
    processing_strategy,
    pageDetails: pageDetails.sort((a, b) => a.pageNumber - b.pageNumber)
  };
}
