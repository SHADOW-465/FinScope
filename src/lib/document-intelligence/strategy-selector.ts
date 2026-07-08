import { DocumentProfile, ProcessingStrategy, OCRProvider } from "./types";

/**
 * Registry to hold and manage OCR providers dynamically.
 */
export class ExtractionStrategyRegistry {
  private static instance: ExtractionStrategyRegistry;
  private providers = new Map<string, OCRProvider>();

  private constructor() {}

  public static getInstance(): ExtractionStrategyRegistry {
    if (!ExtractionStrategyRegistry.instance) {
      ExtractionStrategyRegistry.instance = new ExtractionStrategyRegistry();
    }
    return ExtractionStrategyRegistry.instance;
  }

  /**
   * Registers a new OCR provider.
   */
  public registerProvider(provider: OCRProvider): void {
    this.providers.set(provider.name, provider);
  }

  /**
   * Retrieves an OCR provider by name.
   */
  public getProvider(name: string): OCRProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Lists all registered OCR providers.
   */
  public listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Resets the registry (useful for testing).
   */
  public reset(): void {
    this.providers.clear();
  }
}

/**
 * Automatically chooses the optimal extraction strategy based on the document profile.
 * 
 * @param profile - The DocumentProfile containing PDF type and classification confidence
 */
export function selectStrategy(profile: DocumentProfile): ProcessingStrategy {
  const { pdf_type, recommendedStrategy } = profile;

  if (pdf_type === "corrupt" || recommendedStrategy === "unsupported") {
    return "unsupported";
  }

  // Handle fallback or strategy overrides based on custom heuristics
  switch (pdf_type) {
    case "digital":
      return "native";
    case "scanned":
      return "ocr";
    case "hybrid":
      return "hybrid_fallback";
    default:
      return "unsupported";
  }
}
