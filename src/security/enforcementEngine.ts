// ============================================================
// SECURITY ENFORCEMENT ENGINE
// ============================================================

import {
  blockIP,
  isIPBlocked,
  getBlockedIPs,
  normalizeIP,
} from "./blockManager.js";

// ============================================================
// ENFORCEMENT RESULT
// ============================================================

export interface EnforcementResult {

  ip_address: string;

  action: string;

  status: string;

  message: string;
}

// ============================================================
// ENFORCE SECURITY RESPONSE
// ============================================================

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

  // ----------------------------------------------------------
  // NORMALIZE IP
  // ----------------------------------------------------------

  const normalizedIP =
    normalizeIP(
      ip_address,
    );

  console.log(
    "\n=== ENFORCEMENT ===",
  );

  console.log(
    `IP: ${normalizedIP}`,
  );

  console.log(
    `Risk Level: ${risk_level}`,
  );

  console.log(
    `Risk Score: ${risk_score}`,
  );

  // ==========================================================
  // LOW RISK
  // ==========================================================

  if (
    risk_level ===
    "LOW"
  ) {

    console.log(
      `🟢 MONITOR: ${normalizedIP}`,
    );

    return {

      ip_address:
        normalizedIP,

      action:
        "MONITOR",

      status:
        "ALLOWED",

      message:
        "Traffic is being monitored normally.",
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
      `🟡 ALERT: ${normalizedIP}`,
    );

    return {

      ip_address:
        normalizedIP,

      action:
        "ALERT",

      status:
        "ALLOWED",

      message:
        "Medium risk detected. Traffic remains allowed but is being monitored.",
    };
  }

  // ==========================================================
  // HIGH RISK
  // ==========================================================

  if (
    risk_level ===
    "HIGH"
  ) {

    const entry =
      blockIP(
        normalizedIP,
        `HIGH risk detected with score ${risk_score}`,
      );

    console.log(
      `🚫 HIGH RISK IP BLOCKED: ${normalizedIP}`,
    );

    return {

      ip_address:
        normalizedIP,

      action:
        "BLOCK",

      status:
        "BLOCKED",

      message:
        "High risk traffic detected. IP temporarily blocked.",

    };
  }

  // ==========================================================
  // CRITICAL RISK
  // ==========================================================

  if (
    risk_level ===
    "CRITICAL"
  ) {

    blockIP(
      normalizedIP,
      `CRITICAL risk detected with score ${risk_score}`,
    );

    console.log(
      `🚨 CRITICAL RISK IP BLOCKED: ${normalizedIP}`,
    );

    return {

      ip_address:
        normalizedIP,

      action:
        "BLOCK",

      status:
        "BLOCKED",

      message:
        "Critical risk detected. IP temporarily blocked.",
    };
  }

  // ==========================================================
  // FALLBACK
  // ==========================================================

  console.log(
    `ℹ️ FALLBACK ACTION: ${normalizedIP}`,
  );

  return {

    ip_address:
      normalizedIP,

    action:
      action ||
      "MONITOR",

    status:
      "ALLOWED",

    message:
      message ||
      "Traffic allowed.",
  };
}

// ============================================================
// EXPORT BLOCK MANAGER FUNCTIONS
// ============================================================

export {
  isIPBlocked,
  getBlockedIPs,
  normalizeIP,
};
