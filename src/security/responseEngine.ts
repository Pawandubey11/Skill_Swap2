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

export function generateSecurityResponse(
  risks: RiskResult[],
): SecurityResponse[] {

  const responses: SecurityResponse[] = [];

  for (const risk of risks) {

    let action:
      | "MONITOR"
      | "ALERT"
      | "BLOCK" = "MONITOR";

    let message =
      "Traffic is normal. Continue monitoring.";

    switch (risk.risk_level) {

      // ======================================================
      // LOW RISK
      // ======================================================

      case "LOW":

        action = "MONITOR";

        message =
          "Low risk traffic detected. No action required.";

        break;


      // ======================================================
      // MEDIUM RISK
      // ======================================================

      case "MEDIUM":

        action = "ALERT";

        message =
          "Medium risk traffic detected. Security monitoring is required.";

        break;


      // ======================================================
      // HIGH RISK
      // ======================================================

      case "HIGH":

        action = "BLOCK";

        message =
          "High risk traffic detected. IP has been blocked and requires investigation.";

        break;


      // ======================================================
      // CRITICAL RISK
      // ======================================================

      case "CRITICAL":

        action = "BLOCK";

        message =
          "Critical security threat detected. IP has been blocked immediately.";

        break;


      // ======================================================
      // UNKNOWN RISK
      // ======================================================

      default:

        action = "MONITOR";

        message =
          "Unknown risk level. Continue monitoring.";

        break;
    }

    // ========================================================
    // CREATE SECURITY RESPONSE
    // ========================================================

    responses.push({

      ip_address:
        risk.ip_address,

      action,

      message,

      risk_score:
        Number(risk.risk_score || 0),

      risk_level:
        risk.risk_level,

    });
  }

  return responses;
}
