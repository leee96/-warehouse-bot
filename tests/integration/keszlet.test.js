/**
 * Integration tests for /keszlet commands.
 * Uses a mocked Prisma client — no real DB needed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/db.js', () => {
  const item = {
    findUnique: vi.fn(),
    update: vi.fn(),
  };
  const movement = { create: vi.fn() };
  const config = { findUnique: vi.fn() };

  return {
    default: {
      item,
      movement,
      config,
      $transaction: vi.fn(async (fn) => fn({ item, movement, config })),
    },
  };
});

vi.mock('../../src/lib/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn() },
  logToChannel: vi.fn(),
}));

vi.mock('../../src/lib/permissions.js', () => ({
  requireArmorer: vi.fn().mockResolvedValue(true),
}));

import db from '../../src/lib/db.js';

function makeInteraction(overrides = {}) {
  return {
    guildId: 'guild-1',
    user: { id: 'user-1' },
    client: {},
    replied: false,
    deferred: false,
    reply: vi.fn(),
    options: {
      getString: vi.fn((k) => overrides.strings?.[k] ?? null),
      getInteger: vi.fn((k) => overrides.ints?.[k] ?? null),
    },
    member: {
      roles: { cache: { has: vi.fn().mockReturnValue(true) } },
      permissions: { has: vi.fn().mockReturnValue(false) },
    },
  };
}

describe('/keszlet in', () => {
  beforeEach(() => vi.clearAllMocks());

  it('increases totalQty and availableQty', async () => {
    const { execute } = await import('../../src/commands/keszlet/in.js');

    db.item.findUnique.mockResolvedValue({
      id: 'item-1',
      name: 'AK-47',
      archived: false,
      availableQty: 5,
      totalQty: 5,
    });
    db.item.update.mockResolvedValue({ availableQty: 8, totalQty: 8 });

    const interaction = makeInteraction({ strings: { name: 'AK-47' }, ints: { qty: 3 } });
    await execute(interaction);

    expect(db.item.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          totalQty: { increment: 3 },
          availableQty: { increment: 3 },
        }),
      })
    );
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ embeds: expect.arrayContaining([expect.anything()]) })
    );
  });

  it('replies with error when item not found', async () => {
    const { execute } = await import('../../src/commands/keszlet/in.js');
    db.item.findUnique.mockResolvedValue(null);

    const interaction = makeInteraction({ strings: { name: 'Nincs' }, ints: { qty: 1 } });
    await execute(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ ephemeral: true })
    );
    expect(db.item.update).not.toHaveBeenCalled();
  });

  it('replies with error when item is archived', async () => {
    const { execute } = await import('../../src/commands/keszlet/in.js');
    db.item.findUnique.mockResolvedValue({ id: 'x', archived: true });

    const interaction = makeInteraction({ strings: { name: 'X' }, ints: { qty: 1 } });
    await execute(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ ephemeral: true }));
  });
});

describe('/keszlet out', () => {
  beforeEach(() => vi.clearAllMocks());

  it('decreases both qty fields', async () => {
    const { execute } = await import('../../src/commands/keszlet/out.js');

    db.item.findUnique.mockResolvedValue({
      id: 'item-1',
      name: 'AK-47',
      archived: false,
      availableQty: 10,
      totalQty: 10,
    });
    db.item.update.mockResolvedValue({ availableQty: 7, totalQty: 7 });

    const interaction = makeInteraction({ strings: { name: 'AK-47' }, ints: { qty: 3 } });
    await execute(interaction);

    expect(db.item.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          totalQty: { decrement: 3 },
          availableQty: { decrement: 3 },
        }),
      })
    );
  });

  it('rejects when qty exceeds availableQty', async () => {
    const { execute } = await import('../../src/commands/keszlet/out.js');
    db.item.findUnique.mockResolvedValue({
      id: 'item-1', name: 'AK', archived: false, availableQty: 2, totalQty: 5,
    });

    const interaction = makeInteraction({ strings: { name: 'AK' }, ints: { qty: 5 } });
    await execute(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ ephemeral: true }));
    expect(db.item.update).not.toHaveBeenCalled();
  });

  it('rejects exactly 0 available (edge case)', async () => {
    const { execute } = await import('../../src/commands/keszlet/out.js');
    db.item.findUnique.mockResolvedValue({
      id: 'i', name: 'X', archived: false, availableQty: 0, totalQty: 3,
    });

    const interaction = makeInteraction({ strings: { name: 'X' }, ints: { qty: 1 } });
    await execute(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ ephemeral: true }));
  });
});

describe('/keszlet adjust', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calculates correct delta', async () => {
    const { execute } = await import('../../src/commands/keszlet/adjust.js');
    db.item.findUnique.mockResolvedValue({
      id: 'i', name: 'X', archived: false, availableQty: 5, totalQty: 5,
    });
    db.item.update.mockResolvedValue({ availableQty: 8, totalQty: 8 });

    const interaction = makeInteraction({ strings: { name: 'X' }, ints: { qty: 8 } });
    await execute(interaction);

    expect(db.movement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ delta: 3, qty: 3 }),
      })
    );
  });

  it('handles negative delta (shrink)', async () => {
    const { execute } = await import('../../src/commands/keszlet/adjust.js');
    db.item.findUnique.mockResolvedValue({
      id: 'i', name: 'X', archived: false, availableQty: 10, totalQty: 10,
    });
    db.item.update.mockResolvedValue({ availableQty: 3, totalQty: 3 });

    const interaction = makeInteraction({ strings: { name: 'X' }, ints: { qty: 3 } });
    await execute(interaction);

    expect(db.movement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ delta: -7, qty: 7 }),
      })
    );
  });

  it('handles no-change adjust (delta = 0)', async () => {
    const { execute } = await import('../../src/commands/keszlet/adjust.js');
    db.item.findUnique.mockResolvedValue({
      id: 'i', name: 'X', archived: false, availableQty: 5, totalQty: 5,
    });
    db.item.update.mockResolvedValue({ availableQty: 5, totalQty: 5 });

    const interaction = makeInteraction({ strings: { name: 'X' }, ints: { qty: 5 } });
    await execute(interaction);

    expect(db.movement.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ delta: 0, qty: 0 }) })
    );
  });
});
