// ============================================================
// RESPONSE ENGINE
// ============================================================
//
// Responsible for:
// 1. Converting risk analysis into a security action
// 2. Determining MONITOR / ALERT / BLOCK
// 3. Generating a security message
// 4. Providing a consistent response to the enforcement layer
//
// Risk policy:
//
// LOW       -> MONITOR
// MEDIUM    -> ALERT
// HIGH      -> BLOCK
// CRITICAL  -> BLOCK
//
// IMPORTANT:
// responseEngine does NOT directly block the IP.
//
// It generates the security decision.
// enforcementEngine is responsible for actually blocking.
//
// ============================================================

export interface RiskResult {
  ip_address: string;

  request_count: number;

  unique_endpoints: number;

  error_count: number;

  anomaly_score: number;

  suspicious: boolean;

  risk_score: number;

  risk_level: string;

  reasons: string[];
}


// ============================================================
// SECURITY RESPONSE
// ============================================================

export interface SecurityResponse {

  ip_address: string;

  action:
    | "MONITOR"
    | "ALERT"
    | "BLOCK";

  message: string;

  risk_score: number;

  risk_level: string;

}


// ============================================================
// RISK LEVEL NORMALIZATION
// ============================================================

function normalizeRiskLevel(
  riskLevel: string,
): string {

  return String(
    riskLevel || "",
  )
    .trim()
    .toUpperCase();
}


// ============================================================
// GENERATE SECURITY RESPONSE
// ============================================================
//
// Converts RiskResult[] into SecurityResponse[]
//
// This function does NOT directly block an IP.
//
// The returned action is consumed by the security service
// and enforcement engine.
//
// ============================================================

export function generateSecurityResponse(
  risks: RiskResult[],
): SecurityResponse[] {

  const responses: SecurityResponse[] = [];


  // ==========================================================
  // PROCESS EVERY RISK RESULT
  // ==========================================================

  for (const risk of risks) {

    const riskScore =
      Number(
        risk.risk_score || 0,
      );


    const riskLevel =
      normalizeRiskLevel(
        risk.risk_level,
      );


    let action:
      | "MONITOR"
      | "ALERT"
      | "BLOCK" =
      "MONITOR";


    let message =
      "Traffic is normal. Continue monitoring.";


    // ========================================================
    // LOW RISK
    // ========================================================

    if (
      riskLevel === "LOW"
    ) {

      action =
        "MONITOR";

      message =
        "Low risk traffic detected. No action required.";
    }


    // ========================================================
    // MEDIUM RISK
    // ========================================================

    else if (
      riskLevel === "MEDIUM"
    ) {

      action =
        "ALERT";

      message =
        "Medium risk traffic detected. Security monitoring is required.";
    }


    // ========================================================
    // HIGH RISK
    // ========================================================

    else if (
      riskLevel === "HIGH"
    ) {

      action =
        "BLOCK";

      message =
        "High risk traffic detected. IP has been blocked and requires investigation.";
    }


    // ========================================================
    // CRITICAL RISK
    // ========================================================

    else if (
      riskLevel === "CRITICAL"
    ) {

      action =
        "BLOCK";

      message =
        "Critical security threat detected. IP has been blocked immediately.";
    }


    // ========================================================
    // UNKNOWN RISK
    // ========================================================

    else {

      // ------------------------------------------------------
      // Safety fallback
      // ------------------------------------------------------

      action =
        "MONITOR";

      message =
        "Unknown risk level detected. Continue monitoring.";
    }


    // ========================================================
    // ADD RESPONSE
    // ========================================================

    responses.push({

      ip_address:
        risk.ip_address,

      action,

      message,

      risk_score:
        riskScore,

      risk_level:
        riskLevel,

    });
  }


  // ==========================================================
  // RETURN SECURITY RESPONSES
  // ==========================================================

  return responses;
}
