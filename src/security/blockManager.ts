// ============================================================
// BLOCK MANAGER
// ============================================================
//
// Responsible for:
// 1. Normalizing IP addresses
// 2. Blocking IP addresses
// 3. Unblocking IP addresses
// 4. Checking whether an IP is blocked
// 5. Returning currently blocked IPs
// 6. Handling temporary block expiration
//
// ============================================================

export interface BlockedIP {
  ip: string;
  blockedAt: number;
  expiresAt: number | null;
  reason: string;
}

// ============================================================
// ACTIVE BLOCK LIST
// ============================================================

const blockedIPs = new Map<string, BlockedIP>();

// ============================================================
// NORMALIZE IP
// ============================================================

export function normalizeIP(ip: string): string {
  if (!ip) {
    return "unknown";
  }

  let normalizedIP = String(ip).trim();

  // Remove IPv4-mapped IPv6 prefix
  // ::ffff:192.168.1.10 -> 192.168.1.10
  if (
    normalizedIP
      .toLowerCase()
      .startsWith("::ffff:")
  ) {
    normalizedIP = normalizedIP.substring(7);
  }

  // IPv6 localhost
  // ::1 -> 127.0.0.1
  if (normalizedIP === "::1") {
    return "127.0.0.1";
  }

  // Remove IPv6 zone identifier
  // fe80::1%eth0 -> fe80::1
  const zoneIndex = normalizedIP.indexOf("%");

  if (zoneIndex !== -1) {
    normalizedIP = normalizedIP.substring(
      0,
      zoneIndex,
    );
  }

  return normalizedIP || "unknown";
}

// ============================================================
// REMOVE EXPIRED BLOCKS
// ============================================================

function removeExpiredBlocks(): void {
  const now = Date.now();

  for (const [ip, entry] of blockedIPs.entries()) {

    // Permanent block
    if (entry.expiresAt === null) {
      continue;
    }

    // Temporary block expired
    if (now >= entry.expiresAt) {

      blockedIPs.delete(ip);

      console.log(
        `🔓 IP BLOCK EXPIRED: ${ip}`,
      );
    }
  }
}

// ============================================================
// BLOCK IP
// ============================================================

export function blockIP(
  ip: string,
  durationMs: number | null = null,
  reason: string = "Security violation",
): void {

  const normalizedIP = normalizeIP(ip);

  // ----------------------------------------------------------
  // Validate IP
  // ----------------------------------------------------------

  if (
    normalizedIP === "unknown" ||
    normalizedIP.length === 0
  ) {

    console.warn(
      "⚠️ Cannot block unknown IP address",
    );

    return;
  }

  // ----------------------------------------------------------
  // Remove expired blocks first
  // ----------------------------------------------------------

  removeExpiredBlocks();

  const now = Date.now();

  const expiresAt =
    durationMs !== null
      ? now + Math.max(0, durationMs)
      : null;

  // ----------------------------------------------------------
  // Create / update block
  // ----------------------------------------------------------

  const block: BlockedIP = {
    ip: normalizedIP,
    blockedAt: now,
    expiresAt,
    reason,
  };

  blockedIPs.set(
    normalizedIP,
    block,
  );

  // ----------------------------------------------------------
  // Logging
  // ----------------------------------------------------------

  console.log(
    "============================================================",
  );

  console.log(
    `🚫 IP BLOCKED: ${normalizedIP}`,
  );

  console.log(
    `📝 Reason: ${reason}`,
  );

  if (expiresAt !== null) {

    console.log(
      `⏱️ Duration: ${durationMs} ms`,
    );

    console.log(
      `⏰ Expires: ${new Date(
        expiresAt,
      ).toISOString()}`,
    );

  } else {

    console.log(
      "⛔ Permanent block",
    );
  }

  console.log(
    `📊 Active blocked IPs: ${blockedIPs.size}`,
  );

  console.log(
    "============================================================",
  );
}

