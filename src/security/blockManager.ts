interface BlockEntry {
  ip_address: string;
  blocked_at: number;
  expires_at: number;
  reason: string;
}

const blockedIPs = new Map<string, BlockEntry>();

const BLOCK_DURATION_MS = 10 * 60 * 1000; // 10 minutes

export function blockIP(
  ip_address: string,
  reason: string,
): BlockEntry {
  const now = Date.now();

  const entry: BlockEntry = {
    ip_address,
    blocked_at: now,
    expires_at: now + BLOCK_DURATION_MS,
    reason,
  };

  blockedIPs.set(ip_address, entry);

  console.log(
    `🚫 IP BLOCKED: ${ip_address} | Duration: 10 minutes | Reason: ${reason}`,
  );

  return entry;
}

export function isIPBlocked(ip_address: string): boolean {
  const entry = blockedIPs.get(ip_address);

  if (!entry) {
    return false;
  }

  if (Date.now() >= entry.expires_at) {
    blockedIPs.delete(ip_address);

    console.log(`✅ IP block expired: ${ip_address}`);

    return false;
  }

  return true;
}

export function unblockIP(ip_address: string): boolean {
  return blockedIPs.delete(ip_address);
}

export function getBlockedIPs(): BlockEntry[] {
  const now = Date.now();

  for (const [ip, entry] of blockedIPs.entries()) {
    if (now >= entry.expires_at) {
      blockedIPs.delete(ip);
    }
  }

  return Array.from(blockedIPs.values());
}
