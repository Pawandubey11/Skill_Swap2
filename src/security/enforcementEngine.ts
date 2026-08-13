import {
  blockIP,
  isIPBlocked,
  getBlockedIPs,
} from "./blockManager.js";

export interface EnforcementResult {
  ip_address: string;
  action: string;
  status: string;
  message: string;
}

export function enforceSecurityResponse(
  response: any,
): EnforcementResult {
  const {
    ip_address,
    risk_level,
    risk_score,
    action,
    message,
  } = response;

  console.log("\n=== ENFORCEMENT ===");

  // ============================================================
  // LOW RISK
  // ============================================================

  if (risk_level === "LOW") {
    console.log(`🟢 MONITOR: ${ip_address}`);

    return {
      ip_address,
      action: "MONITOR",
      status: "ALLOWED",
      message: "Traffic is being monitored normally.",
    };
  }

  // ============================================================
  // MEDIUM RISK
  // ============================================================

  if (risk_level === "MEDIUM") {
    console.log(`🟡 ALERT: ${ip_address}`);

    return {
      ip_address,
      action: "ALERT",
      status: "ALLOWED",
      message:
        "Medium risk detected. Traffic remains allowed but is being monitored.",
    };
  }

  // ============================================================
  // HIGH RISK
  // ============================================================

  if (risk_level === "HIGH") {
    blockIP(
      ip_address,
      `HIGH risk detected with score ${risk_score}`,
    );

    return {
      ip_address,
      action: "BLOCK",
      status: "BLOCKED",
      message:
        "High risk traffic detected. IP temporarily blocked.",
    };
  }

  // ============================================================
  // CRITICAL RISK
  // ============================================================

  if (risk_level === "CRITICAL") {
    blockIP(
      ip_address,
      `CRITICAL risk detected with score ${risk_score}`,
    );

    return {
      ip_address,
      action: "BLOCK",
      status: "BLOCKED",
      message:
        "Critical risk detected. IP temporarily blocked.",
    };
  }

  // ============================================================
  // FALLBACK
  // ============================================================

  return {
    ip_address,
    action: action || "MONITOR",
    status: "ALLOWED",
    message: message || "Traffic allowed.",
  };
}

export {
  isIPBlocked,
  getBlockedIPs,
};
