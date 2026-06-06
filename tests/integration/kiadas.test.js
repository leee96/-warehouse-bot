import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/db.js', () => {
  const item = { findUnique: vi.fn(), update: vi.fn() };
  const assignment = { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() };
  const movement = { create: vi.fn() };
  const config = { findUnique: vi.fn() };

  return {
    default: {
      item,
      assignment,
      movement,
      config,
      $transaction: vi.fn(async (fn) => fn({ item, assignment, movement, config })),
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

function makeInteraction({ strings = {}, ints = {}, user = null } = {}) {
  return {
    guildId: 'guild-1',
    user: { id: 'armorer-1' },
    client: {},
    replied: false,
    reply: vi.fn(),
    options: {
      getString: vi.fn((k) => strings[k] ?? null),
      getInteger: vi.fn((k) => ints[k] ?? null),
      getUser: vi.fn(() => user ?? { id: 'target-user', displayName: 'TestUser' }),
    },
    member: {
      roles: { cache: { has: vi.fn().mockReturnValue(true) } },
      permissions: { has: vi.fn().mockReturnValue(false) },
    },
  };
}

describe('/kiadas new', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates assignment and decrements availableQty', async () => {
    const { execute } = await import('../../src/commands/kiadas/new.js');

    db.item.findUnique.mockResolvedValue({
      id: 'item-1', name: 'Sisak', archived: false, availableQty: 10, totalQty: 10,
    });
    db.assignment.create.mockResolvedValue({ id: 'clxabcdef12345678', qty: 2 });
    db.item.update.mockResolvedValue({ availableQty: 8 });

    const interaction = makeInteraction({ strings: { name: 'Sisak' }, ints: { qty: 2 } });
    await execute(interaction);

    expect(db.assignment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ qty: 2, userId: 'target-user' }) })
    );
    expect(db.item.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { availableQty: { decrement: 2 } } })
    );
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ embeds: expect.anything() })
    );
  });

  it('rejects when not enough stock', async () => {
    const { execute } = await import('../../src/commands/kiadas/new.js');
    db.item.findUnique.mockResolvedValue({
      id: 'i', name: 'X', archived: false, availableQty: 1, totalQty: 5,
    });

    const interaction = makeInteraction({ strings: { name: 'X' }, ints: { qty: 3 } });
    await execute(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ ephemeral: true }));
    expect(db.assignment.create).not.toHaveBeenCalled();
  });

  it('rejects when availableQty is exactly 0', async () => {
    const { execute } = await import('../../src/commands/kiadas/new.js');
    db.item.findUnique.mockResolvedValue({
      id: 'i', name: 'X', archived: false, availableQty: 0, totalQty: 3,
    });

    const interaction = makeInteraction({ strings: { name: 'X' }, ints: { qty: 1 } });
    await execute(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ ephemeral: true }));
  });

  it('rejects archived item', async () => {
    const { execute } = await import('../../src/commands/kiadas/new.js');
    db.item.findUnique.mockResolvedValue({ id: 'i', name: 'X', archived: true, availableQty: 5 });

    const interaction = makeInteraction({ strings: { name: 'X' }, ints: { qty: 1 } });
    await execute(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ ephemeral: true }));
  });
});

describe('/kiadas return', () => {
  beforeEach(() => vi.clearAllMocks());

  it('closes assignment and returns qty to stock', async () => {
    const { execute } = await import('../../src/commands/kiadas/return.js');

    db.assignment.findFirst.mockResolvedValue({
      id: 'clxabcdef12345678',
      guildId: 'guild-1',
      itemId: 'item-1',
      userId: 'target-user',
      qty: 2,
      returnedAt: null,
      item: { name: 'Sisak' },
    });
    db.assignment.update.mockResolvedValue({});
    db.item.update.mockResolvedValue({});

    const interaction = makeInteraction({ strings: { id: '12345678' } });
    await execute(interaction);

    expect(db.assignment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ returnedAt: expect.any(Date) }),
      })
    );
    expect(db.item.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { availableQty: { increment: 2 } } })
    );
  });

  it('rejects already-returned assignment', async () => {
    const { execute } = await import('../../src/commands/kiadas/return.js');

    db.assignment.findFirst.mockResolvedValue({
      id: 'clxabcdef12345678',
      guildId: 'guild-1',
      returnedAt: new Date(),
      item: { name: 'X' },
    });

    const interaction = makeInteraction({ strings: { id: '12345678' } });
    await execute(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ ephemeral: true }));
    expect(db.assignment.update).not.toHaveBeenCalled();
  });

  it('rejects unknown assignment ID', async () => {
    const { execute } = await import('../../src/commands/kiadas/return.js');
    db.assignment.findFirst.mockResolvedValue(null);

    const interaction = makeInteraction({ strings: { id: 'notexist' } });
    await execute(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ ephemeral: true }));
  });
});
