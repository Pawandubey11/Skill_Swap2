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
// APPLY SECURITY ACTION
// ============================================================

export function enforceSecurityAction(
  ip: string,
  action: SecurityAction,
  reason: string = "Security violation",
  durationMs: number = DEFAULT_BLOCK_DURATION,
): void {

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

    return;
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

    return;
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

    return;
  }
}

// ============================================================
// BLOCK IP
// ============================================================

export function enforceBlock(
  ip: string,
  reason: string = "Security violation",
  durationMs: number = DEFAULT_BLOCK_DURATION,
): void {

  const normalizedIP =
    normalizeIP(ip);

  blockIP(
    normalizedIP,
    durationMs,
    reason,
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
// Your server.ts currently imports:
//
// getBlockedIPs
//
// So export it directly.
//

export {
  getBlockedIPs,
};
