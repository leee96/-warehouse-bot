import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/db.js', () => ({
  default: {
    item: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import db from '../../src/lib/db.js';
import { execute } from '../../src/commands/targy/list.js';

function makeInteraction({ category = null, page = null } = {}) {
  return {
    guildId: 'guild-1',
    options: {
      getString: vi.fn((k) => (k === 'category' ? category : null)),
      getInteger: vi.fn((k) => (k === 'page' ? page : null)),
    },
  };
}

describe('/targy list', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns a payload object (not undefined) — caller must reply', async () => {
    db.item.count.mockResolvedValue(0);
    db.item.findMany.mockResolvedValue([]);

    const interaction = makeInteraction();
    const result = await execute(interaction);

    expect(result).toBeDefined();
    expect(result).toHaveProperty('embeds');
    expect(result).toHaveProperty('components');
  });

  it('shows "Nincs tárgy" when list is empty', async () => {
    db.item.count.mockResolvedValue(0);
    db.item.findMany.mockResolvedValue([]);

    const result = await execute(makeInteraction());
    expect(result.embeds[0].data.description).toContain('Nincs');
  });

  it('lists items with qty info', async () => {
    db.item.count.mockResolvedValue(2);
    db.item.findMany.mockResolvedValue([
      { name: 'AK-47', availableQty: 3, totalQty: 5, category: 'Fegyver', minStock: 0 },
      { name: 'Sisak', availableQty: 8, totalQty: 10, category: null, minStock: 0 },
    ]);

    const result = await execute(makeInteraction());
    const desc = result.embeds[0].data.description;
    expect(desc).toContain('AK-47');
    expect(desc).toContain('3/5');
    expect(desc).toContain('Sisak');
    expect(desc).toContain('8/10');
  });

  it('shows ⚠️ warning when availableQty <= minStock', async () => {
    db.item.count.mockResolvedValue(1);
    db.item.findMany.mockResolvedValue([
      { name: 'Sisak', availableQty: 2, totalQty: 10, category: null, minStock: 5 },
    ]);

    const result = await execute(makeInteraction());
    expect(result.embeds[0].data.description).toContain('⚠️');
  });

  it('does NOT show ⚠️ when minStock is 0 (no threshold set)', async () => {
    db.item.count.mockResolvedValue(1);
    db.item.findMany.mockResolvedValue([
      { name: 'Sisak', availableQty: 0, totalQty: 0, category: null, minStock: 0 },
    ]);

    const result = await execute(makeInteraction());
    expect(result.embeds[0].data.description).not.toContain('⚠️');
  });

  it('includes pagination buttons when total > PAGE_SIZE', async () => {
    db.item.count.mockResolvedValue(25); // > PAGE_SIZE (10)
    db.item.findMany.mockResolvedValue(
      Array.from({ length: 10 }, (_, i) => ({
        name: `Item${i}`, availableQty: i, totalQty: i + 1, category: null, minStock: 0,
      }))
    );

    const result = await execute(makeInteraction());
    expect(result.components).toHaveLength(1);
    expect(result.components[0].components).toHaveLength(3); // prev, info, next
  });

  it('no pagination buttons when total <= PAGE_SIZE', async () => {
    db.item.count.mockResolvedValue(5);
    db.item.findMany.mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => ({
        name: `Item${i}`, availableQty: i, totalQty: i + 1, category: null, minStock: 0,
      }))
    );

    const result = await execute(makeInteraction());
    expect(result.components).toHaveLength(0);
  });

  it('passes pageOverride directly to DB skip calculation', async () => {
    db.item.count.mockResolvedValue(30);
    db.item.findMany.mockResolvedValue([]);

    const interaction = makeInteraction();
    await execute(interaction, 2); // page index 2 = third page

    expect(db.item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20 }) // 2 * PAGE_SIZE(10)
    );
  });

  it('filters by category when provided', async () => {
    db.item.count.mockResolvedValue(0);
    db.item.findMany.mockResolvedValue([]);

    await execute(makeInteraction({ category: 'Fegyver' }));

    expect(db.item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: { equals: 'Fegyver' },
        }),
      })
    );
  });
});
