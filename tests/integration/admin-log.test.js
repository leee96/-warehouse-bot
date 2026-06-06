import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/db.js', () => ({
  default: {
    movement: { findMany: vi.fn() },
  },
}));

vi.mock('../../src/lib/permissions.js', () => ({
  requireArmorer: vi.fn().mockResolvedValue(true),
}));

import db from '../../src/lib/db.js';
import { execute } from '../../src/commands/admin/log.js';

function makeInteraction(limit = null) {
  return {
    guildId: 'guild-1',
    reply: vi.fn(),
    options: {
      getInteger: vi.fn(() => limit),
    },
  };
}

function makeMovement(overrides = {}) {
  return {
    type: 'IN',
    qty: 1,
    userId: 'user-1',
    createdAt: new Date('2025-01-01T12:00:00Z'),
    reason: null,
    item: { name: 'AK-47' },
    ...overrides,
  };
}

function getDescription(interaction) {
  return interaction.reply.mock.calls[0][0].embeds[0].data.description;
}

describe('/admin log', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows "Nincs rögzített művelet" when no movements', async () => {
    db.movement.findMany.mockResolvedValue([]);
    const interaction = makeInteraction();
    await execute(interaction);
    expect(getDescription(interaction)).toContain('Nincs rögzített');
  });

  it('uses default limit of 10 when not specified', async () => {
    db.movement.findMany.mockResolvedValue([]);
    await execute(makeInteraction(null));
    expect(db.movement.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 10 }));
  });

  it('uses provided limit', async () => {
    db.movement.findMany.mockResolvedValue([]);
    await execute(makeInteraction(5));
    expect(db.movement.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }));
  });

  it('renders ASSIGN type with 👤 emoji', async () => {
    db.movement.findMany.mockResolvedValue([makeMovement({ type: 'ASSIGN' })]);
    const interaction = makeInteraction();
    await execute(interaction);
    expect(getDescription(interaction)).toContain('👤');
  });

  it('renders RETURN type with ↩️ emoji', async () => {
    db.movement.findMany.mockResolvedValue([makeMovement({ type: 'RETURN' })]);
    const interaction = makeInteraction();
    await execute(interaction);
    expect(getDescription(interaction)).toContain('↩️');
  });

  it('truncates description at 4000 chars (Discord embed overflow protection)', async () => {
    const longMovements = Array.from({ length: 25 }, () =>
      makeMovement({ item: { name: 'A'.repeat(50) }, reason: 'B'.repeat(80) })
    );
    db.movement.findMany.mockResolvedValue(longMovements);

    const interaction = makeInteraction(25);
    await execute(interaction);

    const desc = getDescription(interaction);
    expect(desc.length).toBeLessThanOrEqual(4000);
    expect(desc.endsWith('…')).toBe(true);
  });

  it('replies ephemeral', async () => {
    db.movement.findMany.mockResolvedValue([]);
    const interaction = makeInteraction();
    await execute(interaction);
    expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ ephemeral: true }));
  });

  it('includes reason in output when present', async () => {
    db.movement.findMany.mockResolvedValue([makeMovement({ reason: 'Leltár korrekció' })]);
    const interaction = makeInteraction();
    await execute(interaction);
    expect(getDescription(interaction)).toContain('Leltár korrekció');
  });

  it('omits italic reason section when reason is null', async () => {
    db.movement.findMany.mockResolvedValue([makeMovement({ reason: null })]);
    const interaction = makeInteraction();
    await execute(interaction);
    expect(getDescription(interaction)).not.toContain(' — *');
  });

  it('truncates item name longer than 50 chars', async () => {
    db.movement.findMany.mockResolvedValue([
      makeMovement({ item: { name: 'X'.repeat(60) } }),
    ]);
    const interaction = makeInteraction();
    await execute(interaction);
    // The name should be sliced to 50 chars
    expect(getDescription(interaction)).toContain('X'.repeat(50));
    expect(getDescription(interaction)).not.toContain('X'.repeat(51));
  });
});
