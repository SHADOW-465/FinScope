import { describe, it, expect } from "vitest";
import { PNG } from "pngjs";
import { detectTables } from "./table-detector";
import { selectStrategy } from "./strategy-selector";
import { categorizeError, ParserError } from "./error-handler";
import { DocumentProfile } from "./types";

describe("Final Architectural Phases", () => {
  const createMiniPNG = (): string => {
    const png = new PNG({ width: 5, height: 5 });
    png.data.fill(255); // White pixels
    // Draw one dark pixel
    png.data[0] = 0;
    png.data[1] = 0;
    png.data[2] = 0;
    return PNG.sync.write(png).toString("base64");
  };

  it("table detector parses base64 page images and locates visual boundaries", async () => {
    const base64 = createMiniPNG();
    const result = await detectTables(base64);
    expect(result.tables.length).toBe(1);
    expect(result.tables[0].boundingBox).toBeDefined();
    expect(result.tables[0].confidence).toBe(0.95);
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
