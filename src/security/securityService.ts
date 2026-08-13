import { extractFeatures } from "./featureExtractor.js";
import { detectAnomalies } from "./anomalyDetector.js";
import { calculateRisk } from "./riskScorer.js";
import { generateSecurityResponse } from "./responseEngine.js";
import { enforceSecurityResponse } from "./enforcementEngine.js";
import { saveSecurityEvent } from "./securityEventService.js";

export async function runSecurityAnalysis() {
  console.log("\n=== AUTOMATIC SECURITY ANALYSIS ===");

  try {
    // ============================================================
    // STEP 1 — EXTRACT TRAFFIC FEATURES
    // ============================================================

    const features = await extractFeatures();

    if (!features || features.length === 0) {
      console.log("No traffic found in the last 5 minutes.");
      return;
    }

    console.log(`Features extracted: ${features.length}`);

    // ============================================================
    // STEP 2 — DETECT ANOMALIES
    // ============================================================

    const anomalies = await detectAnomalies(features);

    if (!anomalies || anomalies.length === 0) {
      console.log("No anomalies detected.");
      return;
    }

    console.log(`Anomalies analyzed: ${anomalies.length}`);

    // ============================================================
    // STEP 3 — CALCULATE RISK
    // ============================================================

    const risks = await calculateRisk(anomalies);

    if (!Array.isArray(risks)) {
      console.error("❌ Risk scorer did not return an array.");
      console.error("Received:", risks);
      return;
    }

    console.log(`Risk results generated: ${risks.length}`);

    // ============================================================
    // STEP 4 — GENERATE SECURITY RESPONSE
    // ============================================================

    const responses = await generateSecurityResponse(risks);

    if (!Array.isArray(responses)) {
      console.error(
        "❌ Response engine did not return an array.",
      );
      console.error("Received:", responses);
      return;
    }

    console.log(
      `Security responses generated: ${responses.length}`,
    );

    // ============================================================
    // STEP 5 — DISPLAY RISK ANALYSIS
    // ============================================================

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

    // ============================================================
    // STEP 6 — DISPLAY SECURITY RESPONSE
    // ============================================================

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

    // ============================================================
    // STEP 7 — ENFORCEMENT + SECURITY EVENT STORAGE
    // ============================================================

    console.log("\n=== ENFORCEMENT ===");

    const enforcementResults = [];

    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];

      // ----------------------------------------------------------
      // ENFORCEMENT
      // ----------------------------------------------------------

      const enforcement =
        enforceSecurityResponse(response);

      enforcementResults.push(enforcement);

      console.log({
        ip_address: enforcement.ip_address,
        action: enforcement.action,
        status: enforcement.status,
        message: enforcement.message,
      });

      // ----------------------------------------------------------
      // FIND CORRESPONDING RISK RESULT
      // ----------------------------------------------------------

      const risk = risks[i];

      // ----------------------------------------------------------
      // SAVE SECURITY EVENT TO MYSQL
      // ----------------------------------------------------------

      try {
        await saveSecurityEvent({
          ip_address: response.ip_address,

          event_type: risk?.suspicious
            ? "Suspicious Traffic"
            : "Security Risk",

          severity: response.risk_level,

          risk_score: response.risk_score,

          anomaly_score: risk?.anomaly_score,

          action: enforcement.action,

          status: enforcement.status,

          risk_reasons: risk?.reasons || [],

          message: enforcement.message,
        });

        console.log(
          `💾 Security event saved: ${response.ip_address}`,
        );
      } catch (eventError) {
        console.error(
          `❌ Failed to save security event for ${response.ip_address}`,
        );

        console.error(eventError);
      }
    }

    console.log(
      `Enforcement results generated: ${enforcementResults.length}`,
    );

    // ============================================================
    // STEP 8 — RESPONSE SUMMARY
    // ============================================================

    console.log("\n=== RESPONSE SUMMARY ===");

    // IMPORTANT:
    // Count actions from enforcementResults because
    // enforcementEngine converts BLOCK_IP / BLOCK_IP_AND_ALERT
    // into the final action "BLOCK".

    const blockCount = enforcementResults.filter(
      (result) => result.action === "BLOCK",
    ).length;

    const alertCount = enforcementResults.filter(
      (result) => result.action === "ALERT",
    ).length;

    const monitorCount = enforcementResults.filter(
      (result) => result.action === "MONITOR",
    ).length;

    const normalCount = enforcementResults.filter(
      (result) => result.action === "NORMAL",
    ).length;

    console.log({
      total_ips: enforcementResults.length,
      blocked: blockCount,
      alerts: alertCount,
      monitored: monitorCount,
      normal: normalCount,
    });

    console.log("\n===============================\n");

    console.log(
      "✅ Automatic security analysis completed.",
    );
  } catch (error) {
    console.error(
      "❌ Automatic security analysis error:",
      error,
    );
  }
}
