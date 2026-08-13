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

    // Step 3: Calculate risk
    const risks = calculateRisk(anomalies);

    // Safety check
    if (!Array.isArray(risks)) {
      console.error("Risk scorer did not return an array.");
      console.error("Received:", risks);
      return;
    }

    // Step 4: Generate security response
    const responses = generateSecurityResponse(risks);

    // Step 5: Display risk analysis
    console.log("\n=== RISK ANALYSIS ===");

    for (const result of risks) {
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

    // Step 6: Display security response
    console.log("\n=== SECURITY RESPONSE ===");

    for (const response of responses) {
      console.log({
        ip_address: response.ip_address,
        risk_level: response.risk_level,
        risk_score: response.risk_score,
        action: response.action,
        message: response.message,
      });
    }

    console.log("\n===============================\n");
  } catch (error) {
    console.error("Automatic security analysis error:", error);
  }
}
