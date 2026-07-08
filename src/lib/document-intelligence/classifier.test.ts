import { describe, it, expect } from "vitest";
import { classifyDocument } from "./classifier";
import { DocumentMetadata } from "./types";

describe("Document Classifier Engine", () => {
  const dummyMetadata = (overrides: Partial<DocumentMetadata>): DocumentMetadata => ({
    id: "test-id",
    fileName: "statement.pdf",
    fileSize: 1024,
    pages: 1,
    encrypted: false,
    pdf_type: "digital",
    language: "en",
    estimated_quality: 1.0,
    bank_unknown: false,
    processing_strategy: "native",
    ...overrides
  });

  it("correctly classifies high-density digital PDFs with 100% confidence", () => {
    const meta = dummyMetadata({
      pdf_type: "digital",
      pageDetails: [
        { pageNumber: 1, textLength: 1200, wordCount: 200, isTextBased: true },
        { pageNumber: 2, textLength: 1500, wordCount: 250, isTextBased: true }
      ]
    });
    
    const profile = classifyDocument(meta);
    expect(profile.pdf_type).toBe("digital");
    expect(profile.confidence).toBe(1.0);
    expect(profile.recommendedStrategy).toBe("native");
    expect(profile.reasons).toContain("All 2 pages contain rich text structures (avg 1350 chars/page).");
  });

  it("classifies low-density digital PDFs with slightly lower confidence", () => {
    const meta = dummyMetadata({
      pdf_type: "digital",
      pageDetails: [
        { pageNumber: 1, textLength: 200, wordCount: 30, isTextBased: true }
      ]
    });
    
    const profile = classifyDocument(meta);
    expect(profile.pdf_type).toBe("digital");
    expect(profile.confidence).toBe(0.95);
    expect(profile.reasons).toContain("All 1 pages contain text, but with low character density (avg 200 chars/page).");
  });

  it("correctly classifies scanned PDFs and recommends OCR", () => {
    const meta = dummyMetadata({
      pdf_type: "scanned",
      pageDetails: [
        { pageNumber: 1, textLength: 0, wordCount: 0, isTextBased: false },
        { pageNumber: 2, textLength: 0, wordCount: 0, isTextBased: false }
      ]
    });
    
    const profile = classifyDocument(meta);
    expect(profile.pdf_type).toBe("scanned");
    expect(profile.confidence).toBe(1.0);
    expect(profile.recommendedStrategy).toBe("ocr");
  });

  it("correctly classifies hybrid PDFs and recommends hybrid strategy", () => {
    const meta = dummyMetadata({
      pdf_type: "hybrid",
      pageDetails: [
        { pageNumber: 1, textLength: 1000, wordCount: 150, isTextBased: true },
        { pageNumber: 2, textLength: 0, wordCount: 0, isTextBased: false }
      ]
    });
    
    const profile = classifyDocument(meta);
    expect(profile.pdf_type).toBe("hybrid");
    expect(profile.confidence).toBe(0.9);
    expect(profile.recommendedStrategy).toBe("hybrid_fallback");
  });

  it("handles encrypted metadata properly", () => {
    const meta = dummyMetadata({
      encrypted: true,
      pdf_type: "unknown"
    });
    
    const profile = classifyDocument(meta);
    expect(profile.confidence).toBe(1.0);
    expect(profile.pdf_type).toBe("unknown");
    expect(profile.recommendedStrategy).toBe("unsupported");
    expect(profile.reasons[0]).toContain("password protected");
  });

  it("handles corrupt metadata properly", () => {
    const meta = dummyMetadata({
      pdf_type: "corrupt"
    });
    
    const profile = classifyDocument(meta);
    expect(profile.confidence).toBe(1.0);
    expect(profile.pdf_type).toBe("corrupt");
    expect(profile.recommendedStrategy).toBe("unsupported");
  });
});
