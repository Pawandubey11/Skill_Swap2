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
  action: string;
  message: string;
  risk_score: number;
  risk_level: string;
}

export function generateSecurityResponse(
  risks: RiskResult[],
): SecurityResponse[] {
  const responses: SecurityResponse[] = [];

  for (const risk of risks) {
    let action = "MONITOR";
    let message = "Traffic is normal. Continue monitoring.";

    switch (risk.risk_level) {
      case "LOW":
        action = "MONITOR";
        message = "Low risk traffic detected. No action required.";
        break;

      case "MEDIUM":
        action = "ALERT";
        message =
          "Medium risk traffic detected. Security monitoring is required.";
        break;

      case "HIGH":
        action = "BLOCK_IP";
        message =
          "High risk traffic detected. IP should be blocked and investigated.";
        break;

      case "CRITICAL":
        action = "BLOCK_IP_AND_ALERT";
        message =
          "Critical security threat detected. IP should be blocked immediately and security team alerted.";
        break;

      default:
        action = "MONITOR";
        message = "Unknown risk level. Continue monitoring.";
        break;
    }

    responses.push({
      ip_address: risk.ip_address,
      action,
      message,
      risk_score: risk.risk_score,
      risk_level: risk.risk_level,
    });
  }

  return responses;
}
