import pool from "../lib/db.js";
import { extractFeatures } from "./featureExtractor.js";
import { detectAnomalies } from "./anomalyDetector.js";
import { calculateRisk } from "./riskScorer.js";
import { generateSecurityResponse } from "./responseEngine.js";

export async function runSecurityAnalysis() {
  console.log("\n=== AUTOMATIC SECURITY ANALYSIS ===");

  try {
    // Step 1: Extract traffic features
    const features = await extractFeatures();

    if (features.length === 0) {
      console.log("No traffic found in the last 5 minutes.");
      return;
    }

    // Step 2: Detect anomalies
    const anomalies = await detectAnomalies(features);

    if (!Array.isArray(anomalies)) {
      console.error("Anomaly detector did not return an array.");
      return;
    }

    // Step 3: Calculate risk
    const risks = calculateRisk(anomalies);

    if (!Array.isArray(risks)) {
      console.error("Risk scorer did not return an array.");
      return;
    }

    // Step 4: Save risk information to MySQL
    for (const result of risks) {
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
          JSON.stringify(result.reasons),
          result.ip_address,
        ]
      );

      console.log(
        `Risk updated: ${result.ip_address} -> ${result.risk_level} | Risk Score: ${result.risk_score}`
      );
    }

    // Step 5: Generate security response
    const responses = generateSecurityResponse(risks);

    if (!Array.isArray(responses)) {
      console.error("Security response engine did not return an array.");
      return;
    }

    // Step 6: Display complete security analysis
    console.log("\n=== SECURITY ANALYSIS RESULTS ===");

    for (const result of risks) {
      console.log({
        ip_address: result.ip_address,
        request_count: result.request_count,
        unique_endpoints: result.unique_endpoints,
        unique_methods: result.unique_methods,
        error_count: result.error_count,
        avg_response_time: result.avg_response_time,
        max_response_time: result.max_response_time,
        anomaly_score: result.anomaly_score,
        suspicious: result.suspicious,
        risk_score: result.risk_score,
        risk_level: result.risk_level,
        reasons: result.reasons,
      });
    }

    // Step 7: Display response actions
    console.log("\n=== SECURITY RESPONSE ===");

    for (const response of responses) {
      console.log({
        ip_address: response.ip_address,
        action: response.action,
        message: response.message,
      });
    }

    console.log("===============================\n");
  } catch (error) {
    console.error("Automatic security analysis error:", error);
  }
}
