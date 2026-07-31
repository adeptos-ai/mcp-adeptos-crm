import { describe, it, expect } from 'vitest';
import { CreateAppointmentSchema, normalizeDateTime } from '../schemas/calendar.js';

describe('normalizeDateTime', () => {
  it('accepts strict UTC', () => {
    expect(normalizeDateTime('2026-08-01T10:00:00.000Z')).toBe('2026-08-01T10:00:00.000Z');
  });

  it('keeps an explicit offset', () => {
    expect(normalizeDateTime('2026-08-01T10:00:00-05:00')).toBe('2026-08-01T10:00:00-05:00');
  });

  it('expands a compact offset', () => {
    expect(normalizeDateTime('2026-08-01T10:00:00-0500')).toBe('2026-08-01T10:00:00-05:00');
  });

  it('assumes the business timezone when none is given', () => {
    expect(normalizeDateTime('2026-08-01T10:00')).toBe('2026-08-01T10:00:00-05:00');
  });

  it('accepts a space separator', () => {
    expect(normalizeDateTime('2026-08-01 10:00:00')).toBe('2026-08-01T10:00:00-05:00');
  });

  it('treats a bare date as midnight', () => {
    expect(normalizeDateTime('2026-08-01')).toBe('2026-08-01T00:00:00-05:00');
  });

  it('rejects garbage', () => {
    expect(normalizeDateTime('mañana a las 10')).toBeNull();
    expect(normalizeDateTime('')).toBeNull();
  });
});

describe('CreateAppointmentSchema', () => {
  const base = {
    businessCalendarId: 12,
    contactName: 'Sebastián',
    contactPhone: '+573149023401',
    startTime: '2026-08-01 09:00',
    endTime: '2026-08-01 18:00'
  };

  it('books with a phone and local times, no email required', () => {
    const parsed = CreateAppointmentSchema.parse(base);
    expect(parsed.startTime).toBe('2026-08-01T09:00:00-05:00');
    expect(parsed.endTime).toBe('2026-08-01T18:00:00-05:00');
    expect(parsed.status).toBe('confirmed');
  });

  it('requires some way to reach the contact', () => {
    const { contactPhone, ...noContact } = base;
    expect(() => CreateAppointmentSchema.parse(noContact)).toThrow();
  });

  it('rejects an end before the start', () => {
    expect(() =>
      CreateAppointmentSchema.parse({ ...base, endTime: '2026-08-01 08:00' })
    ).toThrow();
  });
});
