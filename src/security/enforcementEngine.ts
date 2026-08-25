// ============================================================
// ENFORCEMENT ENGINE
// ============================================================

import {
  blockIP,
  unblockIP,
  isBlocked,
  getBlockedIPs,
} from "./blockManager.js";

import { normalizeIP } from "./blockManager.js";

// ============================================================
// BLOCK DURATION (DEFAULT: 1 HOUR)
// ============================================================

export const DEFAULT_BLOCK_DURATION = 60 * 60 * 1000;

// ============================================================
// TYPES
// ============================================================

export type SecurityAction = "MONITOR" | "ALERT" | "BLOCK";

export interface EnforcementResult {
  ip_address: string;
  action: SecurityAction;
  status: "OPEN" | "INVESTIGATING" | "RESOLVED" | "BLOCKED";
  blocked: boolean;
  message: string;
  reason?: string;
  expires_at?: string | null;
}

// ============================================================
// APPLY SECURITY ACTION
// ============================================================

export async function enforceSecurityAction(
  ip: string,
  action: SecurityAction,
  reason: string = "Security violation",
  durationMs: number = DEFAULT_BLOCK_DURATION,
  riskScore: number = 0,
): Promise<EnforcementResult> {
  const normalizedIP = normalizeIP(ip);

  console.log(`🛡️ ENFORCEMENT: ${action} → ${normalizedIP}`);

  // ==========================================================
  // MONITOR
  // ==========================================================

  if (action === "MONITOR") {
    console.log(`👁️ MONITOR: ${normalizedIP}`);

    return {
      ip_address: normalizedIP,
      action: "MONITOR",
      status: "OPEN",
      blocked: false,
      message: `IP ${normalizedIP} is being monitored`,
      reason,
      expires_at: null,
    };
  }

  // ==========================================================
  // ALERT
  // ==========================================================

  if (action === "ALERT") {
    console.log(`⚠️ ALERT: ${normalizedIP}`);

    return {
      ip_address: normalizedIP,
      action: "ALERT",
      status: "INVESTIGATING",
      blocked: false,
      message: `Security alert issued for ${normalizedIP}`,
      reason,
      expires_at: null,
    };
  }

  // ==========================================================
  // BLOCK
  // ==========================================================

  if (action === "BLOCK") {
    await blockIP(normalizedIP, durationMs, reason, riskScore);

    const expiresAt = new Date(Date.now() + durationMs).toISOString();

    console.log(`🚫 BLOCKED: ${normalizedIP}`);

    return {
      ip_address: normalizedIP,
      action: "BLOCK",
      status: "BLOCKED",
      blocked: true,
      message: `IP ${normalizedIP} has been blocked`,
      reason,
      expires_at: expiresAt,
    };
  }

  // ==========================================================
  // FALLBACK
  // ==========================================================

  return {
    ip_address: normalizedIP,
    action: "MONITOR",
    status: "OPEN",
    blocked: false,
    message: `IP ${normalizedIP} is being monitored`,
    reason,
    expires_at: null,
  };
}

// ============================================================
// SECURITY RESPONSE
// ============================================================

export async function enforceSecurityResponse(
  response: {
    ip_address: string;
    action: "MONITOR" | "ALERT" | "BLOCK";
    message?: string;
    risk_score?: number;
    risk_level?: string;
  },
): Promise<EnforcementResult> {
  return await enforceSecurityAction(
    response.ip_address,
    response.action,
    response.message || "Security violation",
    DEFAULT_BLOCK_DURATION,
    response.risk_score || 0,
  );
}

// ============================================================
// BLOCK IP
// ============================================================

export async function enforceBlock(
  ip: string,
  reason: string = "Security violation",
  durationMs: number = DEFAULT_BLOCK_DURATION,
  riskScore: number = 0,
): Promise<EnforcementResult> {
  return await enforceSecurityAction(
    ip,
    "BLOCK",
    reason,
    durationMs,
    riskScore,
  );
}

// ============================================================
// UNBLOCK IP
// ============================================================

export async function enforceUnblock(ip: string): Promise<boolean> {
  const normalizedIP = normalizeIP(ip);
  console.log(`🔓 UNBLOCK REQUEST: ${normalizedIP}`);
  return await unblockIP(normalizedIP);
}

// ============================================================
// CHECK BLOCK STATUS
// ============================================================

export async function isIPBlocked(ip: string): Promise<boolean> {
  const normalizedIP = normalizeIP(ip);
  return await isBlocked(normalizedIP);
}

// ============================================================
// GET BLOCKED IPS
// ============================================================

export async function getBlockedIPsList() {
  return await getBlockedIPs();
}

export { getBlockedIPs };
