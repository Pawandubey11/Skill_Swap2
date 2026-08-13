// ============================================================
// IP BLOCK MANAGER
// ============================================================

export interface BlockEntry {
  ip_address: string;
  blocked_at: number;
  expires_at: number;
  reason: string;
}

// ============================================================
// BLOCK CONFIGURATION
// ============================================================

// 10 minutes
const BLOCK_DURATION_MS = 10 * 60 * 1000;

// ============================================================
// IN-MEMORY BLOCK STORE
// ============================================================

const blockedIPs = new Map<string, BlockEntry>();

// ============================================================
// NORMALIZE IP
// ============================================================

export function normalizeIP(
  ip_address: string,
): string {
  let ip = String(ip_address || "").trim();

  // Handle x-forwarded-for with multiple IPs
  if (ip.includes(",")) {
    ip = ip.split(",")[0].trim();
  }

  // Remove IPv6 mapped IPv4 prefix
  if (ip.startsWith("::ffff:")) {
    ip = ip.substring(7);
  }

  // Handle localhost IPv6
  if (ip === "::1") {
    ip = "127.0.0.1";
  }

  return ip;
}

// ============================================================
// BLOCK IP
// ============================================================

export function blockIP(
  ip_address: string,
  reason: string,
): BlockEntry {
  const ip = normalizeIP(ip_address);

  const now = Date.now();

  // ----------------------------------------------------------
  // CHECK IF ALREADY BLOCKED
  // ----------------------------------------------------------

  const existing = blockedIPs.get(ip);

  if (
    existing &&
    now < existing.expires_at
  ) {
    console.log(
      `⚠️ IP already blocked: ${ip}`,
    );

    return existing;
  }

  // ----------------------------------------------------------
  // CREATE NEW BLOCK
  // ----------------------------------------------------------

  const entry: BlockEntry = {
    ip_address: ip,
    blocked_at: now,
    expires_at:
      now + BLOCK_DURATION_MS,
    reason,
  };

  blockedIPs.set(
    ip,
    entry,
  );

  console.log(
    `🚫 IP BLOCKED: ${ip} | Duration: 10 minutes | Reason: ${reason}`,
  );

  console.log(
    `📊 Current blocked IP count: ${blockedIPs.size}`,
  );

  return entry;
}

// ============================================================
// CHECK IP BLOCK STATUS
// ============================================================

export function isIPBlocked(
  ip_address: string,
): boolean {
  const ip = normalizeIP(ip_address);

  const entry =
    blockedIPs.get(ip);

  // No block
  if (!entry) {
    return false;
  }

  // ----------------------------------------------------------
  // BLOCK EXPIRED
  // ----------------------------------------------------------

  if (
    Date.now() >=
    entry.expires_at
  ) {
    blockedIPs.delete(ip);

    console.log(
      `✅ IP block expired: ${ip}`,
    );

    return false;
  }

  // ----------------------------------------------------------
  // STILL BLOCKED
  // ----------------------------------------------------------

  return true;
}

// ============================================================
// GET SINGLE BLOCK ENTRY
// ============================================================

export function getBlockEntry(
  ip_address: string,
): BlockEntry | null {
  const ip = normalizeIP(ip_address);

  // First remove expired entry
  if (!isIPBlocked(ip)) {
    return null;
  }

  return (
    blockedIPs.get(ip) ||
    null
  );
}

// ============================================================
// UNBLOCK IP
// ============================================================

export function unblockIP(
  ip_address: string,
): boolean {
  const ip = normalizeIP(ip_address);

  const deleted =
    blockedIPs.delete(ip);

  if (deleted) {
    console.log(
      `✅ IP manually unblocked: ${ip}`,
    );
  }

  return deleted;
}

// ============================================================
// CLEAN EXPIRED BLOCKS
// ============================================================

export function cleanupExpiredBlocks(): void {
  const now = Date.now();

  for (
    const [ip, entry]
    of blockedIPs.entries()
  ) {
    if (
      now >= entry.expires_at
    ) {
      blockedIPs.delete(ip);

      console.log(
        `🧹 Removed expired IP block: ${ip}`,
      );
    }
  }
}

// ============================================================
// GET ALL BLOCKED IPS
// ============================================================

export function getBlockedIPs(): BlockEntry[] {
  cleanupExpiredBlocks();

  return Array.from(
    blockedIPs.values(),
  );
}

// ============================================================
// GET BLOCK COUNT
// ============================================================

export function getBlockedIPCount(): number {
  cleanupExpiredBlocks();

  return blockedIPs.size;
}

// ============================================================
// CLEAR ALL BLOCKS
// ============================================================

export function clearAllBlocks(): void {
  blockedIPs.clear();

  console.log(
    "🧹 All IP blocks cleared.",
  );
}

// ============================================================
// AUTOMATIC CLEANUP
// ============================================================

// Clean expired entries every 1 minute.

setInterval(
  () => {
    cleanupExpiredBlocks();
  },
  60 * 1000,
);
