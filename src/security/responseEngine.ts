// ============================================================
// RESPONSE ENGINE
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

export interface SecurityResponse {
  ip_address: string;
  action: "MONITOR" | "ALERT" | "BLOCK";
  message: string;
  risk_score: number;
  risk_level: string;
}

function normalizeRiskLevel(riskLevel: string): string {
  return String(riskLevel || "").trim().toUpperCase();
}

export function generateSecurityResponse(risks: RiskResult[]): SecurityResponse[] {
  const responses: SecurityResponse[] = [];

  for (const risk of risks) {
    const riskScore = Number(risk.risk_score || 0);
    const anomalyScore = Number(risk.anomaly_score || 0);
    const riskLevel = normalizeRiskLevel(risk.risk_level);

    let action: "MONITOR" | "ALERT" | "BLOCK" = "MONITOR";
    let message = "Traffic is normal. Continue monitoring.";

    // LOW RISK
    if (riskLevel === "LOW") {
      action = "MONITOR";
      message = "Low risk traffic detected. No action required.";
    }
    // MEDIUM RISK
    else if (riskLevel === "MEDIUM") {
      if (riskScore >= 50 || anomalyScore >= 50) {
        action = "BLOCK";
        message = "Medium-high security threat detected with high anomaly score. IP has been blocked.";
      } else {
        action = "ALERT";
        message = "Medium risk traffic detected. Security monitoring is required.";
      }
    }
    // HIGH RISK
    else if (riskLevel === "HIGH") {
      action = "BLOCK";
      message = "High risk traffic detected. IP has been blocked and requires investigation.";
    }
    // CRITICAL RISK
    else if (riskLevel === "CRITICAL") {
      action = "BLOCK";
      message = "Critical security threat detected. IP has been blocked immediately.";
    }
    // UNKNOWN FALLBACK
    else {
      if (anomalyScore >= 50) {
        action = "BLOCK";
        message = "Suspicious traffic detected with high anomaly score. IP has been blocked.";
      } else {
        action = "MONITOR";
        message = "Unknown risk level detected. Continue monitoring.";
      }
    }

    responses.push({
      ip_address: risk.ip_address,
      action,
      message,
      risk_score: riskScore,
      risk_level: riskLevel,
    });
  }

  return responses;
}
