import { describe, it, expect } from "vitest";
import { analyzeLayout } from "./layout-analyzer";
import { TextToken } from "./types";

describe("Layout Analyzer Engine", () => {
  const dummyToken = (y: number, text: string): TextToken => ({
    text,
    pageNumber: 1,
    boundingBox: { x: 50, y, width: 100, height: 10 },
    font: "Courier",
    confidence: 1.0,
    readingOrder: 1
  });

  it("segments tokens into header, table_region, and footer", () => {
    // Total vertical span: 0 to 1000.
    // Cutoffs: Header <= 150. Footer >= 900.
    const tokens = [
      dummyToken(50, "HDFC BANK"),
      dummyToken(500, "12-Jul-23  UPI-JOHN  1,500.00  24,592.56"),
      dummyToken(950, "Page 1 of 5")
    ];

    const regions = analyzeLayout(tokens);
    
    expect(regions.length).toBe(3);
    
    const header = regions.find(r => r.type === "header");
    const body = regions.find(r => r.type === "table");
    const footer = regions.find(r => r.type === "footer");

    expect(header).toBeDefined();
    expect(body).toBeDefined();
    expect(footer).toBeDefined();

    expect(header?.boundingBox.y).toBe(50);
    expect(body?.boundingBox.y).toBe(500);
    expect(footer?.boundingBox.y).toBe(950);
  });
});
