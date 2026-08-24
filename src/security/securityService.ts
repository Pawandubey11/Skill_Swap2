// ============================================================
// AUTOMATIC SECURITY ANALYSIS SERVICE
// ============================================================

import { extractFeatures } from "./featureExtractor.js";
import { detectAnomalies } from "./anomalyDetector.js";
import { calculateRisk } from "./riskScorer.js";
import { generateSecurityResponse } from "./responseEngine.js";
import {
  enforceSecurityResponse,
  EnforcementResult,
} from "./enforcementEngine.js";
import { saveSecurityEvent } from "./securityEventService.js";
import { normalizeIP } from "./blockManager.js";

// ============================================================
// SECURITY ANALYSIS
// ============================================================

export async function runSecurityAnalysis(): Promise<void> {
  console.log(
    "\n============================================================",
  );

  console.log(
    "🔐 AUTOMATIC SECURITY ANALYSIS",
  );

  console.log(
    "============================================================",
  );

  try {
    // ========================================================
    // STEP 1 — EXTRACT TRAFFIC FEATURES
    // ========================================================

    console.log(
      "\n[STEP 1] Extracting traffic features...",
    );

    const features =
      await extractFeatures();

    if (
      !features ||
      features.length === 0
    ) {
      console.log(
        "ℹ️ No traffic found in the last 5 minutes.",
      );

      return;
    }

    console.log(
      `✅ Features extracted: ${features.length}`,
    );

    // ========================================================
    // STEP 2 — DETECT ANOMALIES
    // ========================================================

    console.log(
      "\n[STEP 2] Detecting anomalies...",
    );

    const anomalies =
      await detectAnomalies(
        features,
      );

    if (
      !anomalies ||
      anomalies.length === 0
    ) {
      console.log(
        "ℹ️ No anomalies detected.",
      );

      return;
    }

    console.log(
      `✅ Anomalies analyzed: ${anomalies.length}`,
    );

    // ========================================================
    // STEP 3 — CALCULATE RISK
    // ========================================================

    console.log(
      "\n[STEP 3] Calculating security risk...",
    );

    const risks =
      await calculateRisk(
        anomalies,
      );

    if (
      !Array.isArray(risks)
    ) {
      console.error(
        "❌ Risk scorer did not return an array.",
      );

      console.error(
        "Received:",
        risks,
      );

      return;
    }

    console.log(
      `✅ Risk results generated: ${risks.length}`,
    );

    // ========================================================
    // STEP 4 — GENERATE SECURITY RESPONSE
    // ========================================================

    console.log(
      "\n[STEP 4] Generating security responses...",
    );

    const responses =
      await generateSecurityResponse(
        risks,
      );

    if (
      !Array.isArray(responses)
    ) {
      console.error(
        "❌ Response engine did not return an array.",
      );

      console.error(
        "Received:",
        responses,
      );

      return;
    }

    console.log(
      `✅ Security responses generated: ${responses.length}`,
    );

    // ========================================================
    // STEP 5 — DISPLAY RISK ANALYSIS
    // ========================================================

    console.log(
      "\n============================================================",
    );

    console.log(
      "📊 RISK ANALYSIS",
    );

    console.log(
      "============================================================",
    );

    for (
      const result of risks
    ) {
      console.log({
        ip_address:
          normalizeIP(
            result.ip_address,
          ),

        request_count:
          result.request_count,

        unique_endpoints:
          result.unique_endpoints,

        error_count:
          result.error_count,

        anomaly_score:
          result.anomaly_score,

        suspicious:
          result.suspicious,

        risk_score:
          result.risk_score,

        risk_level:
          result.risk_level,

        reasons:
          result.reasons,
      });
    }

    // ========================================================
    // STEP 6 — DISPLAY SECURITY RESPONSE
    // ========================================================

    console.log(
      "\n============================================================",
    );

    console.log(
      "🛡️ SECURITY RESPONSE",
    );

    console.log(
      "============================================================",
    );

    for (
      const response of responses
    ) {
      console.log({
        ip_address:
          normalizeIP(
            response.ip_address,
          ),

        risk_level:
          response.risk_level,

        risk_score:
          response.risk_score,

        action:
          response.action,

        message:
          response.message,
      });
    }

    // ========================================================
    // STEP 7 — ENFORCEMENT
    // ========================================================

    console.log(
      "\n============================================================",
    );

    console.log(
      "🚨 SECURITY ENFORCEMENT",
    );

    console.log(
      "============================================================",
    );

    const enforcementResults: EnforcementResult[] =
      [];

    // --------------------------------------------------------
    // PROCESS EACH RESPONSE
    // --------------------------------------------------------

    for (
      const response of responses
    ) {
      try {
        // ====================================================
        // NORMALIZE IP
        // ====================================================

        const ip =
          normalizeIP(
            response.ip_address,
          );

        // ====================================================
        // ENFORCE
        // ====================================================

        const enforcement =
          enforceSecurityResponse(
            {
              ...response,
              ip_address: ip,
            },
          );

        enforcementResults.push(
          enforcement,
        );

        // ====================================================
        // DISPLAY ENFORCEMENT RESULT
        // ====================================================

        console.log({
          ip_address:
            enforcement.ip_address,

          action:
            enforcement.action,

          status:
            enforcement.status,

          message:
            enforcement.message,

          expires_at:
            enforcement.expires_at,
        });

        // ====================================================
        // FIND MATCHING RISK BY IP
        // ====================================================

        const risk =
          risks.find(
            (item: any) =>
              normalizeIP(
                item.ip_address,
              ) === ip,
          );

        // ====================================================
        // SAVE SECURITY EVENT
        // ====================================================

        await saveSecurityEvent(
          {
            ip_address: ip,

            event_type:
              risk?.suspicious
                ? "Suspicious Traffic"
                : "Security Risk",

            severity:
              response.risk_level,

            risk_score:
              Number(
                response.risk_score ||
                  0,
              ),

            anomaly_score:
              Number(
                risk?.anomaly_score ||
                  0,
              ),

            action:
              enforcement.action,

            status:
              enforcement.status,

            risk_reasons:
              risk?.reasons ||
              [],

            message:
              enforcement.message,
          },
        );

        console.log(
          `💾 Security event saved: ${ip}`,
        );
      } catch (error) {
        console.error(
          `❌ Failed to process security response for ${response.ip_address}`,
        );

        console.error(
          error,
        );
      }
    }

    console.log(
      `\n✅ Enforcement results generated: ${enforcementResults.length}`,
    );

    // ========================================================
    // STEP 8 — RESPONSE SUMMARY
    // ========================================================

    console.log(
      "\n============================================================",
    );

    console.log(
      "📈 RESPONSE SUMMARY",
    );

    console.log(
      "============================================================",
    );

    // --------------------------------------------------------
    // BLOCK COUNT
    // --------------------------------------------------------

    const blockCount =
      enforcementResults.filter(
        (result) =>
          result.action ===
          "BLOCK",
      ).length;

    // --------------------------------------------------------
    // ALERT COUNT
    // --------------------------------------------------------

    const alertCount =
      enforcementResults.filter(
        (result) =>
          result.action ===
          "ALERT",
      ).length;

    // --------------------------------------------------------
    // MONITOR COUNT
    // --------------------------------------------------------

    const monitorCount =
      enforcementResults.filter(
        (result) =>
          result.action ===
          "MONITOR",
      ).length;

    // --------------------------------------------------------
    // NORMAL COUNT
    // --------------------------------------------------------

    const normalCount = monitorCount;

    // ========================================================
    // SUMMARY
    // ========================================================

    console.log({
      total_ips:
        enforcementResults.length,

      blocked:
        blockCount,

      alerts:
        alertCount,

      monitored:
        monitorCount,

      normal:
        normalCount,
    });

    // ========================================================
    // FINAL STATUS
    // ========================================================

    console.log(
      "\n============================================================",
    );

    console.log(
      "✅ AUTOMATIC SECURITY ANALYSIS COMPLETED",
    );

    console.log(
      "============================================================\n",
    );
  } catch (error) {
    console.error(
      "\n❌ AUTOMATIC SECURITY ANALYSIS ERROR:",
    );

    console.error(
      error,
    );
  }
}
