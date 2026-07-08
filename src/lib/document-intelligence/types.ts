export type PDFType = "digital" | "scanned" | "hybrid" | "corrupt" | "unknown";

export type ProcessingStrategy = "native" | "ocr" | "hybrid_fallback" | "unsupported";

export interface PageMetadata {
  pageNumber: number;
  textLength: number;
  wordCount: number;
  isTextBased: boolean;
}

export interface DocumentMetadata {
  id: string; // Unique identifier (hash or uuid)
  fileName: string; // Original filename
  fileSize: number; // File size in bytes
  pages: number; // Number of pages
  encrypted: boolean; // Password protected/encrypted
  pdf_type: PDFType;
  language: string; // Detected language code, e.g., 'en'
  estimated_quality: number; // Metric from 0.0 (corrupt/unreadable) to 1.0 (perfect digital)
  bank_unknown: boolean; // True if bank template could not be recognized
  processing_strategy: ProcessingStrategy;
  pageDetails?: PageMetadata[];
}

export interface DocumentProfile {
  id: string;
  pdf_type: PDFType;
  confidence: number;
  reasons: string[];
  recommendedStrategy: ProcessingStrategy;
}

export interface DecryptionResult {
  success: boolean;
  error?: string;
  decryptedBuffer?: Buffer;
}

export interface NormalizationOptions {
  enhanceContrast?: boolean;
  binarize?: boolean;
  denoise?: boolean;
  deskew?: boolean;
}

export interface NormalizationResult {
  normalizedImageBase64: string;
  qualityScore: number;
  skewAngle: number;
  rotationAngle: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type RegionType = "header" | "footer" | "table" | "summary" | "logo" | "watermark" | "unknown";

export interface LayoutRegion {
  type: RegionType;
  boundingBox: BoundingBox;
  confidence: number;
}

export interface DocumentLayout {
  regions: LayoutRegion[];
  confidence: number;
}

export interface TableRegion {
  boundingBox: BoundingBox;
  hasBorders: boolean;
  confidence: number;
  columnsCount?: number;
}

export interface TableDetectorResult {
  tables: TableRegion[];
  confidence: number;
}
