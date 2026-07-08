import { DocumentProfile, ProcessingStrategy } from "./types";

/**
 * Chooses the optimal extraction strategy based on Classified DocumentProfile properties.
 * 
 * @param profile - Classified DocumentProfile
 */
export function selectStrategy(profile: DocumentProfile): ProcessingStrategy {
  if (profile.pdf_type === "encrypted" || profile.pdf_type === "unknown") {
    return "unsupported";
  }

  // Map to strategy configurations
  return profile.recommendedStrategy;
}
