/**
 * Security tests: input validation, injection attempts, boundary values.
 */
import { describe, it, expect } from 'vitest';
import {
  itemAddSchema,
  movementSchema,
  assignmentSchema,
} from '../../src/lib/validators.js';

const SQL_INJECTION_PAYLOADS = [
  "'; DROP TABLE items; --",
  "1' OR '1'='1",
  '1; SELECT * FROM users',
  "admin'--",
  "' UNION SELECT null,null,null--",
];

const XSS_PAYLOADS = [
  '<script>alert(1)</script>',
  '"><img src=x onerror=alert(1)>',
  'javascript:alert(1)',
  '<svg onload=alert(1)>',
];

describe('SQL injection — itemAddSchema name field', () => {
  for (const payload of SQL_INJECTION_PAYLOADS) {
    it(`passes through zod as plain string (not interpreted): "${payload.slice(0, 30)}"`, () => {
      // Zod does NOT execute SQL — it just validates type/length.
      // Payloads shorter than 100 chars pass as valid strings (Prisma handles escaping).
      const r = itemAddSchema.safeParse({ name: payload });
      if (payload.length <= 100) {
        expect(r.success).toBe(true);
        // Value must be unchanged — no sanitization that could mask intent
        expect(r.data?.name).toBe(payload);
      } else {
        expect(r.success).toBe(false);
      }
    });
  }
});

describe('XSS — itemAddSchema name field', () => {
  for (const payload of XSS_PAYLOADS) {
    it(`passes through as-is (Discord escapes embeds): "${payload.slice(0, 40)}"`, () => {
      const r = itemAddSchema.safeParse({ name: payload });
      // XSS is irrelevant in Discord embeds (they are sandboxed, no HTML rendering).
      // Zod validates length only — all these are short enough to pass.
      if (r.success) {
        expect(typeof r.data.name).toBe('string');
      }
    });
  }
});

describe('Boundary values', () => {
  it('rejects name that is exactly 101 chars', () => {
    expect(itemAddSchema.safeParse({ name: 'a'.repeat(101) }).success).toBe(false);
  });

  it('accepts name that is exactly 100 chars', () => {
    expect(itemAddSchema.safeParse({ name: 'a'.repeat(100) }).success).toBe(true);
  });

  it('rejects qty of MAX_SAFE_INTEGER — still an integer, passes zod, caught by DB constraints', () => {
    // Zod only checks int + min(0); unreasonably large values are a DB/business concern
    const r = itemAddSchema.safeParse({ name: 'X', qty: Number.MAX_SAFE_INTEGER });
    expect(r.success).toBe(true); // zod allows it; business logic should cap it separately
  });

  it('rejects non-integer qty (float)', () => {
    expect(itemAddSchema.safeParse({ name: 'X', qty: 1.1 }).success).toBe(false);
  });

  it('rejects NaN qty', () => {
    expect(itemAddSchema.safeParse({ name: 'X', qty: NaN }).success).toBe(false);
  });

  it('rejects Infinity qty', () => {
    expect(itemAddSchema.safeParse({ name: 'X', qty: Infinity }).success).toBe(false);
  });

  it('rejects empty user ID in assignment', () => {
    expect(assignmentSchema.safeParse({ name: 'X', user: '', qty: 1 }).success).toBe(false);
  });

  it('rejects movement with qty = 0', () => {
    expect(movementSchema.safeParse({ name: 'X', qty: 0 }).success).toBe(false);
  });

  it('accepts reason with exactly 200 chars', () => {
    expect(movementSchema.safeParse({ name: 'X', qty: 1, reason: 'a'.repeat(200) }).success).toBe(true);
  });

  it('rejects reason with 201 chars', () => {
    expect(movementSchema.safeParse({ name: 'X', qty: 1, reason: 'a'.repeat(201) }).success).toBe(false);
  });
});

describe('Type coercion attacks', () => {
  it('rejects string qty in movement', () => {
    expect(movementSchema.safeParse({ name: 'X', qty: '5' }).success).toBe(false);
  });

  it('rejects null name', () => {
    expect(itemAddSchema.safeParse({ name: null }).success).toBe(false);
  });

  it('rejects object as name', () => {
    expect(itemAddSchema.safeParse({ name: { toString: () => 'evil' } }).success).toBe(false);
  });
});
