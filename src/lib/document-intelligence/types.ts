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

export interface OCRProvider {
  name: string;
  performOCR(base64Images: string[]): Promise<any>;
}

export interface TextToken {
  text: string;
  pageNumber: number;
  boundingBox: BoundingBox;
  font: string;
  confidence: number;
  readingOrder: number;
}

export interface RawTransaction {
  dateText: string;
  descriptionText: string;
  amountText: string;
  balanceText: string;
  confidence: number;
}

export interface FieldConfidence<T> {
  value: T;
  confidence: number;
}

export interface Transaction {
  date: FieldConfidence<string>;
  value_date?: FieldConfidence<string>;
  description: FieldConfidence<string>;
  withdrawal: FieldConfidence<number>;
  deposit: FieldConfidence<number>;
  balance: FieldConfidence<number>;
  reference: FieldConfidence<string>;
  channel: FieldConfidence<string>;
  raw_text: string;
  confidence: number;
}

export interface ValidationAnomaly {
  type: "balance_mismatch" | "chronological_jump" | "negative_balance";
  message: string;
  transactionIndex?: number;
  expectedValue?: number;
  actualValue?: number;
}

export interface LedgerValidationResult {
  valid: boolean;
  anomalies: ValidationAnomaly[];
  mathematicalScore: number;
}

export interface LedgerConfidence {
  averageTransactionConfidence: number;
  reconciliationScore: number;
  overallConfidenceScore: number;
}

export interface BankTemplate {
  bankName: string;
  detectorRegex: RegExp;
  columnMap: {
    dateRelativeX: [number, number];
    descriptionRelativeX: [number, number];
    amountRelativeX: [number, number];
    balanceRelativeX: [number, number];
  };
}

export interface StageTelemetry {
  stageName: string;
  durationMs: number;
  confidence?: number;
  success: boolean;
  warnings: string[];
  failures: string[];
}

export interface LedgerObservability {
  telemetry: StageTelemetry[];
  overallDurationMs: number;
  finalScore: number;
}
