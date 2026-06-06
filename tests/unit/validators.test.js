import { describe, it, expect } from 'vitest';
import {
  itemAddSchema,
  itemEditSchema,
  movementSchema,
  adjustSchema,
  assignmentSchema,
} from '../../src/lib/validators.js';

describe('itemAddSchema', () => {
  it('accepts valid input', () => {
    const r = itemAddSchema.safeParse({ name: 'AK-47', qty: 5, minstock: 2 });
    expect(r.success).toBe(true);
    expect(r.data.qty).toBe(5);
  });

  it('defaults qty and minstock to 0', () => {
    const r = itemAddSchema.safeParse({ name: 'Sisak' });
    expect(r.success).toBe(true);
    expect(r.data.qty).toBe(0);
    expect(r.data.minstock).toBe(0);
  });

  it('rejects empty name', () => {
    expect(itemAddSchema.safeParse({ name: '' }).success).toBe(false);
  });

  it('rejects name longer than 100 chars', () => {
    expect(itemAddSchema.safeParse({ name: 'a'.repeat(101) }).success).toBe(false);
  });

  it('rejects negative qty', () => {
    expect(itemAddSchema.safeParse({ name: 'X', qty: -1 }).success).toBe(false);
  });

  it('rejects float qty', () => {
    expect(itemAddSchema.safeParse({ name: 'X', qty: 1.5 }).success).toBe(false);
  });

  it('rejects category longer than 50 chars', () => {
    expect(itemAddSchema.safeParse({ name: 'X', category: 'a'.repeat(51) }).success).toBe(false);
  });
});

describe('movementSchema', () => {
  it('accepts valid movement', () => {
    const r = movementSchema.safeParse({ name: 'AK-47', qty: 3, reason: 'Beérkezés' });
    expect(r.success).toBe(true);
  });

  it('rejects qty 0', () => {
    expect(movementSchema.safeParse({ name: 'X', qty: 0 }).success).toBe(false);
  });

  it('rejects negative qty', () => {
    expect(movementSchema.safeParse({ name: 'X', qty: -5 }).success).toBe(false);
  });

  it('rejects reason longer than 200 chars', () => {
    expect(movementSchema.safeParse({ name: 'X', qty: 1, reason: 'a'.repeat(201) }).success).toBe(false);
  });

  it('accepts missing reason', () => {
    expect(movementSchema.safeParse({ name: 'X', qty: 1 }).success).toBe(true);
  });
});

describe('adjustSchema', () => {
  it('accepts qty 0 (full drain)', () => {
    expect(adjustSchema.safeParse({ name: 'X', qty: 0 }).success).toBe(true);
  });

  it('rejects negative qty', () => {
    expect(adjustSchema.safeParse({ name: 'X', qty: -1 }).success).toBe(false);
  });
});

describe('assignmentSchema', () => {
  it('rejects qty 0', () => {
    expect(assignmentSchema.safeParse({ name: 'X', user: 'u1', qty: 0 }).success).toBe(false);
  });

  it('accepts valid assignment', () => {
    const r = assignmentSchema.safeParse({ name: 'AK', user: '123456789', qty: 2 });
    expect(r.success).toBe(true);
  });
});
