// ============================================================
// ENFORCEMENT ENGINE
// ============================================================
//
// Responsible for applying security actions:
//
// MONITOR
// ALERT
// BLOCK
//
// ============================================================

import {
  normalizeIP,
  blockIP,
  unblockIP,
  isBlocked,
  getBlockedIPs,
} from "./blockManager.js";

// ============================================================
// SECURITY ACTION TYPES
// ============================================================

export type SecurityAction =
  | "MONITOR"
  | "ALERT"
  | "BLOCK";

// ============================================================
// BLOCK CONFIGURATION
// ============================================================

const DEFAULT_BLOCK_DURATION =
  15 * 60 * 1000;

// 15 minutes

// ============================================================
// SECURITY ENFORCEMENT RESULT
// ============================================================

export interface SecurityEnforcementResult {
  ip: string;
  action: SecurityAction;
  blocked: boolean;
  message: string;
  reason: string;
}

// ============================================================
// APPLY SECURITY ACTION
// ============================================================

export function enforceSecurityAction(
  ip: string,
  action: SecurityAction,
  reason: string = "Security violation",
  durationMs: number = DEFAULT_BLOCK_DURATION,
): SecurityEnforcementResult {

  const normalizedIP =
    normalizeIP(ip);

  console.log(
    `🛡️ ENFORCEMENT: ${action} → ${normalizedIP}`,
  );

  // ==========================================================
  // MONITOR
  // ==========================================================

  if (
    action === "MONITOR"
  ) {

    console.log(
      `👁️ MONITOR: ${normalizedIP}`,
    );

    return {

      ip:
        normalizedIP,

      action:
        "MONITOR",

      blocked:
        false,

      message:
        `IP ${normalizedIP} is being monitored`,

      reason,
    };
  }

  // ==========================================================
  // ALERT
  // ==========================================================

  if (
    action === "ALERT"
  ) {

    console.log(
      `⚠️ ALERT: ${normalizedIP}`,
    );

    console.log(
      `📝 Reason: ${reason}`,
    );

    return {

      ip:
        normalizedIP,

      action:
        "ALERT",

      blocked:
        false,

      message:
        `Security alert generated for ${normalizedIP}`,

      reason,
    };
  }

  // ==========================================================
  // BLOCK
  // ==========================================================

  if (
    action === "BLOCK"
  ) {

    blockIP(
      normalizedIP,
      durationMs,
      reason,
    );

    console.log(
      `🚫 BLOCKED: ${normalizedIP}`,
    );

    return {

      ip:
        normalizedIP,

      action:
        "BLOCK",

      blocked:
        true,

      message:
        `IP ${normalizedIP} has been blocked`,

      reason,
    };
  }

  // ==========================================================
  // FALLBACK
  // ==========================================================

  return {

    ip:
      normalizedIP,

    action:
      "MONITOR",

    blocked:
      false,

    message:
      `IP ${normalizedIP} is being monitored`,

    reason,
  };
}

// ============================================================
// SECURITY RESPONSE
// ============================================================
//
// IMPORTANT:
//
// securityService.ts is currently importing:
//
// enforceSecurityResponse
//
// Therefore this function MUST exist and be exported.
//
// ============================================================

export function enforceSecurityResponse(
  ip: string,
  action: SecurityAction,
  reason: string = "Security violation",
  durationMs: number = DEFAULT_BLOCK_DURATION,
): SecurityEnforcementResult {

  return enforceSecurityAction(
    ip,
    action,
    reason,
    durationMs,
  );
}

// ============================================================
// BLOCK IP
// ============================================================

export function enforceBlock(
  ip: string,
  reason: string = "Security violation",
  durationMs: number = DEFAULT_BLOCK_DURATION,
): SecurityEnforcementResult {

  return enforceSecurityAction(
    ip,
    "BLOCK",
    reason,
    durationMs,
  );
}

// ============================================================
// UNBLOCK IP
// ============================================================

export function enforceUnblock(
  ip: string,
): boolean {

  const normalizedIP =
    normalizeIP(ip);

  console.log(
    `🔓 UNBLOCK REQUEST: ${normalizedIP}`,
  );

  return unblockIP(
    normalizedIP,
  );
}

// ============================================================
// CHECK BLOCK STATUS
// ============================================================

export function isIPBlocked(
  ip: string,
): boolean {

  const normalizedIP =
    normalizeIP(ip);

  return isBlocked(
    normalizedIP,
  );
}

// ============================================================
// GET BLOCKED IPS
// ============================================================

export function getBlockedIPsList() {

  return getBlockedIPs();
}

// ============================================================
// BACKWARD COMPATIBILITY
// ============================================================
//
// server.ts currently imports:
//
// getBlockedIPs
//
// Therefore export it directly.
//
// ============================================================

export {
  getBlockedIPs,
};
