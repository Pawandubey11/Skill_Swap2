import pool from "../lib/db.js";
import type { TrafficFeatures } from "./featureExtractor.js";
import {
  getIsolationForestInstance,
  TrafficFeatureVector,
} from "./isolationForest.js";

export interface AnomalyResult extends TrafficFeatures {
  anomaly_score: number;
  ml_anomaly_score: number;
  raw_ml_score: number;
  suspicious: boolean;
}

export async function detectAnomalies(
  features: TrafficFeatures[],
): Promise<AnomalyResult[]> {
  const results: AnomalyResult[] = [];

  if (!features || features.length === 0) {
    return [];
  }

  // ==========================================================
  // STEP 1: CONVERT TO FEATURE VECTORS FOR ISOLATION FOREST
  // ==========================================================
  const featureVectors: TrafficFeatureVector[] = features.map((row) => ({
    ip_address: row.ip_address,
    features: [
      row.request_count,
      row.unique_endpoints,
      row.unique_methods,
      row.error_count,
      row.avg_response_time,
      row.max_response_time,
    ],
  }));

  // ==========================================================
  // STEP 2: FIT ISOLATION FOREST MODEL
  // ==========================================================
  const forest = getIsolationForestInstance();
  const rawData = featureVectors.map((v) => v.features);
  forest.fit(rawData);

  console.log(
    `🌲 Isolation Forest trained on ${rawData.length} sample vectors across 100 Isolation Trees.`,
  );

  // ==========================================================
  // STEP 3: SCORE EACH TRAFFIC FEATURE ROW (HYBRID ML + RULES)
  // ==========================================================
  for (const row of features) {
    let ruleScore = 0;

    // High request volume
    if (row.request_count >= 50) {
      ruleScore += 50;
    } else if (row.request_count >= 20) {
      ruleScore += 35;
    } else if (row.request_count >= 10) {
      ruleScore += 15;
    }

    // Accessing many different endpoints
    if (row.unique_endpoints >= 10) {
      ruleScore += 30;
    } else if (row.unique_endpoints >= 5) {
      ruleScore += 15;
    }

    // Large number of errors
    if (row.error_count >= 10) {
      ruleScore += 30;
    } else if (row.error_count >= 5) {
      ruleScore += 15;
    }

    // Run Isolation Forest prediction
    const vector = [
      row.request_count,
      row.unique_endpoints,
      row.unique_methods,
      row.error_count,
      row.avg_response_time,
      row.max_response_time,
    ];
    const mlResult = forest.calculateAnomalyScore(vector);

    // Hybrid Anomaly Score: 60% ML Isolation Forest + 40% Rule-based heuristic
    const combinedScore = Math.min(
      100,
      Math.max(
        0,
        Math.round(mlResult.ml_anomaly_score * 0.6 + ruleScore * 0.4),
      ),
    );

    const suspicious = combinedScore >= 50 || mlResult.is_anomaly;

    results.push({
      ...row,
      anomaly_score: combinedScore,
      ml_anomaly_score: mlResult.ml_anomaly_score,
      raw_ml_score: mlResult.raw_score,
      suspicious,
    });

    // Save suspicious status and anomaly score in MySQL
    try {
      await pool.execute(
        `
        UPDATE traffic_logs
        SET
          is_suspicious = ?,
          anomaly_score = ?
        WHERE ip_address = ?
          AND timestamp >= NOW() - INTERVAL 5 MINUTE
        `,
        [suspicious ? 1 : 0, combinedScore, row.ip_address],
      );
    } catch (err) {
      console.error(`❌ Failed to update traffic_logs for ${row.ip_address}:`, err);
    }

    console.log(
      `🌲 ML Anomaly Score → IP: ${row.ip_address} | ` +
        `ML Score: ${mlResult.ml_anomaly_score}/100 (Path: ${mlResult.avg_path_length}) | ` +
        `Rule Score: ${ruleScore} | Final Anomaly Score: ${combinedScore} -> ${
          suspicious ? "SUSPICIOUS" : "NORMAL"
        }`,
    );
  }

  return results;
}
