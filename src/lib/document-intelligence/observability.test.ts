import { describe, it, expect } from "vitest";
import { ObservabilityTracker } from "./observability";

describe("Observability Tracker", () => {
  it("correctly aggregates times, metrics, and warnings across stages", async () => {
    const tracker = new ObservabilityTracker();

    tracker.startStage("Intake");
    // Simulate minor delay
    await new Promise(resolve => setTimeout(resolve, 10));
    tracker.endStage("Intake", true, 1.0, ["High quality file"], []);

    tracker.startStage("Classifier");
    await new Promise(resolve => setTimeout(resolve, 5));
    tracker.endStage("Classifier", true, 0.95, [], []);

    const summary = tracker.getSummary(0.98);

    expect(summary.telemetry.length).toBe(2);
    expect(summary.telemetry[0].stageName).toBe("Intake");
    expect(summary.telemetry[0].warnings).toContain("High quality file");
    expect(summary.overallDurationMs).toBeGreaterThan(10);
    expect(summary.finalScore).toBe(0.98);
  });
});
