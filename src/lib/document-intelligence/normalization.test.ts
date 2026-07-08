import { describe, it, expect } from "vitest";
import { PNG } from "pngjs";
import { normalizePage } from "./normalization";

describe("Document Normalization Engine", () => {
  // Create a helper to construct a dummy base64 PNG image for tests
  const createDummyPNG = (width: number, height: number, pixelValues: number[]): string => {
    const png = new PNG({ width, height });
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      const val = pixelValues[i] !== undefined ? pixelValues[i] : 128;
      png.data[idx] = val;
      png.data[idx + 1] = val;
      png.data[idx + 2] = val;
      png.data[idx + 3] = 255;
    }
    const buffer = PNG.sync.write(png);
    return buffer.toString("base64");
  };

  it("successfully parses and converts PNG to grayscale with quality score", async () => {
    const pixels = [
      50, 60, 70,
      100, 110, 120,
      150, 160, 170
    ];
    const base64 = createDummyPNG(3, 3, pixels);
    const result = await normalizePage(base64, { enhanceContrast: false });
    
    expect(result.normalizedImageBase64).toBeDefined();
    expect(result.qualityScore).toBeGreaterThan(0.0);
    expect(result.qualityScore).toBeLessThanOrEqual(1.0);
    expect(result.skewAngle).toBe(0.0);
  });

  it("performs contrast stretching successfully", async () => {
    // Range of pixels is [50, 200]
    const pixels = [
      50, 100, 200,
      200, 100, 50,
      100, 50, 200
    ];
    const base64 = createDummyPNG(3, 3, pixels);
    const result = await normalizePage(base64, { enhanceContrast: true });
    
    // Parse result back to inspect pixels
    const resultBuffer = Buffer.from(result.normalizedImageBase64, "base64");
    const png = PNG.sync.read(resultBuffer);
    
    // Outliers 50 -> 0 and 200 -> 255
    let hasZero = false;
    let hasMax = false;
    for (let i = 0; i < 9; i++) {
      const idx = i * 4;
      if (png.data[idx] === 0) hasZero = true;
      if (png.data[idx] === 255) hasMax = true;
    }
    expect(hasZero).toBe(true);
    expect(hasMax).toBe(true);
  });

  it("binarizes pixel values when requested", async () => {
    const pixels = [
      40, 200, 120,
      100, 130, 240,
      250, 10, 150
    ];
    const base64 = createDummyPNG(3, 3, pixels);
    const result = await normalizePage(base64, { binarize: true, enhanceContrast: false });
    
    const resultBuffer = Buffer.from(result.normalizedImageBase64, "base64");
    const png = PNG.sync.read(resultBuffer);
    
    for (let i = 0; i < 9; i++) {
      const idx = i * 4;
      const val = png.data[idx];
      expect(val === 0 || val === 255).toBe(true);
    }
  });

  it("applies median noise filter successfully", async () => {
    // 3x3 pixel area where the center is a noisy outlier (255) surrounded by dark pixels (0)
    const pixels = [
      0, 0, 0,
      0, 255, 0,
      0, 0, 0
    ];
    const base64 = createDummyPNG(3, 3, pixels);
    // Denoise should clean center pixel 255 down to 0 (median of neighbors)
    const result = await normalizePage(base64, { denoise: true, enhanceContrast: false });
    
    const resultBuffer = Buffer.from(result.normalizedImageBase64, "base64");
    const png = PNG.sync.read(resultBuffer);
    
    // Center pixel is at index 4 (row 1, col 1)
    const centerIdx = 4 * 4;
    expect(png.data[centerIdx]).toBe(0);
  });
});
