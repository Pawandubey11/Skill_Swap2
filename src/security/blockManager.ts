// ============================================================
// IP BLOCK MANAGER
// ============================================================

export interface BlockEntry {
  ip_address: string;
  blocked_at: number;
  expires_at: number;
  reason: string;
}

const blockedIPs = new Map<string, BlockEntry>();

// Default block duration = 10 minutes
const BLOCK_DURATION_MS = 10 * 60 * 1000;

// ============================================================
// NORMALIZE IP
// ============================================================

function normalizeIP(ip_address: string): string {
  let ip = ip_address.trim();

  // IPv4-mapped IPv6
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

  const existing = blockedIPs.get(ip);

  // If already blocked, refresh the block
  // instead of creating duplicate entries.
  if (
    existing &&
    now < existing.expires_at
  ) {
    existing.expires_at =
      now + BLOCK_DURATION_MS;

    existing.reason = reason;

    blockedIPs.set(ip, existing);

    console.log(
      `🔄 IP BLOCK REFRESHED: ${ip} | Duration: 10 minutes | Reason: ${reason}`,
    );

    return existing;
  }

  const entry: BlockEntry = {
    ip_address: ip,
    blocked_at: now,
    expires_at:
      now + BLOCK_DURATION_MS,
    reason,
  };

  blockedIPs.set(ip, entry);

  console.log(
    `🚫 IP BLOCKED: ${ip} | Duration: 10 minutes | Reason: ${reason}`,
  );

  return entry;
}

// ============================================================
// CHECK IP
// ============================================================

export function isIPBlocked(
  ip_address: string,
): boolean {
  const ip = normalizeIP(ip_address);

  const entry = blockedIPs.get(ip);

  if (!entry) {
    return false;
  }

  const now = Date.now();

  // Block expired
  if (now >= entry.expires_at) {
    blockedIPs.delete(ip);

    console.log(
      `✅ IP BLOCK EXPIRED: ${ip}`,
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

  if (
    Date.now() >=
    entry.expires_at
  ) {
    blockedIPs.delete(ip);

    console.log(
      `✅ IP BLOCK EXPIRED: ${ip}`,
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

  const existed =
    blockedIPs.has(ip);

  if (existed) {
    blockedIPs.delete(ip);

    console.log(
      `🔓 IP UNBLOCKED: ${ip}`,
    );
  }

  return existed;
}

// ============================================================
// GET ALL ACTIVE BLOCKED IPS
// ============================================================

export function getBlockedIPs(): BlockEntry[] {
  const now = Date.now();

  // Remove expired blocks
  for (
    const [ip, entry]
    of blockedIPs.entries()
  ) {
    if (
      now >=
      entry.expires_at
    ) {
      blockedIPs.delete(ip);

      console.log(
        `✅ IP BLOCK EXPIRED: ${ip}`,
      );
    }
  }

  return Array.from(
    blockedIPs.values(),
  );
}

// ============================================================
// COUNT BLOCKED IPS
// ============================================================

export function getBlockedIPCount(): number {
  return getBlockedIPs().length;
}

// ============================================================
// CLEAR ALL BLOCKS
// ============================================================

export function clearAllBlockedIPs(): void {
  blockedIPs.clear();

  console.log(
    "🧹 All IP blocks cleared.",
  );
}
