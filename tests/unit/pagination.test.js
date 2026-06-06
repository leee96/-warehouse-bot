import { describe, it, expect } from 'vitest';
import { buildPaginationRow, PAGE_SIZE } from '../../src/lib/pagination.js';

describe('PAGE_SIZE', () => {
  it('is 10', () => expect(PAGE_SIZE).toBe(10));
});

describe('buildPaginationRow', () => {
  it('disables prev button on first page', () => {
    const row = buildPaginationRow(0, 5, 'targy');
    const [prev] = row.components;
    expect(prev.data.disabled).toBe(true);
  });

  it('disables next button on last page', () => {
    const row = buildPaginationRow(4, 5, 'targy');
    const [, , next] = row.components;
    expect(next.data.disabled).toBe(true);
  });

  it('enables both on middle page', () => {
    const row = buildPaginationRow(2, 5, 'targy');
    const [prev, , next] = row.components;
    expect(prev.data.disabled).toBe(false);
    expect(next.data.disabled).toBe(false);
  });

  it('encodes listType in customId', () => {
    const row = buildPaginationRow(1, 3, 'targy');
    const [prev, info, next] = row.components;
    expect(prev.data.custom_id).toContain('targy');
    expect(next.data.custom_id).toContain('targy');
  });

  it('encodes current page in customId', () => {
    const row = buildPaginationRow(3, 10, 'targy');
    expect(row.components[0].data.custom_id).toContain('_3_');
    expect(row.components[2].data.custom_id).toContain('_3_');
  });

  it('shows correct page label', () => {
    const row = buildPaginationRow(2, 7, 'targy');
    expect(row.components[1].data.label).toBe('3 / 7');
  });
});
