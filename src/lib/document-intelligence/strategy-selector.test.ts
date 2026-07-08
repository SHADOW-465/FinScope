import { describe, it, expect, beforeEach } from "vitest";
import { selectStrategy, ExtractionStrategyRegistry } from "./strategy-selector";
import { DocumentProfile, OCRProvider } from "./types";

describe("Extraction Strategy Selector", () => {
  const dummyProfile = (overrides: Partial<DocumentProfile>): DocumentProfile => ({
    id: "test-doc-id",
    pdf_type: "digital",
    confidence: 1.0,
    reasons: [],
    recommendedStrategy: "native",
    ...overrides
  });

  beforeEach(() => {
    ExtractionStrategyRegistry.getInstance().reset();
  });

  it("selects correct strategies based on profile pdf_type", () => {
    expect(selectStrategy(dummyProfile({ pdf_type: "digital", recommendedStrategy: "native" }))).toBe("native");
    expect(selectStrategy(dummyProfile({ pdf_type: "scanned", recommendedStrategy: "ocr" }))).toBe("ocr");
    expect(selectStrategy(dummyProfile({ pdf_type: "hybrid", recommendedStrategy: "hybrid_fallback" }))).toBe("hybrid_fallback");
    expect(selectStrategy(dummyProfile({ pdf_type: "corrupt", recommendedStrategy: "unsupported" }))).toBe("unsupported");
    expect(selectStrategy(dummyProfile({ pdf_type: "unknown", recommendedStrategy: "unsupported" }))).toBe("unsupported");
  });

  it("allows registering and retrieving OCR providers dynamically", () => {
    const registry = ExtractionStrategyRegistry.getInstance();
    
    const mockProvider1: OCRProvider = {
      name: "MockGroqVision",
      performOCR: async () => ({})
    };
    const mockProvider2: OCRProvider = {
      name: "MockGoogleVision",
      performOCR: async () => ({})
    };

    registry.registerProvider(mockProvider1);
    registry.registerProvider(mockProvider2);

    expect(registry.listProviders()).toContain("MockGroqVision");
    expect(registry.listProviders()).toContain("MockGoogleVision");
    expect(registry.getProvider("MockGroqVision")).toBe(mockProvider1);
    expect(registry.getProvider("MockGoogleVision")).toBe(mockProvider2);
  });
});
