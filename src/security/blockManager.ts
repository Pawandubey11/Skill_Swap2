// ============================================================
// BLOCK MANAGER
// ============================================================
//
// Responsible for:
// 1. Normalizing IP addresses
// 2. Persistently blocking IP addresses
// 3. Unblocking IP addresses
// 4. Checking whether an IP is blocked
// 5. Returning currently blocked IPs
// 6. Handling temporary block expiration
//
// Active blocks are stored in MySQL so that blocks survive
// application/container restarts.
//
// ============================================================

import pool from "../lib/db.js";

// ============================================================
// INTERFACE
// ============================================================

export interface BlockedIP {
  ip: string;
  blockedAt: number;
  expiresAt: number | null;
  reason: string;
}

// ============================================================
// NORMALIZE IP
// ============================================================

export function normalizeIP(ip: string): string {
  if (!ip) {
    return "unknown";
  }

  let normalizedIP = String(ip).trim();

  // IPv4-mapped IPv6 ::ffff:192.168.1.10 -> 192.168.1.10
  if (normalizedIP.toLowerCase().startsWith("::ffff:")) {
    normalizedIP = normalizedIP.substring(7);
  }

  // IPv6 localhost
  if (normalizedIP === "::1") {
    return "127.0.0.1";
  }

  // Remove IPv6 zone identifier fe80::1%eth0 -> fe80::1
  const zoneIndex = normalizedIP.indexOf("%");
  if (zoneIndex !== -1) {
    normalizedIP = normalizedIP.substring(0, zoneIndex);
  }

  return normalizedIP || "unknown";
}

// ============================================================
// REMOVE EXPIRED BLOCKS
// ============================================================

export async function removeExpiredBlocks(): Promise<void> {
  try {
    const [result] = await pool.execute(`
      UPDATE blocked_ips
      SET status = 'EXPIRED'
      WHERE status = 'BLOCKED'
        AND expires_at IS NOT NULL
        AND expires_at <= NOW()
    `);

    const affectedRows = (result as any).affectedRows ?? 0;
    if (affectedRows > 0) {
      console.log(`🔓 Expired ${affectedRows} blocked IP(s)`);
    }
  } catch (error) {
    console.error("❌ Failed to remove expired IP blocks:", error);
  }
}

// ============================================================
// BLOCK IP
// ============================================================

export async function blockIP(
  ip: string,
  durationMs: number | null = null,
  reason: string = "Security violation",
  riskScore: number = 0,
): Promise<BlockedIP | null> {
  const normalizedIP = normalizeIP(ip);

  // Validate IP (Loopback protection)
  if (
    normalizedIP === "unknown" ||
    normalizedIP === "127.0.0.1" ||
    normalizedIP === "::1" ||
    normalizedIP === "localhost" ||
    normalizedIP.length === 0
  ) {
    console.warn("⚠️ Cannot block loopback or unknown IP address");
    return null;
  }

  await removeExpiredBlocks();

  const durationSec =
    durationMs !== null
      ? Math.max(60, Math.round(durationMs / 1000))
      : 3600;

  try {
    // Primary: ON DUPLICATE KEY UPDATE with MySQL NOW()
    await pool.execute(
      `
        INSERT INTO blocked_ips (
          ip_address,
          reason,
          risk_score,
          blocked_at,
          expires_at,
          status
        )
        VALUES (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? SECOND), 'BLOCKED')

        ON DUPLICATE KEY UPDATE
          reason = VALUES(reason),
          risk_score = VALUES(risk_score),
          blocked_at = NOW(),
          expires_at = DATE_ADD(NOW(), INTERVAL ? SECOND),
          status = 'BLOCKED'
      `,
      [
        normalizedIP,
        reason,
        Math.max(0, Number(riskScore) || 0),
        durationSec,
        durationSec,
      ],
    );
  } catch (err) {
    console.warn(`⚠️ Primary block insert failed for ${normalizedIP}, running DELETE + INSERT fallback...`, err);
    try {
      await pool.execute(`DELETE FROM blocked_ips WHERE ip_address = ?`, [normalizedIP]);
      await pool.execute(
        `
          INSERT INTO blocked_ips (
            ip_address,
            reason,
            risk_score,
            blocked_at,
            expires_at,
            status
          )
          VALUES (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? SECOND), 'BLOCKED')
        `,
        [
          normalizedIP,
          reason,
          Math.max(0, Number(riskScore) || 0),
          durationSec,
        ],
      );
    } catch (fallbackErr) {
      console.error(`❌ Complete failure to persist IP block for ${normalizedIP}:`, fallbackErr);
      return null;
    }
  }

  const now = Date.now();
  const expiresAt = now + durationSec * 1000;

  const block: BlockedIP = {
    ip: normalizedIP,
    blockedAt: now,
    expiresAt,
    reason,
  };

  console.log("============================================================");
  console.log(`🚫 IP BLOCKED: ${normalizedIP}`);
  console.log(`📝 Reason: ${reason}`);
  console.log(`📊 Risk Score: ${riskScore}`);
  console.log(`⏱️ Duration: ${durationSec} s`);
  console.log(`⏰ Expires: ${new Date(expiresAt).toISOString()}`);
  console.log("============================================================");

  return block;
}

// ============================================================
// UNBLOCK IP
// ============================================================

