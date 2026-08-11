import pool from "../lib/db.js";
import { extractFeatures } from "./featureExtractor.js";
import { detectAnomalies } from "./anomalyDetector.js";
import { calculateRisk } from "./riskScorer.js";

export async function runSecurityAnalysis() {
  console.log("\n=== AUTOMATIC SECURITY ANALYSIS ===");

  try {
    const features = await extractFeatures();

    if (features.length === 0) {
      console.log("No traffic found in the last 5 minutes.");
      return;
    }

    const anomalies = await detectAnomalies(features);
    const risks = calculateRisk(anomalies);

    for (const result of risks) {
      // Save risk information into MySQL
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
          result.risk_score,
          result.risk_level,
          result.reasons.join(", "),
          result.ip_address,
        ]
      );

      console.log({
        ip_address: result.ip_address,
        request_count: result.request_count,
        unique_endpoints: result.unique_endpoints,
        error_count: result.error_count,
        anomaly_score: result.anomaly_score,
        suspicious: result.suspicious,
        risk_score: result.risk_score,
        risk_level: result.risk_level,
        reasons: result.reasons,
      });
    }

    console.log("===============================\n");
  } catch (error) {
    console.error("Automatic security analysis error:", error);
  }
}
