import { PNG } from "pngjs";
import { TableDetectorResult, BoundingBox } from "./types";

/**
 * Parses a page image in base64 format and locates transaction table boundaries,
 * column distributions, and border layouts using pixel density sweeps.
 * 
 * @param base64Image - Base64 encoded PNG image of the page
 */
export async function detectTables(base64Image: string): Promise<TableDetectorResult> {
  const buffer = Buffer.from(base64Image, "base64");
  const png = PNG.sync.read(buffer);

  const width = png.width;
  const height = png.height;

  let minX = width, maxX = 0;
  let minY = height, maxY = 0;
  let hasDarkPixels = false;

  // Find overall boundaries of dark elements (text or borders)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = png.data[idx];
      const g = png.data[idx + 1];
      const b = png.data[idx + 2];
      
      if (r < 50 && g < 50 && b < 50) {
        hasDarkPixels = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Detect horizontal separator lines (borders)
  let hasBorders = false;
  for (let y = 0; y < height; y++) {
    let horizontalRun = 0;
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (png.data[idx] < 50) {
        horizontalRun++;
      }
    }
    // If a dark line spans > 50% of the page width
    if (horizontalRun > width * 0.5) {
      hasBorders = true;
      break;
    }
  }

  // Detect vertical columns count
  // Group adjacent column positions that contain vertical content
  const verticalDensity: boolean[] = [];
  for (let x = 0; x < width; x++) {
    let verticalCount = 0;
    for (let y = 0; y < height; y++) {
      const idx = (y * width + x) * 4;
      if (png.data[idx] < 50) {
        verticalCount++;
      }
    }
    // High density indicating column text block
    verticalDensity.push(verticalCount > 5);
  }

  let columnsCount = 0;
  let inColumn = false;
  for (let x = 0; x < width; x++) {
    if (verticalDensity[x]) {
      if (!inColumn) {
        columnsCount++;
        inColumn = true;
      }
    } else {
      inColumn = false;
    }
  }

  const boundingBox: BoundingBox = hasDarkPixels
    ? { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
    : { x: 0, y: 0, width, height };

  return {
    tables: [
      {
        boundingBox,
        hasBorders,
        confidence: 0.95,
        columnsCount
      }
    ],
    confidence: 0.95
  };
}
