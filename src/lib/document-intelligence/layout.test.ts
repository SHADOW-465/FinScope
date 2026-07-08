import { describe, it, expect } from "vitest";
import { PNG } from "pngjs";
import { analyzeLayout } from "./layout";

describe("Document Layout Analyzer", () => {
  // Create a helper to construct a dummy base64 PNG image with content at specified row indices
  const createLayoutTestPNG = (width: number, height: number, textRows: Set<number>): string => {
    const png = new PNG({ width, height });
    for (let y = 0; y < height; y++) {
      const isText = textRows.has(y);
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        // Text is black (0), background is white (255)
        const val = isText ? 0 : 255;
        png.data[idx] = val;
        png.data[idx + 1] = val;
        png.data[idx + 2] = val;
        png.data[idx + 3] = 255;
      }
    }
    const buffer = PNG.sync.write(png);
    return buffer.toString("base64");
  };

  it("successfully detects header, footer, and table regions based on content distribution", async () => {
    // 100x100 pixel image
    // Header content: row 5
    // Table content: rows 40, 50, 60
    // Footer content: row 95
    const textRows = new Set([5, 40, 50, 60, 95]);
    const base64 = createLayoutTestPNG(100, 100, textRows);
    
    const layout = await analyzeLayout(base64);
    
    expect(layout.confidence).toBeGreaterThan(0.8);
    expect(layout.regions).toBeDefined();
    
    const header = layout.regions.find(r => r.type === "header");
    expect(header).toBeDefined();
    expect(header!.boundingBox.y).toBe(5);
    expect(header!.boundingBox.height).toBe(1);

    const footer = layout.regions.find(r => r.type === "footer");
    expect(footer).toBeDefined();
    expect(footer!.boundingBox.y).toBe(95);

    const table = layout.regions.find(r => r.type === "table");
    expect(table).toBeDefined();
    expect(table!.boundingBox.y).toBeGreaterThanOrEqual(40);
    expect(table!.boundingBox.y + table!.boundingBox.height).toBeLessThanOrEqual(61);
  });

  it("returns default region when the document page is completely empty", async () => {
    const base64 = createLayoutTestPNG(10, 10, new Set());
    const layout = await analyzeLayout(base64);
    
    expect(layout.regions.length).toBe(1);
    expect(layout.regions[0].type).toBe("unknown");
    expect(layout.regions[0].boundingBox).toEqual({ x: 0, y: 0, width: 10, height: 10 });
  });
});
