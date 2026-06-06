import { describe, it, expect, vi, beforeEach } from 'vitest';

// Reset module between tests to clear the cooldowns Map
beforeEach(() => {
  vi.resetModules();
});

describe('checkCooldown', () => {
  it('allows first call', async () => {
    const { checkCooldown } = await import('../../src/lib/ratelimit.js');
    const result = checkCooldown('user-1', 'keszlet:in');
    expect(result.limited).toBe(false);
  });

  it('blocks second call within cooldown window', async () => {
    const { checkCooldown } = await import('../../src/lib/ratelimit.js');
    checkCooldown('user-1', 'keszlet:in');
    const result = checkCooldown('user-1', 'keszlet:in');
    expect(result.limited).toBe(true);
    expect(result.remainingMs).toBeGreaterThan(0);
    expect(result.remainingMs).toBeLessThanOrEqual(3000);
  });

  it('different users are independent', async () => {
    const { checkCooldown } = await import('../../src/lib/ratelimit.js');
    checkCooldown('user-1', 'keszlet:in');
    const result = checkCooldown('user-2', 'keszlet:in');
    expect(result.limited).toBe(false);
  });

  it('different commands for same user are independent', async () => {
    const { checkCooldown } = await import('../../src/lib/ratelimit.js');
    checkCooldown('user-1', 'keszlet:in');
    const result = checkCooldown('user-1', 'keszlet:out');
    expect(result.limited).toBe(false);
  });

  it('allows call after cooldown expires', async () => {
    vi.useFakeTimers();
    const { checkCooldown } = await import('../../src/lib/ratelimit.js');

    checkCooldown('user-1', 'keszlet:in');
    vi.advanceTimersByTime(3001);
    const result = checkCooldown('user-1', 'keszlet:in');
    expect(result.limited).toBe(false);

    vi.useRealTimers();
  });
});
