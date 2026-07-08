import { PNG } from "pngjs";
import OpenAI from "openai";

const PDFJS = require("pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js");

export interface OCRResult {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  statementPeriod: string;
  openingBalance: number;
  closingBalance: number;
  transactions: Array<{
    date: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
  }>;
}

/**
 * Extracts scanned pages as base64 PNG images from a PDF buffer in pure JS.
 */
export async function extractScannedPages(pdfBuffer: Buffer): Promise<string[]> {
  const images: string[] = [];
  PDFJS.disableWorker = true;

  const doc = await PDFJS.getDocument({
    data: pdfBuffer,
    nativeImageDecoderSupport: "none",
    disableFontFace: true,
  });
  const numPages = doc.numPages;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const ops = await page.getOperatorList();

    let largestImageId: string | null = null;
    let maxPixelCount = 0;

    // Iterate page operator list to find the largest image object
    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i];
      if (fn === PDFJS.OPS.paintImageXObject || fn === PDFJS.OPS.paintJpegXObject) {
        const imgId = ops.argsArray[i][0];
        
        let imgData: any = null;
        try {
          imgData = page.objs.get(imgId);
        } catch {
          try {
            imgData = page.commonObjs.get(imgId);
          } catch {}
        }

        if (imgData && imgData.width && imgData.height) {
          const pixels = imgData.width * imgData.height;
          if (pixels > maxPixelCount) {
            maxPixelCount = pixels;
            largestImageId = imgId;
          }
        }
      }
    }

    if (largestImageId) {
      let imgData: any = null;
      try {
        imgData = page.objs.get(largestImageId);
      } catch {
        try {
          imgData = page.commonObjs.get(largestImageId);
        } catch {}
      }

      if (imgData && imgData.data && imgData.width && imgData.height) {
        const { width, height, data } = imgData;
        const png = new PNG({ width, height });

        // Convert RGB/RGBA/Grayscale pixel data to PNG
        if (data.length === width * height * 4) {
          png.data = Buffer.from(data);
        } else if (data.length === width * height * 3) {
          const rgba = new Uint8Array(width * height * 4);
          let srcIdx = 0;
          let dstIdx = 0;
          for (let k = 0; k < width * height; k++) {
            rgba[dstIdx] = data[srcIdx];
            rgba[dstIdx + 1] = data[srcIdx + 1];
            rgba[dstIdx + 2] = data[srcIdx + 2];
            rgba[dstIdx + 3] = 255;
            srcIdx += 3;
            dstIdx += 4;
          }
          png.data = Buffer.from(rgba);
        } else if (data.length === width * height) {
          // Grayscale
          const rgba = new Uint8Array(width * height * 4);
          let dstIdx = 0;
          for (let k = 0; k < width * height; k++) {
            const val = data[k];
            rgba[dstIdx] = val;
            rgba[dstIdx + 1] = val;
            rgba[dstIdx + 2] = val;
            rgba[dstIdx + 3] = 255;
            dstIdx += 4;
          }
          png.data = Buffer.from(rgba);
        } else {
          png.data = Buffer.from(data);
        }

        const pngBuffer = PNG.sync.write(png);
        images.push(pngBuffer.toString("base64"));
      }
    }
  }

  doc.destroy();
  return images;
}

/**
 * Transcribes statement images into a structured JSON ledger using Groq's Vision API.
 */
export async function performGroqOCR(base64Images: string[]): Promise<OCRResult> {
  const apiKey = process.env.GROK_API_KEY || process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("Groq API key not configured (GROK_API_KEY missing in .env.local)");
  }

  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: "https://api.groq.com/openai/v1",
  });

  const response = await client.chat.completions.create({
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text" as const,
            text: `You are an institutional-grade bank statement OCR engine.
Extract all transaction records and account details from the scanned statement page images provided.
Ensure that every transaction row in the table is captured precisely, including Date, Description, Debit, Credit, and Balance.
Ensure no transaction is missed.

Return ONLY a JSON object (no markdown code blocks, no wrapping, no explanations) containing:
- bankName: string ("SBI" | "HDFC" | "ICICI" | "AXIS" | "BARB" | "CANARA" | "INDUSIND" | "GENERIC")
- accountNumber: string (exact account number, or "Unknown")
- accountHolder: string (exact account holder name, or "Unknown")
- statementPeriod: string (e.g. "01-Apr-2023 to 30-Apr-2023")
- openingBalance: number
- closingBalance: number
- transactions: array of objects:
  - date: string (formatted as YYYY-MM-DD, e.g. "2023-04-01")
  - description: string (the transaction narration)
  - debit: number (amount debited, 0 if credit)
  - credit: number (amount credited, 0 if debit)
  - balance: number (running account balance after this transaction)
`
          },
          ...base64Images.map((img) => ({
            type: "image_url" as const,
            image_url: {
              url: `data:image/png;base64,${img}`,
            },
          })),
        ] as any,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content || "";
  try {
    return JSON.parse(content.trim()) as OCRResult;
  } catch (err: any) {
    console.error("Failed to parse Groq OCR JSON:", content);
    throw new Error(`Groq Vision OCR failed to return valid JSON: ${err.message}`);
  }
}
