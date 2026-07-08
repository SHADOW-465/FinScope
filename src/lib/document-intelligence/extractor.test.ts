import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { extractText } from "./extractor";

describe("Document Text Extraction Engine", () => {
  const referenceDir = "c:\\Users\\acer\\Downloads\\reference";

  it("extracts spatial text tokens from native PDF successfully", async () => {
    if (!fs.existsSync(referenceDir)) {
      console.warn(`Reference directory not found: ${referenceDir}, skipping test`);
      return;
    }
    const files = fs.readdirSync(referenceDir).filter(f => f.toLowerCase().endsWith(".pdf"));
    if (files.length === 0) {
      console.warn("No reference PDF files found, skipping test");
      return;
    }

    const filePath = path.join(referenceDir, files[0]);
    const buffer = fs.readFileSync(filePath);
    const tokens = await extractText(buffer, "native");

    expect(tokens.length).toBeGreaterThan(0);
    
    // Check first token details
    const token = tokens[0];
    expect(token.text).toBeDefined();
    expect(token.text.length).toBeGreaterThan(0);
    expect(token.boundingBox).toBeDefined();
    expect(token.boundingBox.width).toBeGreaterThanOrEqual(0);
    expect(token.boundingBox.height).toBeGreaterThanOrEqual(0);
    expect(token.confidence).toBe(1.0);
    expect(token.readingOrder).toBe(1);

    // Verify reading order sorting is strictly increasing
    for (let i = 1; i < tokens.length; i++) {
      expect(tokens[i].readingOrder).toBe(tokens[i - 1].readingOrder + 1);
    }
  });

  it("returns empty tokens list for non-native extraction strategy", async () => {
    const tokens = await extractText(Buffer.from([]), "ocr");
    expect(tokens).toEqual([]);
  });
});
