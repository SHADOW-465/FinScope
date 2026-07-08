import { describe, it, expect } from "vitest";
import { detectTables } from "./table-detector";
import { selectStrategy } from "./strategy-selector";
import { categorizeError, ParserError } from "./error-handler";
import { LayoutRegion, DocumentProfile } from "./types";

describe("Final Architectural Phases", () => {
  it("table detector isolates layout regions categorized as table_region", () => {
    const list: LayoutRegion[] = [
      { type: "header", boundingBox: { x: 0, y: 0, width: 100, height: 20 }, confidence: 1.0 },
      { type: "table_region", boundingBox: { x: 0, y: 50, width: 100, height: 50 }, confidence: 0.95 }
    ];

    const tables = detectTables(list, 1);
    expect(tables.length).toBe(1);
    expect(tables[0].boundingBox.y).toBe(50);
    expect(tables[0].confidence).toBe(0.95);
  });

  it("strategy selector routes optimal pipeline strategy based on profile type", () => {
    const profile: DocumentProfile = {
      id: "test",
      pdf_type: "native",
      confidence: 1.0,
      reasons: [],
      recommendedStrategy: "native"
    };

    expect(selectStrategy(profile)).toBe("native");
  });

  it("error handler groups exceptions cleanly", () => {
    const errManual = new Error("Invalid password specified for decryption");
    expect(categorizeError(errManual)).toBe("manual_review");

    const errFatal = new Error("Corrupt PDF file header");
    expect(categorizeError(errFatal)).toBe("fatal");

    const errCustom = new ParserError("Network timeout limit exceeded", "retryable");
    expect(categorizeError(errCustom)).toBe("retryable");
  });
});
