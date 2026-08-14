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
// IN-MEMORY BLOCK LIST
// ============================================================

const blockedIPs = new Map<string, BlockEntry>();

// ============================================================
// BLOCK DURATION
// 10 minutes
// ============================================================

const BLOCK_DURATION_MS =
  10 * 60 * 1000;

// ============================================================
// NORMALIZE IP ADDRESS
// ============================================================

export function normalizeIP(
  ip_address: string,
): string {

  if (!ip_address) {
    return "unknown";
  }

  let ip =
    ip_address.trim();

  // ----------------------------------------------------------
  // IPv6 mapped IPv4
  // Example:
  // ::ffff:172.17.0.1
  // becomes:
  // 172.17.0.1
  // ----------------------------------------------------------

  if (
    ip.startsWith("::ffff:")
  ) {
    ip =
      ip.substring(7);
  }

  // ----------------------------------------------------------
  // IPv6 localhost
  // ----------------------------------------------------------

  if (
    ip === "::1"
  ) {
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

  const ip =
    normalizeIP(ip_address);

  const now =
    Date.now();

  const entry: BlockEntry = {

    ip_address: ip,

    blocked_at:
      now,

    expires_at:
      now +
      BLOCK_DURATION_MS,

    reason,
  };

  blockedIPs.set(
    ip,
    entry,
  );

  console.log(
    `🚫 IP BLOCKED: ${ip} | Duration: 10 minutes | Reason: ${reason}`,
  );

  return entry;
}

// ============================================================
// CHECK WHETHER IP IS BLOCKED
// ============================================================

export function isIPBlocked(
  ip_address: string,
): boolean {

  const ip =
    normalizeIP(ip_address);

  const entry =
    blockedIPs.get(ip);

  // ----------------------------------------------------------
  // IP NOT FOUND
  // ----------------------------------------------------------

  if (!entry) {
    return false;
  }

  // ----------------------------------------------------------
  // CHECK EXPIRATION
  // ----------------------------------------------------------

  if (
    Date.now() >=
    entry.expires_at
  ) {

    blockedIPs.delete(
      ip,
    );

    console.log(
      `✅ IP block expired: ${ip}`,
    );

    return false;
  }

  // ----------------------------------------------------------
  // IP STILL BLOCKED
  // ----------------------------------------------------------

  return true;
}

// ============================================================
// UNBLOCK IP
// ============================================================

export function unblockIP(
  ip_address: string,
): boolean {

  const ip =
    normalizeIP(ip_address);

  const removed =
    blockedIPs.delete(ip);

  if (removed) {

    console.log(
      `🔓 IP manually unblocked: ${ip}`,
    );
  }

  return removed;
}

// ============================================================
// GET ALL BLOCKED IPS
// ============================================================

export function getBlockedIPs(): BlockEntry[] {

  const now =
    Date.now();

  // ----------------------------------------------------------
  // REMOVE EXPIRED ENTRIES
  // ----------------------------------------------------------

  for (
    const [
      ip,
      entry,
    ]
    of blockedIPs.entries()
  ) {

    if (
      now >=
      entry.expires_at
    ) {

      blockedIPs.delete(
        ip,
      );

      console.log(
        `✅ IP block expired: ${ip}`,
      );
    }
  }

  // ----------------------------------------------------------
  // RETURN ACTIVE BLOCKS
  // ----------------------------------------------------------

  return Array.from(
    blockedIPs.values(),
  );
}
