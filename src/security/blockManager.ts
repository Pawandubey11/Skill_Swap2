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
//
// ============================================================

interface BlockedIP {
  ip: string;
  blockedAt: number;
  expiresAt: number | null;
  reason: string;
}

// ============================================================
// IN-MEMORY BLOCK LIST
// ============================================================

const blockedIPs = new Map<string, BlockedIP>();

// ============================================================
// NORMALIZE IP
// ============================================================

export function normalizeIP(ip: string): string {
  if (!ip) {
    return "unknown";
  }

  ip = ip.trim();

  // ----------------------------------------------------------
  // IPv4 mapped IPv6
  //
  // Example:
  // ::ffff:192.168.1.10
  //
  // becomes:
  // 192.168.1.10
  // ----------------------------------------------------------

  if (ip.startsWith("::ffff:")) {
    ip = ip.substring(7);
  }

  // ----------------------------------------------------------
  // Localhost IPv6
  // ----------------------------------------------------------

  if (ip === "::1") {
    return "127.0.0.1";
  }

  return ip;
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

  if (
    !normalizedIP ||
    normalizedIP === "unknown"
  ) {
    return;
  }

  const now = Date.now();

  const expiresAt =
    durationMs !== null
      ? now + durationMs
      : null;

  blockedIPs.set(
    normalizedIP,
    {
      ip: normalizedIP,
      blockedAt: now,
      expiresAt,
      reason,
    },
  );

  console.log(
    `🚫 IP BLOCKED: ${normalizedIP}`,
  );

  if (expiresAt) {
    console.log(
      `⏱️ Block expires in ${durationMs} ms`,
    );
  } else {
    console.log(
      `⛔ Permanent block`,
    );
  }

  console.log(
    `📝 Reason: ${reason}`,
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
      `✅ IP UNBLOCKED: ${normalizedIP}`,
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

  const entry =
    blockedIPs.get(
      normalizedIP,
    );

  if (!entry) {
    return false;
  }

  // ----------------------------------------------------------
  // Permanent block
  // ----------------------------------------------------------

  if (
    entry.expiresAt === null
  ) {
    return true;
  }

  // ----------------------------------------------------------
  // Temporary block expired
  // ----------------------------------------------------------

  if (
    Date.now() >=
    entry.expiresAt
  ) {

    blockedIPs.delete(
      normalizedIP,
    );

    console.log(
      `🔓 IP BLOCK EXPIRED: ${normalizedIP}`,
    );

    return false;
  }

  return true;
}

// ============================================================
// GET BLOCKED IPS
// ============================================================

export function getBlockedIPs(): BlockedIP[] {

  const now =
    Date.now();

  // ----------------------------------------------------------
  // Remove expired entries
  // ----------------------------------------------------------

  for (
    const [
      ip,
      entry,
    ] of blockedIPs.entries()
  ) {

    if (
      entry.expiresAt !== null &&
      now >= entry.expiresAt
    ) {

      blockedIPs.delete(ip);

      console.log(
        `🔓 Expired IP removed: ${ip}`,
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

  return getBlockedIPs().length;
}

// ============================================================
// CLEAR ALL BLOCKED IPS
// ============================================================

export function clearBlockedIPs(): void {

  blockedIPs.clear();

  console.log(
    "🧹 All blocked IPs cleared",
  );
}
