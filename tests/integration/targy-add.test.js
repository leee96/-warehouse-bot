import { describe, it, expect, vi, beforeEach } from 'vitest';

// NOTE: vi.mock is hoisted — must be before any import that triggers the mocked module.
vi.mock('../../src/lib/db.js', () => {
  const item = { findUnique: vi.fn(), upsert: vi.fn() };
  const movement = { create: vi.fn() };

  return {
    default: {
      item,
      movement,
      // transaction proxies to the same mock objects so tx.item === db.item
      $transaction: vi.fn(async (fn) => fn({ item, movement })),
    },
  };
});

vi.mock('../../src/lib/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
  logToChannel: vi.fn(),
}));

vi.mock('../../src/lib/permissions.js', () => ({
  requireArmorer: vi.fn().mockResolvedValue(true),
}));

import db from '../../src/lib/db.js';
import { execute } from '../../src/commands/targy/add.js';

function makeInteraction({ strings = {}, ints = {} } = {}) {
  return {
    guildId: 'guild-1',
    user: { id: 'armorer-1' },
    client: {},
    reply: vi.fn(),
    options: {
      getString: vi.fn((k) => strings[k] ?? null),
      getInteger: vi.fn((k) => ints[k] ?? null),
    },
  };
}

describe('/targy add', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a new item with correct qty', async () => {
    db.item.findUnique.mockResolvedValue(null); // no existing item
    db.item.upsert.mockResolvedValue({ id: 'i1', name: 'AK-47', totalQty: 5, availableQty: 5 });

    const interaction = makeInteraction({ strings: { name: 'AK-47' }, ints: { qty: 5 } });
    await execute(interaction);

    expect(db.item.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ totalQty: 5, availableQty: 5, guildId: 'guild-1' }),
        update: expect.objectContaining({ totalQty: 5, availableQty: 5 }),
      })
    );
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.not.objectContaining({ ephemeral: true })
    );
  });

  it('also creates an IN movement when qty > 0', async () => {
    db.item.findUnique.mockResolvedValue(null);
    db.item.upsert.mockResolvedValue({ id: 'i1', name: 'Sisak', totalQty: 3, availableQty: 3 });

    const interaction = makeInteraction({ strings: { name: 'Sisak' }, ints: { qty: 3 } });
    await execute(interaction);

    expect(db.movement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'IN', qty: 3 }),
      })
    );
  });

  it('skips movement creation when qty = 0', async () => {
    db.item.findUnique.mockResolvedValue(null);
    db.item.upsert.mockResolvedValue({ id: 'i1', name: 'X', totalQty: 0, availableQty: 0 });

    const interaction = makeInteraction({ strings: { name: 'X' }, ints: { qty: 0 } });
    await execute(interaction);

    expect(db.movement.create).not.toHaveBeenCalled();
  });

  it('rejects when active non-archived item already exists', async () => {
    db.item.findUnique.mockResolvedValue({
      id: 'i1', name: 'AK-47', archived: false, assignments: [],
    });

    const interaction = makeInteraction({ strings: { name: 'AK-47' }, ints: { qty: 1 } });
    await execute(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ ephemeral: true }));
    expect(db.item.upsert).not.toHaveBeenCalled();
  });

  it('unarchives existing item and adjusts availableQty for active assignments', async () => {
    // Item was archived, has 2 active assignments totalling 3 qty
    db.item.findUnique.mockResolvedValue({
      id: 'i1', name: 'Sisak', archived: true,
      assignments: [{ qty: 2 }, { qty: 1 }], // activeAssignedQty = 3
    });
    db.item.upsert.mockResolvedValue({ id: 'i1', name: 'Sisak', totalQty: 10, availableQty: 7 });

    const interaction = makeInteraction({ strings: { name: 'Sisak' }, ints: { qty: 10 } });
    await execute(interaction);

    // availableQty should be 10 - 3 = 7
    expect(db.item.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ archived: false, totalQty: 10, availableQty: 7 }),
      })
    );
  });

  it('clamps availableQty to 0 when new qty < activeAssignedQty', async () => {
    db.item.findUnique.mockResolvedValue({
      id: 'i1', name: 'Sisak', archived: true,
      assignments: [{ qty: 5 }, { qty: 5 }], // 10 assigned
    });
    db.item.upsert.mockResolvedValue({ id: 'i1', name: 'Sisak', totalQty: 3, availableQty: 0 });

    const interaction = makeInteraction({ strings: { name: 'Sisak' }, ints: { qty: 3 } });
    await execute(interaction);

    // max(0, 3 - 10) = 0
    expect(db.item.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ availableQty: 0, totalQty: 3 }),
      })
    );
  });

  it('rejects invalid (empty) name via zod', async () => {
    const interaction = makeInteraction({ strings: { name: '' } });
    await execute(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ ephemeral: true }));
    expect(db.item.findUnique).not.toHaveBeenCalled();
  });

  it('runs upsert and movement in the same $transaction', async () => {
    db.item.findUnique.mockResolvedValue(null);
    db.item.upsert.mockResolvedValue({ id: 'i1', name: 'X', totalQty: 1, availableQty: 1 });

    const interaction = makeInteraction({ strings: { name: 'X' }, ints: { qty: 1 } });
    await execute(interaction);

    // $transaction must have been called exactly once
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    // Both upsert and movement.create should be called inside the transaction
    expect(db.item.upsert).toHaveBeenCalledTimes(1);
    expect(db.movement.create).toHaveBeenCalledTimes(1);
  });
});
