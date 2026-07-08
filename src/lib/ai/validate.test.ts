/// <reference types="vitest/globals" />
import { validateAIResponse } from "@/lib/ai/validate";

const allowed = ["metric.score", "metric.foir_post", "liability.0"];

describe("validateAIResponse", () => {
  it("accepts a well-formed response citing only allowed ids", () => {
    const resp = {
      strengths: ["Stable income"],
      concerns: ["Existing EMI"],
      recommendation: "approve_with_conditions",
      evidence: ["metric.score", "liability.0"],
    };
    const r = validateAIResponse(resp, allowed);
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it("rejects a response citing a fabricated evidence id", () => {
    const resp = {
      strengths: [],
      concerns: [],
      recommendation: "approve",
      evidence: ["metric.score", "metric.fabricated"],
    };
    const r = validateAIResponse(resp, allowed);
    expect(r.valid).toBe(false);
    expect(r.errors.join(" ")).toContain("metric.fabricated");
  });

  it("rejects an invalid recommendation value", () => {
    const resp = {
      strengths: [],
      concerns: [],
      recommendation: "definitely_yes",
      evidence: [],
    };
    expect(validateAIResponse(resp, allowed).valid).toBe(false);
  });

  it("rejects a non-object or structurally incomplete response", () => {
    expect(validateAIResponse(null, allowed).valid).toBe(false);
    expect(validateAIResponse({ recommendation: "approve" }, allowed).valid).toBe(false);
  });
});