export async function unblockIP(ip: string): Promise<boolean> {
  const normalizedIP = normalizeIP(ip);

  try {
    const [result] = await pool.execute(
      `
        UPDATE blocked_ips
        SET status = 'UNBLOCKED'
        WHERE ip_address = ?
          AND status = 'BLOCKED'
      `,
      [normalizedIP],
    );

    const affectedRows = (result as any).affectedRows ?? 0;
    if (affectedRows > 0) {
      console.log(`🔓 IP UNBLOCKED: ${normalizedIP}`);
      return true;
    }

    console.log(`ℹ️ IP was not actively blocked: ${normalizedIP}`);
    return false;
  } catch (error) {
    console.error(`❌ Failed to unblock IP ${normalizedIP}:`, error);
    return false;
  }
}

// ============================================================
// CHECK IF IP IS BLOCKED
// ============================================================

export async function isBlocked(ip: string): Promise<boolean> {
  const normalizedIP = normalizeIP(ip);

  if (
    normalizedIP === "unknown" ||
    normalizedIP === "127.0.0.1" ||
    normalizedIP === "::1" ||
    normalizedIP === "localhost"
  ) {
    return false;
  }

  await removeExpiredBlocks();

  try {
    const [rows] = await pool.execute(
      `
        SELECT id
        FROM blocked_ips
        WHERE ip_address = ?
          AND status = 'BLOCKED'
          AND (
            expires_at IS NULL
            OR expires_at > NOW()
          )
      `,
      [normalizedIP],
    );

    return (rows as any[]).length > 0;
  } catch (error) {
    console.error(`❌ Failed to check blocked IP ${normalizedIP}:`, error);
    return false;
  }
}

// ============================================================
// GET BLOCKED IP DETAILS
// ============================================================

export async function getBlockedIP(ip: string): Promise<BlockedIP | null> {
  const normalizedIP = normalizeIP(ip);
  if (normalizedIP === "unknown") return null;

  await removeExpiredBlocks();

  try {
    const [rows] = await pool.execute(
      `
        SELECT
          ip_address,
          reason,
          blocked_at,
          expires_at
        FROM blocked_ips
        WHERE ip_address = ?
          AND status = 'BLOCKED'
          AND (
            expires_at IS NULL
            OR expires_at > NOW()
          )
      `,
      [normalizedIP],
    );

    const resultRows = rows as any[];
    if (resultRows.length === 0) return null;

    const row = resultRows[0];
    return {
      ip: String(row.ip_address),
      blockedAt: new Date(row.blocked_at).getTime(),
      expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : null,
      reason: String(row.reason ?? "Security violation"),
    };
  } catch (error) {
    console.error(`❌ Failed to get blocked IP ${normalizedIP}:`, error);
    return null;
  }
}

// ============================================================
// GET ALL CURRENTLY BLOCKED IPS
// ============================================================

export async function getBlockedIPs(): Promise<BlockedIP[]> {
  await removeExpiredBlocks();

  try {
    const [rows] = await pool.execute(`
      SELECT
        ip_address,
        blocked_at,
        expires_at,
        reason
      FROM blocked_ips
      WHERE status = 'BLOCKED'
        AND (
          expires_at IS NULL
          OR expires_at > NOW()
        )
      ORDER BY blocked_at DESC
    `);

    return (rows as any[]).map((row) => ({
      ip: String(row.ip_address),
      blockedAt: new Date(row.blocked_at).getTime(),
      expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : null,
      reason: String(row.reason ?? "Security violation"),
    }));
  } catch (error) {
    console.error("❌ Failed to get blocked IP list:", error);
    return [];
  }
}

// ============================================================
// GET BLOCKED IP COUNT
// ============================================================

export async function getBlockedIPCount(): Promise<number> {
  const blocked = await getBlockedIPs();
  return blocked.length;
}

export async function hasBlockedIPs(): Promise<boolean> {
  const count = await getBlockedIPCount();
  return count > 0;
}

// ============================================================
// CLEAR ALL BLOCKED IPS
// ============================================================

export async function clearBlockedIPs(): Promise<void> {
  try {
    const [result] = await pool.execute(`
      UPDATE blocked_ips
      SET status = 'UNBLOCKED'
      WHERE status = 'BLOCKED'
    `);
    const affectedRows = (result as any).affectedRows ?? 0;
    console.log(`🧹 Cleared ${affectedRows} blocked IP(s)`);
  } catch (error) {
    console.error("❌ Failed to clear blocked IPs:", error);
  }
}

export interface BlockStatus {
  ip: string;
  blocked: boolean;
  blockedAt: number | null;
  expiresAt: number | null;
  reason: string | null;
}

export async function getBlockStatus(ip: string): Promise<BlockStatus> {
  const entry = await getBlockedIP(ip);
  if (!entry) {
    return {
      ip: normalizeIP(ip),
      blocked: false,
      blockedAt: null,
      expiresAt: null,
      reason: null,
    };
  }

  return {
    ip: entry.ip,
    blocked: true,
    blockedAt: entry.blockedAt,
    expiresAt: entry.expiresAt,
    reason: entry.reason,
  };
}

export interface BlockedIPSummary {
  totalBlocked: number;
  blockedIPs: BlockedIP[];
}

export async function getBlockedIPSummary(): Promise<BlockedIPSummary> {
  const list = await getBlockedIPs();
  return {
    totalBlocked: list.length,
    blockedIPs: list,
  };
}
