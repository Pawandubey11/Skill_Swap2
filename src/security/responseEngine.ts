import type { RiskResult } from "./riskScorer.js";

export interface SecurityResponse {
  ip_address: string;
  action: "ALLOW" | "MONITOR" | "ALERT" | "BLOCK";
  message: string;
}

export function generateSecurityResponse(
  risks: RiskResult[],
): SecurityResponse[] {
  const responses: SecurityResponse[] = [];

  for (const result of risks) {
    let action: SecurityResponse["action"];
    let message: string;

    if (result.risk_level === "CRITICAL") {
      action = "BLOCK";
      message = `Critical security threat detected from ${result.ip_address}`;
    } else if (result.risk_level === "HIGH") {
      action = "ALERT";
      message = `High-risk traffic detected from ${result.ip_address}`;
    } else if (result.risk_level === "MEDIUM") {
      action = "MONITOR";
      message = `Medium-risk traffic detected from ${result.ip_address}`;
    } else {
      action = "ALLOW";
      message = `Normal traffic from ${result.ip_address}`;
    }

    responses.push({
      ip_address: result.ip_address,
      action,
      message,
    });

    console.log(
      `🛡️ Security Response: ${result.ip_address} -> ${action}`,
    );
  }

  return responses;
}
