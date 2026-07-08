import { DocumentProfile, ProcessingStrategy, OCRProvider } from "./types";

/**
 * Singleton registry for tracking dynamically registered OCR engine providers.
 */
export class ExtractionStrategyRegistry {
  private static instance: ExtractionStrategyRegistry;
  private providers = new Map<string, OCRProvider>();

  private constructor() {}

  static getInstance(): ExtractionStrategyRegistry {
    if (!ExtractionStrategyRegistry.instance) {
      ExtractionStrategyRegistry.instance = new ExtractionStrategyRegistry();
    }
    return ExtractionStrategyRegistry.instance;
  }

  registerProvider(provider: OCRProvider): void {
    this.providers.set(provider.name, provider);
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  getProvider(name: string): OCRProvider | undefined {
    return this.providers.get(name);
  }

  reset(): void {
    this.providers.clear();
  }
}

/**
 * Selects the optimal processing strategy based on DocumentProfile.
 * 
 * @param profile - Classified DocumentProfile
 */
export function selectStrategy(profile: DocumentProfile): ProcessingStrategy {
  if (profile.pdf_type === "encrypted" || profile.pdf_type === "unknown") {
    return "unsupported";
  }

  return profile.recommendedStrategy;
}
