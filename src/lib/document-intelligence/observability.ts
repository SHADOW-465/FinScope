import { StageTelemetry, LedgerObservability } from "./types";

/**
 * Tracks execution times, confidences, errors, and warnings for document intelligence stages.
 */
export class ObservabilityTracker {
  private stages: StageTelemetry[] = [];
  private startTimes: Record<string, number> = {};

  /**
   * Starts timing a processing stage.
   */
  startStage(name: string): void {
    this.startTimes[name] = Date.now();
  }

  /**
   * Ends timing and records metrics for a processing stage.
   */
  endStage(
    name: string,
    success: boolean,
    confidence?: number,
    warnings: string[] = [],
    failures: string[] = []
  ): void {
    const startTime = this.startTimes[name];
    const duration = startTime ? Date.now() - startTime : 0;

    this.stages.push({
      stageName: name,
      durationMs: duration,
      confidence,
      success,
      warnings,
      failures
    });
  }

  /**
   * Compiles the tracking summary.
   */
  getSummary(finalScore = 1.0): LedgerObservability {
    const overallDuration = this.stages.reduce((acc, s) => acc + s.durationMs, 0);

    return {
      telemetry: [...this.stages],
      overallDurationMs: overallDuration,
      finalScore
    };
  }
}
