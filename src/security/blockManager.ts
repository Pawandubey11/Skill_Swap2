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
// BLOCK CONFIGURATION
// ============================================================

// IP will remain blocked for 10 minutes
const BLOCK_DURATION_MS = 10 * 60 * 1000;

// ============================================================
// NORMALIZE IP ADDRESS
// ============================================================

function normalizeIP(ip_address: string): string {
  let ip = ip_address.trim();

  // Convert IPv6 mapped IPv4
  if (ip.startsWith("::ffff:")) {
    ip = ip.substring(7);
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

  const entry: BlockEntry = {
    ip_address: ip,
    blocked_at: now,
    expires_at: now + BLOCK_DURATION_MS,
    reason,
  };

  blockedIPs.set(ip, entry);

  console.log(
    `🚫 IP BLOCKED: ${ip} | Duration: 10 minutes | Reason: ${reason}`,
  );

  console.log(
    `📋 Total blocked IPs: ${blockedIPs.size}`,
  );

  return entry;
}

// ============================================================
// CHECK IF IP IS BLOCKED
// ============================================================

export function isIPBlocked(
  ip_address: string,
): boolean {

  const ip = normalizeIP(ip_address);

  const entry = blockedIPs.get(ip);

  // IP is not in block list
  if (!entry) {
    return false;
  }

  // Check expiration
  if (Date.now() >= entry.expires_at) {

    blockedIPs.delete(ip);

    console.log(
      `✅ IP block expired: ${ip}`,
    );

    console.log(
      `📋 Total blocked IPs: ${blockedIPs.size}`,
    );

    return false;
  }

  return true;
}

// ============================================================
// GET BLOCK ENTRY
// ============================================================

export function getBlockEntry(
  ip_address: string,
): BlockEntry | null {

  const ip = normalizeIP(ip_address);

  const entry = blockedIPs.get(ip);

  if (!entry) {
    return null;
  }

  // Remove expired entry
  if (Date.now() >= entry.expires_at) {

    blockedIPs.delete(ip);

    console.log(
      `✅ IP block expired: ${ip}`,
    );

    return null;
  }

  return entry;
}

// ============================================================
// UNBLOCK IP
// ============================================================

export function unblockIP(
  ip_address: string,
): boolean {

  const ip = normalizeIP(ip_address);

  const removed =
    blockedIPs.delete(ip);

  if (removed) {

    console.log(
      `🔓 IP UNBLOCKED: ${ip}`,
    );

  } else {

    console.log(
      `ℹ️ IP was not blocked: ${ip}`,
    );
  }

  return removed;
}

// ============================================================
// GET ALL BLOCKED IPs
// ============================================================

export function getBlockedIPs(): BlockEntry[] {

  const now = Date.now();

  // Remove expired entries
  for (
    const [ip, entry]
    of blockedIPs.entries()
  ) {

    if (now >= entry.expires_at) {

      blockedIPs.delete(ip);

      console.log(
        `✅ IP block expired: ${ip}`,
      );
    }
  }

  return Array.from(
    blockedIPs.values(),
  );
}

// ============================================================
// GET BLOCKED IP COUNT
// ============================================================

export function getBlockedIPCount(): number {

  // Clean expired entries first
  getBlockedIPs();

  return blockedIPs.size;
}

// ============================================================
// CLEAR ALL BLOCKED IPs
// ============================================================

export function clearBlockedIPs(): void {

  blockedIPs.clear();

  console.log(
    "🧹 All blocked IPs cleared.",
  );
}
