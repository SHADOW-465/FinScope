import { DocumentMetadata, DocumentProfile, PDFType, ProcessingStrategy } from "./types";

/**
 * Classifies a document's intake metadata into a detailed profile with confidence metrics and processing strategy.
 * 
 * @param metadata - The DocumentMetadata object produced by the Intake Engine
 */
export function classifyDocument(metadata: DocumentMetadata): DocumentProfile {
  const { id, pdf_type, encrypted, pageDetails = [], processing_strategy } = metadata;
  const reasons: string[] = [];
  let confidence = 0.5;
  let recommendedStrategy: ProcessingStrategy = "unsupported";

  if (encrypted) {
    return {
      id,
      pdf_type: "unknown",
      confidence: 1.0,
      reasons: ["Document is password protected and encrypted. Decryption is required before classification."],
      recommendedStrategy: "unsupported"
    };
  }

  if (pdf_type === "corrupt") {
    return {
      id,
      pdf_type: "corrupt",
      confidence: 1.0,
      reasons: ["Document file structure is corrupted or could not be parsed as a valid PDF."],
      recommendedStrategy: "unsupported"
    };
  }

  const totalPages = pageDetails.length;
  if (totalPages === 0) {
    return {
      id,
      pdf_type: "unknown",
      confidence: 0.5,
      reasons: ["No pages found in the document metadata."],
      recommendedStrategy: "unsupported"
    };
  }

  const textPages = pageDetails.filter(p => p.isTextBased);
  const textPagesCount = textPages.length;
  const imagePagesCount = totalPages - textPagesCount;

  if (textPagesCount === totalPages) {
    // All pages are text-based
    const totalTextLength = textPages.reduce((acc, p) => acc + p.textLength, 0);
    const avgTextLength = totalTextLength / totalPages;

    if (avgTextLength > 500) {
      confidence = 1.0;
      reasons.push(`All ${totalPages} pages contain rich text structures (avg ${Math.round(avgTextLength)} chars/page).`);
    } else {
      confidence = 0.95;
      reasons.push(`All ${totalPages} pages contain text, but with low character density (avg ${Math.round(avgTextLength)} chars/page).`);
    }
    reasons.push("Classified as digitally generated PDF with high confidence.");
    recommendedStrategy = "native";
  } else if (textPagesCount === 0) {
    // All pages are image-based (scanned)
    confidence = 1.0;
    reasons.push(`None of the ${totalPages} pages contain extractable text content.`);
    reasons.push("Classified as scanned/image-based PDF. Needs OCR processing.");
    recommendedStrategy = "ocr";
  } else {
    // Mixed pages (hybrid)
    confidence = 0.9;
    reasons.push(`Contains a mixture of text-based (${textPagesCount}) and image-based (${imagePagesCount}) pages.`);
    reasons.push("Classified as hybrid PDF. Recommending mixed pipeline extraction.");
    recommendedStrategy = "hybrid_fallback";
  }

  return {
    id,
    pdf_type,
    confidence,
    reasons,
    recommendedStrategy
  };
}
