import { describe, it, expect } from 'vitest';
import { successEmbed, errorEmbed, infoEmbed, auditEmbed } from '../../src/lib/embeds.js';

describe('successEmbed', () => {
  it('sets green color', () => {
    const e = successEmbed('OK', 'Minden rendben');
    expect(e.data.color).toBe(0x2ecc71);
  });

  it('prefixes title with checkmark', () => {
    const e = successEmbed('Kész', 'leírás');
    expect(e.data.title).toContain('✅');
    expect(e.data.title).toContain('Kész');
  });

  it('sets description', () => {
    expect(successEmbed('T', 'desc').data.description).toBe('desc');
  });
});

describe('errorEmbed', () => {
  it('sets red color', () => {
    expect(errorEmbed('Hiba', 'msg').data.color).toBe(0xe74c3c);
  });

  it('prefixes title with X', () => {
    expect(errorEmbed('Hiba', 'msg').data.title).toContain('❌');
  });
});

describe('auditEmbed', () => {
  it('includes action as title', () => {
    const e = auditEmbed({ action: 'Beérkezés', user: '123', item: 'AK-47', qty: 5 });
    expect(e.data.title).toContain('Beérkezés');
  });

  it('includes qty field when provided', () => {
    const e = auditEmbed({ action: 'X', user: '1', item: 'Y', qty: 10 });
    const qtyField = e.data.fields?.find((f) => f.name === 'Mennyiség');
    expect(qtyField?.value).toBe('10');
  });

  it('omits qty field when undefined', () => {
    const e = auditEmbed({ action: 'X', user: '1', item: 'Y' });
    const qtyField = e.data.fields?.find((f) => f.name === 'Mennyiség');
    expect(qtyField).toBeUndefined();
  });

  it('includes reason when provided', () => {
    const e = auditEmbed({ action: 'X', user: '1', item: 'Y', reason: 'teszt' });
    const reasonField = e.data.fields?.find((f) => f.name === 'Indoklás');
    expect(reasonField?.value).toBe('teszt');
  });

  it('omits reason field when not provided', () => {
    const e = auditEmbed({ action: 'X', user: '1', item: 'Y' });
    const reasonField = e.data.fields?.find((f) => f.name === 'Indoklás');
    expect(reasonField).toBeUndefined();
  });

  it('sets orange color', () => {
    expect(auditEmbed({ action: 'X', user: '1', item: 'Y' }).data.color).toBe(0xf39c12);
  });
});
