/**
 * Security tests for /kiadas return short ID validation.
 * Ensures endsWith('') empty-match attack and injection attempts are blocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/db.js', () => ({
  default: {
    assignment: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock('../../src/lib/logger.js', () => ({
  logger: { error: vi.fn() },
  logToChannel: vi.fn(),
}));
vi.mock('../../src/lib/permissions.js', () => ({
  requireArmorer: vi.fn().mockResolvedValue(true),
}));

import db from '../../src/lib/db.js';

function makeInteraction(id) {
  return {
    guildId: 'guild-1',
    user: { id: 'user-1' },
    client: {},
    reply: vi.fn(),
    options: {
      getString: vi.fn((k) => (k === 'id' ? id : null)),
    },
    member: {
      roles: { cache: { has: vi.fn().mockReturnValue(true) } },
      permissions: { has: vi.fn().mockReturnValue(false) },
    },
  };
}

describe('/kiadas return — ID validation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects empty string ID', async () => {
    const { execute } = await import('../../src/commands/kiadas/return.js');
    const interaction = makeInteraction('');
    await execute(interaction);
    expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ ephemeral: true }));
    expect(db.assignment.findFirst).not.toHaveBeenCalled();
  });

  it('rejects whitespace-only ID', async () => {
    const { execute } = await import('../../src/commands/kiadas/return.js');
    const interaction = makeInteraction('   ');
    await execute(interaction);
    expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ ephemeral: true }));
    expect(db.assignment.findFirst).not.toHaveBeenCalled();
  });

  it('rejects ID shorter than 6 chars', async () => {
    const { execute } = await import('../../src/commands/kiadas/return.js');
    const interaction = makeInteraction('abc');
    await execute(interaction);
    expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ ephemeral: true }));
    expect(db.assignment.findFirst).not.toHaveBeenCalled();
  });

  it('rejects ID longer than 25 chars', async () => {
    const { execute } = await import('../../src/commands/kiadas/return.js');
    const interaction = makeInteraction('a'.repeat(26));
    await execute(interaction);
    expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ ephemeral: true }));
    expect(db.assignment.findFirst).not.toHaveBeenCalled();
  });

  it('rejects ID with special chars (SQL injection attempt)', async () => {
    const { execute } = await import('../../src/commands/kiadas/return.js');
    const interaction = makeInteraction("' OR 1=1--");
    await execute(interaction);
    expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ ephemeral: true }));
    expect(db.assignment.findFirst).not.toHaveBeenCalled();
  });

  it('accepts valid 8-char alphanumeric ID', async () => {
    const { execute } = await import('../../src/commands/kiadas/return.js');
    db.assignment.findFirst.mockResolvedValue(null);
    const interaction = makeInteraction('abc12345');
    await execute(interaction);
    expect(db.assignment.findFirst).toHaveBeenCalled();
  });
});
