/**
 * AI response guardrail (PRD-v2 §F.2).
 *
 * The Credit Officer prompt must return a fixed schema and may only cite
 * evidence ids that were supplied in its context. This validator enforces both,
 * so unsupported or malformed AI output is rejected before it reaches a user.
 */

export const RECOMMENDATIONS = [
  "approve",
  "approve_with_conditions",
  "manual_review",
  "decline",
] as const;

export type Recommendation = (typeof RECOMMENDATIONS)[number];

export interface CreditOfficerResponse {
  strengths: string[];
  concerns: string[];
  recommendation: Recommendation;
  /** Metric / evidence / rule ids that support the narrative. */
  evidence: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

export function validateAIResponse(
  resp: unknown,
  allowedIds: string[] | Set<string>
): ValidationResult {
  const errors: string[] = [];
  const allowed = allowedIds instanceof Set ? allowedIds : new Set(allowedIds);

  if (typeof resp !== "object" || resp === null) {
    return { valid: false, errors: ["Response is not an object."] };
  }
  const r = resp as Record<string, unknown>;

  if (!isStringArray(r.strengths)) errors.push("`strengths` must be a string array.");
  if (!isStringArray(r.concerns)) errors.push("`concerns` must be a string array.");

  if (
    typeof r.recommendation !== "string" ||
    !RECOMMENDATIONS.includes(r.recommendation as Recommendation)
  ) {
    errors.push(`\`recommendation\` must be one of: ${RECOMMENDATIONS.join(", ")}.`);
  }

  if (!isStringArray(r.evidence)) {
    errors.push("`evidence` must be a string array.");
  } else {
    for (const id of r.evidence) {
      if (!allowed.has(id)) errors.push(`Unsupported evidence id: "${id}".`);
    }
  }

  return { valid: errors.length === 0, errors };
}
