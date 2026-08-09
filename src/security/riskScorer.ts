import type { AnomalyResult } from "./anomalyDetector.js";

export interface RiskResult extends AnomalyResult {
  risk_score: number;
  risk_level: string;
  reasons: string[];
}

export function calculateRisk(results: AnomalyResult[]): RiskResult[] {
  return results.map((row) => {
    let riskScore = 0;
    const reasons: string[] = [];

    // Request volume
    if (row.request_count >= 50) {
      riskScore += 30;
      reasons.push("Very high request volume");
    } else if (row.request_count >= 20) {
      riskScore += 20;
      reasons.push("High request volume");
    } else if (row.request_count >= 10) {
      riskScore += 10;
      reasons.push("Elevated request volume");
    }

    // Endpoint diversity
    if (row.unique_endpoints >= 20) {
      riskScore += 30;
      reasons.push("Accessing many different endpoints");
    } else if (row.unique_endpoints >= 10) {
      riskScore += 20;
      reasons.push("Accessing multiple endpoints");
    } else if (row.unique_endpoints >= 5) {
      riskScore += 10;
      reasons.push("Accessing several endpoints");
    }

    // Errors
    if (row.error_count >= 20) {
      riskScore += 30;
      reasons.push("Very high number of errors");
    } else if (row.error_count >= 10) {
      riskScore += 20;
      reasons.push("High number of errors");
    } else if (row.error_count >= 5) {
      riskScore += 10;
      reasons.push("Elevated number of errors");
    }

    // Anomaly detector result
    if (row.suspicious) {
      riskScore += 15;
      reasons.push("Traffic marked as suspicious");
    }

    riskScore = Math.min(riskScore, 100);

    let riskLevel: string;

    if (riskScore >= 80) {
      riskLevel = "CRITICAL";
    } else if (riskScore >= 60) {
      riskLevel = "HIGH";
    } else if (riskScore >= 30) {
      riskLevel = "MEDIUM";
    } else {
      riskLevel = "LOW";
    }

    return {
      ...row,
      risk_score: riskScore,
      risk_level: riskLevel,
      reasons,
    };
  });
}