// ============================================================
// UNBLOCK IP
// ============================================================

export function unblockIP(
  ip: string,
): boolean {

  const normalizedIP =
    normalizeIP(ip);

  const deleted =
    blockedIPs.delete(
      normalizedIP,
    );

  if (deleted) {

    console.log(
      `🔓 IP UNBLOCKED: ${normalizedIP}`,
    );

  } else {

    console.log(
      `ℹ️ IP was not blocked: ${normalizedIP}`,
    );
  }

  return deleted;
}

// ============================================================
// CHECK IF IP IS BLOCKED
// ============================================================

export function isBlocked(
  ip: string,
): boolean {

  const normalizedIP =
    normalizeIP(ip);

  if (
    normalizedIP === "unknown"
  ) {
    return false;
  }

  const entry =
    blockedIPs.get(
      normalizedIP,
    );

  // IP isn't in block list
  if (!entry) {
    return false;
  }

  // Permanent block
  if (
    entry.expiresAt === null
  ) {
    return true;
  }

  // Temporary block expired
  if (
    Date.now() >= entry.expiresAt
  ) {

    blockedIPs.delete(
      normalizedIP,
    );

    console.log(
      `🔓 IP BLOCK EXPIRED: ${normalizedIP}`,
    );

    return false;
  }

  // Active temporary block
  return true;
}

// ============================================================
// GET BLOCKED IP DETAILS
// ============================================================

export function getBlockedIP(
  ip: string,
): BlockedIP | null {

  const normalizedIP =
    normalizeIP(ip);

  if (
    normalizedIP === "unknown"
  ) {
    return null;
  }

  if (
    !isBlocked(normalizedIP)
  ) {
    return null;
  }

  const entry =
    blockedIPs.get(
      normalizedIP,
    );

  if (!entry) {
    return null;
  }

  return {
    ...entry,
  };
}

// ============================================================
// GET ALL CURRENTLY BLOCKED IPS
// ============================================================

export function getBlockedIPs(): BlockedIP[] {

  removeExpiredBlocks();

  return Array.from(
    blockedIPs.values(),
  ).map(
    (entry) => ({
      ...entry,
    }),
  );
}

// ============================================================
// GET BLOCKED IP COUNT
// ============================================================

export function getBlockedIPCount(): number {

  return getBlockedIPs().length;
}

// ============================================================
// CHECK WHETHER BLOCK LIST IS EMPTY
// ============================================================

export function hasBlockedIPs(): boolean {

  return getBlockedIPCount() > 0;
}

// ============================================================
// CLEAR ALL BLOCKED IPS
// ============================================================

export function clearBlockedIPs(): void {

  const count =
    blockedIPs.size;

  blockedIPs.clear();

  console.log(
    `🧹 Cleared ${count} blocked IP(s)`,
  );
}

// ============================================================
// GET BLOCK INFORMATION
// ============================================================

export function getBlockInfo(
  ip: string,
): {
  blocked: boolean;
  ip: string;
  blockedAt: number | null;
  expiresAt: number | null;
  reason: string | null;
} {

  const normalizedIP =
    normalizeIP(ip);

  const entry =
    getBlockedIP(
      normalizedIP,
    );

  if (!entry) {

    return {
      blocked: false,
      ip: normalizedIP,
      blockedAt: null,
      expiresAt: null,
      reason: null,
    };
  }

  return {
    blocked: true,
    ip: entry.ip,
    blockedAt: entry.blockedAt,
    expiresAt: entry.expiresAt,
    reason: entry.reason,
  };
}

// ============================================================
// SECURITY STATUS
// ============================================================

export function getBlockManagerStatus(): {
  totalBlocked: number;
  blockedIPs: BlockedIP[];
} {

  const currentBlocks =
    getBlockedIPs();

  return {
    totalBlocked:
      currentBlocks.length,

    blockedIPs:
      currentBlocks,
  };
}
