import pool from "../lib/db.js";
import { extractFeatures } from "./featureExtractor.js";
import { detectAnomalies } from "./anomalyDetector.js";
import { calculateRisk } from "./riskScorer.js";

async function analyzeSecurity() {
  try {
    console.log("\n=== SECURITY ANALYSIS ===\n");

    // Step 1: Extract traffic features
    const features = await extractFeatures();

    if (features.length === 0) {
      console.log("No traffic found in the last 5 minutes.");
      return;
    }

    // Step 2: Detect anomalies
    const anomalies = await detectAnomalies(features);

    // Step 3: Calculate risk
    const risks = await calculateRisk(anomalies);

    // Step 4: Display security analysis
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

    console.log("\n========================\n");
  } catch (error) {
    console.error("Security analysis error:", error);
  } finally {
    await pool.end();
  }
}

analyzeSecurity();
