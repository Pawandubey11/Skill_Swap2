import pool from "../lib/db.js";
import type { AnomalyResult } from "./anomalyDetector.js";

export interface RiskResult extends AnomalyResult {
  risk_score: number;
  risk_level: string;
  reasons: string[];
}

export async function calculateRisk(
  results: AnomalyResult[],
): Promise<RiskResult[]> {
  const riskResults: RiskResult[] = [];

  for (const row of results) {
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

    // Maximum risk score = 100
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

    const riskResult: RiskResult = {
      ...row,
      risk_score: riskScore,
      risk_level: riskLevel,
      reasons,
    };

    riskResults.push(riskResult);

    // Save risk analysis into MySQL
    await pool.execute(
      `
      UPDATE traffic_logs
      SET
        risk_score = ?,
        risk_level = ?,
        risk_reasons = ?
      WHERE ip_address = ?
        AND timestamp >= NOW() - INTERVAL 5 MINUTE
      `,
      [
        riskScore,
        riskLevel,
        JSON.stringify(reasons),
        row.ip_address,
      ],
    );

    console.log(
      `Risk updated: ${row.ip_address} -> ${riskLevel} | Risk Score: ${riskScore}`,
    );
  }

  return riskResults;
}
