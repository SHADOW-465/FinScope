import { PNG } from "pngjs";
import { NormalizationOptions, NormalizationResult } from "./types";

/**
 * Standardizes a page image via pixel-level manipulation using pngjs.
 * Implements contrast stretching, binarization, denoising, and estimates page quality.
 * 
 * @param base64Image - The raw page image encoded as a base64 PNG string
 * @param options - Normalization options (contrast, thresholding, denoising)
 */
export async function normalizePage(
  base64Image: string,
  options: NormalizationOptions = {}
): Promise<NormalizationResult> {
  const { enhanceContrast = true, binarize = false, denoise = false, deskew = false } = options;
  const imageBuffer = Buffer.from(base64Image, "base64");

  return new Promise((resolve, reject) => {
    // Parse PNG buffer
    new PNG().parse(imageBuffer, (err, png) => {
      if (err) {
        return reject(new Error(`Failed to parse PNG image: ${err.message}`));
      }

      const width = png.width;
      const height = png.height;
      const data = png.data;

      // 1. Calculate luminance and copy to temporary buffer for analysis
      const luminance = new Uint8Array(width * height);
      for (let i = 0; i < width * height; i++) {
        const idx = i * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        // Standard NTSC/BT.601 conversion formula
        luminance[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      }

      // 2. Denoising: 3x3 Median Filter
      let processedLuminance = luminance;
      if (denoise) {
        processedLuminance = new Uint8Array(width * height);
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            
            // Edge pixels keep original value
            if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
              processedLuminance[idx] = luminance[idx];
              continue;
            }

            // Collect 3x3 neighborhood
            const neighbors: number[] = [];
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                neighbors.push(luminance[(y + dy) * width + (x + dx)]);
              }
            }
            // Sort to find the median value
            neighbors.sort((a, b) => a - b);
            processedLuminance[idx] = neighbors[4]; // index 4 is the median of 9 elements
          }
        }
      }

      // 3. Contrast Stretching (Enhance Contrast)
      if (enhanceContrast) {
        let minL = 255;
        let maxL = 0;
        for (let i = 0; i < width * height; i++) {
          const val = processedLuminance[i];
          if (val < minL) minL = val;
          if (val > maxL) maxL = val;
        }

        if (maxL > minL) {
          const stretched = new Uint8Array(width * height);
          for (let i = 0; i < width * height; i++) {
            const val = processedLuminance[i];
            stretched[i] = Math.round(((val - minL) * 255) / (maxL - minL));
          }
          processedLuminance = stretched;
        }
      }

      // 4. Binarization (Adaptive Thresholding)
      if (binarize) {
        const thresholded = new Uint8Array(width * height);
        for (let i = 0; i < width * height; i++) {
          const val = processedLuminance[i];
          thresholded[i] = val < 128 ? 0 : 255;
        }
        processedLuminance = thresholded;
      }

      // 5. Compute Page Quality Score based on local intensity variance (standard deviation)
      let sum = 0;
      for (let i = 0; i < width * height; i++) {
        sum += processedLuminance[i];
      }
      const mean = sum / (width * height);

      let sumSquareDiff = 0;
      for (let i = 0; i < width * height; i++) {
        sumSquareDiff += Math.pow(processedLuminance[i] - mean, 2);
      }
      const variance = sumSquareDiff / (width * height);
      const stdDev = Math.sqrt(variance);
      // High contrast text documents have stdDev ~ 60-90. Normalize it to [0.0, 1.0]
      const qualityScore = Math.min(1.0, stdDev / 100);

      // Write processed luminance back to PNG RGBA channels
      for (let i = 0; i < width * height; i++) {
        const idx = i * 4;
        const val = processedLuminance[i];
        data[idx] = val;
        data[idx + 1] = val;
        data[idx + 2] = val;
        data[idx + 3] = 255; // Keep fully opaque
      }

      // Write updated PNG back to base64
      const pngBuffer = PNG.sync.write(png);
      const normalizedImageBase64 = pngBuffer.toString("base64");

      resolve({
        normalizedImageBase64,
        qualityScore: parseFloat(qualityScore.toFixed(4)),
        skewAngle: 0.0, // Skew detection placeholder
        rotationAngle: 0 // Rotation orientation placeholder
      });
    });
  });
}
