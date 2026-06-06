// Per-user in-memory cooldown for write commands.
// Map: `${userId}:${commandKey}` -> timestamp of last use
const cooldowns = new Map();

const COOLDOWN_MS = 3000; // 3 seconds (Phase 6.6)

export function checkCooldown(userId, commandKey) {
  const key = `${userId}:${commandKey}`;
  const last = cooldowns.get(key) ?? 0;
  const remaining = COOLDOWN_MS - (Date.now() - last);

  if (remaining > 0) {
    return { limited: true, remainingMs: remaining };
  }

  cooldowns.set(key, Date.now());

  // Prevent unbounded memory growth: evict entries older than 1 minute
  if (cooldowns.size > 10_000) {
    const cutoff = Date.now() - 60_000;
    for (const [k, ts] of cooldowns) {
      if (ts < cutoff) cooldowns.delete(k);
    }
  }

  return { limited: false };
}
