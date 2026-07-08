import { TextToken, ProcessingStrategy, BoundingBox } from "./types";

const PDFJS = require("pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js");

/**
 * Extracts all text tokens from a PDF statement buffer preserving spatial coordinates.
 * Supports native text extraction and reading order reconstruction.
 * 
 * @param pdfBuffer - The raw PDF statement buffer
 * @param strategy - The processing strategy to use (native, ocr, etc.)
 */
export async function extractText(
  pdfBuffer: Buffer,
  strategy: ProcessingStrategy
): Promise<TextToken[]> {
  if (strategy !== "native") {
    // Return empty tokens for non-native strategy (OCR extraction is managed by OCRProvider)
    return [];
  }

  PDFJS.disableWorker = true;
  const doc = await PDFJS.getDocument({
    data: pdfBuffer,
    nativeImageDecoderSupport: "none",
    disableFontFace: true,
  });

  const numPages = doc.numPages;
  const tokens: TextToken[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport(1.0);
    const pageHeight = viewport.height;

    const textContent = await page.getTextContent({ normalizeWhitespace: true });
    
    for (const item of textContent.items) {
      // Clean extracted string
      const text = item.str.trim();
      if (!text) continue;

      // Extract transformation matrix [scaleX, skewX, skewY, scaleY, transformX, transformY]
      const transform = item.transform;
      const x = transform[4];
      const y = transform[5];
      const width = item.width;
      const height = item.height || 10; // Fallback height

      // Convert PDF coordinate origin (bottom-left) to browser coordinate origin (top-left)
      const topY = pageHeight - y - height;

      tokens.push({
        text,
        pageNumber: pageNum,
        boundingBox: {
          x: parseFloat(x.toFixed(2)),
          y: parseFloat(topY.toFixed(2)),
          width: parseFloat(width.toFixed(2)),
          height: parseFloat(height.toFixed(2))
        },
        font: item.fontName || "default",
        confidence: 1.0, // Digital text extraction is 100% accurate
        readingOrder: 0 // Will be assigned after sorting
      });
    }
  }

  await doc.destroy();

  // Sort tokens to reconstruct natural reading order: page -> vertical row line -> horizontal x position
  const sortedTokens = tokens.sort((a, b) => {
    if (a.pageNumber !== b.pageNumber) {
      return a.pageNumber - b.pageNumber;
    }
    // Group tokens on the same horizontal row (within 4 pixel vertical difference)
    const yA = Math.round(a.boundingBox.y / 4);
    const yB = Math.round(b.boundingBox.y / 4);
    if (yA !== yB) {
      return yA - yB;
    }
    return a.boundingBox.x - b.boundingBox.x;
  });

  // Assign reading order numbers sequentially
  for (let i = 0; i < sortedTokens.length; i++) {
    sortedTokens[i].readingOrder = i + 1;
  }

  return sortedTokens;
}
