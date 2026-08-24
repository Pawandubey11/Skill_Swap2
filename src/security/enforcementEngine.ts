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
// SECURITY ACTION
// ============================================================

export type SecurityAction =
  | "MONITOR"
  | "ALERT"
  | "BLOCK";

// ============================================================
// DEFAULT BLOCK DURATION
// ============================================================

const DEFAULT_BLOCK_DURATION =
  15 * 60 * 1000;

// 15 minutes

// ============================================================
// ENFORCEMENT RESULT
// ============================================================

export interface EnforcementResult {

  ip_address: string;

  action: SecurityAction;

  status:
    | "OPEN"
    | "BLOCKED";

  blocked: boolean;

  message: string;

  reason: string;

  expires_at:
    | string
    | null;
}

// ============================================================
// APPLY SECURITY ACTION
// ============================================================

export function enforceSecurityAction(
  ip: string,
  action: SecurityAction,
  reason: string = "Security violation",
  durationMs: number = DEFAULT_BLOCK_DURATION,
): EnforcementResult {

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

      ip_address:
        normalizedIP,

      action:
        "MONITOR",

      status:
        "OPEN",

      blocked:
        false,

      message:
        `IP ${normalizedIP} is being monitored`,

      reason,

      expires_at:
        null,
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

      ip_address:
        normalizedIP,

      action:
        "ALERT",

      status:
        "OPEN",

      blocked:
        false,

      message:
        `Security alert generated for ${normalizedIP}`,

      reason,

      expires_at:
        null,
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

    const expiresAt =
      new Date(
        Date.now() + durationMs,
      ).toISOString();

    console.log(
      `🚫 BLOCKED: ${normalizedIP}`,
    );

    return {

      ip_address:
        normalizedIP,

      action:
        "BLOCK",

      status:
        "BLOCKED",

      blocked:
        true,

      message:
        `IP ${normalizedIP} has been blocked`,

      reason,

      expires_at:
        expiresAt,
    };
  }

  // ==========================================================
  // FALLBACK
  // ==========================================================

  return {

    ip_address:
      normalizedIP,

    action:
      "MONITOR",

    status:
      "OPEN",

    blocked:
      false,

    message:
      `IP ${normalizedIP} is being monitored`,

    reason,

    expires_at:
      null,
  };
}

// ============================================================
// SECURITY RESPONSE
// ============================================================

export function enforceSecurityResponse(
  response: {
    ip_address: string;

    action:
      | "MONITOR"
      | "ALERT"
      | "BLOCK";

    message?: string;

    risk_score?: number;

    risk_level?: string;
  },
): EnforcementResult {

  return enforceSecurityAction(

    response.ip_address,

    response.action,

    response.message ||
      "Security violation",

    DEFAULT_BLOCK_DURATION,

  );
}

// ============================================================
// BLOCK IP
// ============================================================

export function enforceBlock(
  ip: string,
  reason: string = "Security violation",
  durationMs: number =
    DEFAULT_BLOCK_DURATION,
): EnforcementResult {

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

export async function enforceUnblock(
  ip: string,
): Promise<boolean> {

  const normalizedIP =
    normalizeIP(ip);

  console.log(
    `🔓 UNBLOCK REQUEST: ${normalizedIP}`,
  );

  return await unblockIP(
    normalizedIP,
  );
}

// ============================================================
// CHECK BLOCK STATUS
// ============================================================

export async function isIPBlocked(
  ip: string,
): Promise<boolean> {

  const normalizedIP =
    normalizeIP(ip);

  return await isBlocked(
    normalizedIP,
  );
}

// ============================================================
// GET BLOCKED IPS
// ============================================================

export async function getBlockedIPsList() {

  return await getBlockedIPs();

}

// ============================================================
// BACKWARD COMPATIBILITY
// ============================================================

export {
  getBlockedIPs,
};
