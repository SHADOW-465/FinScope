import { describe, it, expect } from "vitest";
import { PNG } from "pngjs";
import { detectTables } from "./table-detector";

describe("Document Table Detector", () => {
  // Create a helper to construct a mock PNG grid with columns and borders
  const createTableTestPNG = (
    width: number,
    height: number,
    columns: number[], // column x-coordinates of text
    horizontalLines: number[] // y-coordinates of horizontal lines
  ): string => {
    const png = new PNG({ width, height });
    
    // Fill background with white (255)
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      png.data[idx] = 255;
      png.data[idx + 1] = 255;
      png.data[idx + 2] = 255;
      png.data[idx + 3] = 255;
    }

    // Draw vertical columns (width of 5 pixels)
    for (const startX of columns) {
      for (let y = 10; y < 90; y++) {
        for (let x = startX; x < startX + 5; x++) {
          const idx = (y * width + x) * 4;
          png.data[idx] = 0;
          png.data[idx + 1] = 0;
          png.data[idx + 2] = 0;
        }
      }
    }

    // Draw horizontal lines spanning 80% of width
    for (const y of horizontalLines) {
      for (let x = 10; x < 90; x++) {
        const idx = (y * width + x) * 4;
        png.data[idx] = 0;
        png.data[idx + 1] = 0;
        png.data[idx + 2] = 0;
      }
    }

    const buffer = PNG.sync.write(png);
    return buffer.toString("base64");
  };

  it("detects table borders when horizontal separator lines are present", async () => {
    // 100x100 pixels, horizontal line at row 50
    const base64 = createTableTestPNG(100, 100, [20, 50, 80], [50]);
    const result = await detectTables(base64);
    
    expect(layout => layout.tables).toBeDefined();
    expect(result.tables[0].hasBorders).toBe(true);
    expect(result.tables[0].columnsCount).toBe(3);
  });

  it("does not report borders when only vertical text columns exist", async () => {
    const base64 = createTableTestPNG(100, 100, [20, 50, 80], []);
    const result = await detectTables(base64);
    
    expect(result.tables[0].hasBorders).toBe(false);
    expect(result.tables[0].columnsCount).toBe(3);
  });
});
