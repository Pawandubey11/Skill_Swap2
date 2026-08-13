// ============================================================
// SECURITY ENFORCEMENT ENGINE
// ============================================================

import {
  blockIP,
  isIPBlocked,
  getBlockedIPs,
  unblockIP,
  normalizeIP,
} from "./blockManager.js";

// ============================================================
// ENFORCEMENT RESULT
// ============================================================

export interface EnforcementResult {
  ip_address: string;
  action:
    | "BLOCK"
    | "ALERT"
    | "MONITOR"
    | "NORMAL";

  status:
    | "BLOCKED"
    | "ALLOWED";

  message: string;

  blocked_at?: number;
  expires_at?: number;
  reason?: string;
}

// ============================================================
// ENFORCE SECURITY RESPONSE
// ============================================================

export function enforceSecurityResponse(
  response: any,
): EnforcementResult {
  const ip_address =
    normalizeIP(
      response.ip_address,
    );

  const risk_level =
    String(
      response.risk_level ||
        "LOW",
    ).toUpperCase();

  const risk_score =
    Number(
      response.risk_score || 0,
    );

  const requestedAction =
    response.action;

  const originalMessage =
    response.message;

  console.log(
    "\n=== ENFORCEMENT ===",
  );

  console.log({
    ip_address,
    risk_level,
    risk_score,
    requested_action:
      requestedAction,
  });

  // ==========================================================
  // CRITICAL RISK
  // ==========================================================

  if (
    risk_level ===
    "CRITICAL"
  ) {
    const blockEntry =
      blockIP(
        ip_address,
        `CRITICAL risk detected with score ${risk_score}`,
      );

    console.log(
      `🚫 ENFORCEMENT: ${ip_address} -> BLOCKED`,
    );

    return {
      ip_address,

      action: "BLOCK",

      status: "BLOCKED",

      message:
        "Critical risk detected. IP temporarily blocked.",

      blocked_at:
        blockEntry.blocked_at,

      expires_at:
        blockEntry.expires_at,

      reason:
        blockEntry.reason,
    };
  }

  // ==========================================================
  // HIGH RISK
  // ==========================================================

  if (
    risk_level ===
    "HIGH"
  ) {
    const blockEntry =
      blockIP(
        ip_address,
        `HIGH risk detected with score ${risk_score}`,
      );

    console.log(
      `🚫 ENFORCEMENT: ${ip_address} -> BLOCKED`,
    );

    return {
      ip_address,

      action: "BLOCK",

      status: "BLOCKED",

      message:
        "High risk traffic detected. IP temporarily blocked.",

      blocked_at:
        blockEntry.blocked_at,

      expires_at:
        blockEntry.expires_at,

      reason:
        blockEntry.reason,
    };
  }

  // ==========================================================
  // MEDIUM RISK
  // ==========================================================

  if (
    risk_level ===
    "MEDIUM"
  ) {
    console.log(
      `🟡 ENFORCEMENT: ${ip_address} -> ALERT`,
    );

    return {
      ip_address,

      action: "ALERT",

      status: "ALLOWED",

      message:
        "Medium risk detected. Traffic remains allowed but is being monitored.",
    };
  }

  // ==========================================================
  // LOW RISK
  // ==========================================================

  if (
    risk_level ===
    "LOW"
  ) {
    console.log(
      `🟢 ENFORCEMENT: ${ip_address} -> MONITOR`,
    );

    return {
      ip_address,

      action: "MONITOR",

      status: "ALLOWED",

      message:
        "Traffic is being monitored normally.",
    };
  }

  // ==========================================================
  // FALLBACK
  // ==========================================================

  console.log(
    `⚪ ENFORCEMENT: ${ip_address} -> MONITOR`,
  );

  return {
    ip_address,

    action:
      requestedAction ===
      "BLOCK"
        ? "BLOCK"
        : requestedAction ===
            "ALERT"
          ? "ALERT"
          : "MONITOR",

    status: "ALLOWED",

    message:
      originalMessage ||
      "Traffic allowed.",
  };
}

// ============================================================
// EXPORT BLOCK MANAGER FUNCTIONS
// ============================================================

export {
  isIPBlocked,
  getBlockedIPs,
  unblockIP,
};
