import pool from "../lib/db.js";
import type { TrafficFeatures } from "./featureExtractor.js";

export interface AnomalyResult extends TrafficFeatures {
  anomaly_score: number;
  suspicious: boolean;
}

export async function detectAnomalies(
  features: TrafficFeatures[]
): Promise<AnomalyResult[]> {
  const results: AnomalyResult[] = [];

  for (const row of features) {
    let score = 0;

    // High request volume
    if (row.request_count >= 20) {
      score += 40;
    } else if (row.request_count >= 10) {
      score += 20;
    }

    // Accessing many different endpoints
    if (row.unique_endpoints >= 10) {
      score += 30;
    } else if (row.unique_endpoints >= 5) {
      score += 15;
    }

    // Large number of errors
    if (row.error_count >= 10) {
      score += 30;
    } else if (row.error_count >= 5) {
      score += 15;
    }

    const suspicious = score >= 50;

    results.push({
      ...row,
      anomaly_score: score,
      suspicious,
    });

    await pool.execute(
      `
      UPDATE traffic_logs
      SET is_suspicious = ?
      WHERE ip_address = ?
        AND timestamp >= NOW() - INTERVAL 5 MINUTE
      `,
      [suspicious ? 1 : 0, row.ip_address]
    );

    console.log(
      `Database updated: ${row.ip_address} -> ${
        suspicious ? "SUSPICIOUS" : "NORMAL"
      }`
    );
  }

  return results;
}
