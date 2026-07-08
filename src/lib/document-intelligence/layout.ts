import { PNG } from "pngjs";
import { DocumentLayout, LayoutRegion, BoundingBox } from "./types";

/**
 * Performs structural layout analysis on a page image using projection profiling.
 * Identifies header, footer, and transaction table regions.
 * 
 * @param base64Image - The raw page image encoded as a base64 PNG string
 */
export async function analyzeLayout(base64Image: string): Promise<DocumentLayout> {
  const imageBuffer = Buffer.from(base64Image, "base64");

  return new Promise((resolve, reject) => {
    new PNG().parse(imageBuffer, (err, png) => {
      if (err) {
        return reject(new Error(`Failed to parse PNG image: ${err.message}`));
      }

      const width = png.width;
      const height = png.height;
      const data = png.data;

      // 1. Calculate row-wise pixel density (horizontal projection profile)
      // We look for binarized/dark pixels (intensity < 180) as text indicator
      const rowDensity = new Float32Array(height);
      for (let y = 0; y < height; y++) {
        let darkPixels = 0;
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
          if (luminance < 180) {
            darkPixels++;
          }
        }
        rowDensity[y] = darkPixels / width;
      }

      const regions: LayoutRegion[] = [];

      // Heuristics for vertical page partitions
      const headerThresholdY = Math.round(height * 0.15);
      const footerThresholdY = Math.round(height * 0.85);

      // 2. Detect Header Region (top 15%)
      let headerStartY = -1;
      let headerEndY = -1;
      for (let y = 0; y < headerThresholdY; y++) {
        if (rowDensity[y] > 0.01) {
          if (headerStartY === -1) headerStartY = y;
          headerEndY = y;
        }
      }
      if (headerStartY !== -1) {
        regions.push({
          type: "header",
          boundingBox: { x: 0, y: headerStartY, width, height: (headerEndY - headerStartY) + 1 },
          confidence: 0.95
        });
      }

      // 3. Detect Footer Region (bottom 15%)
      let footerStartY = -1;
      let footerEndY = -1;
      for (let y = footerThresholdY; y < height; y++) {
        if (rowDensity[y] > 0.01) {
          if (footerStartY === -1) footerStartY = y;
          footerEndY = y;
        }
      }
      if (footerStartY !== -1) {
        regions.push({
          type: "footer",
          boundingBox: { x: 0, y: footerStartY, width, height: (footerEndY - footerStartY) + 1 },
          confidence: 0.95
        });
      }

      // 4. Detect Table / Body Region (middle 70%)
      let tableStartY = -1;
      let tableEndY = -1;
      const startSearchY = headerEndY !== -1 ? headerEndY + 5 : headerThresholdY;
      const endSearchY = footerStartY !== -1 ? footerStartY - 5 : footerThresholdY;

      for (let y = startSearchY; y <= endSearchY; y++) {
        if (rowDensity[y] > 0.02) {
          if (tableStartY === -1) tableStartY = y;
          tableEndY = y;
        }
      }

      if (tableStartY !== -1) {
        regions.push({
          type: "table",
          boundingBox: { x: 0, y: tableStartY, width, height: (tableEndY - tableStartY) + 1 },
          confidence: 0.9
        });
      }

      // If regions are empty, return a default single region
      if (regions.length === 0) {
        regions.push({
          type: "unknown",
          boundingBox: { x: 0, y: 0, width, height },
          confidence: 0.5
        });
      }

      resolve({
        regions,
        confidence: regions.length > 1 ? 0.92 : 0.5
      });
    });
  });
}
