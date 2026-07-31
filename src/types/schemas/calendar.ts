import { z } from 'zod';

/**
 * Offset applied when the model sends a wall-clock time with no timezone.
 * Defaults to Colombia, where the businesses using this MCP operate.
 */
const DEFAULT_UTC_OFFSET = process.env.MCP_DEFAULT_UTC_OFFSET || '-05:00';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const HAS_ZONE = /(?:Z|[+-]\d{2}:?\d{2})$/i;

/**
 * Models rarely emit strict UTC ISO strings: they send "2026-08-01T10:00",
 * "2026-08-01 10:00:00" or a local offset like "-05:00". Rejecting those made
 * bookings fail while the purchase order succeeded, so normalize instead.
 */
export function normalizeDateTime(raw: string): string | null {
  let value = raw.trim();
  if (!value) return null;

  if (DATE_ONLY.test(value)) {
    value = `${value}T00:00:00${DEFAULT_UTC_OFFSET}`;
  } else {
    value = value.replace(' ', 'T');

    const zoneMatch = value.match(HAS_ZONE);
    let zone = '';
    if (zoneMatch) {
      zone = zoneMatch[0].toUpperCase() === 'Z' ? 'Z' : zoneMatch[0];
      value = value.slice(0, value.length - zoneMatch[0].length);
      // Accept compact offsets such as "-0500"
      if (zone !== 'Z' && !zone.includes(':')) {
        zone = `${zone.slice(0, 3)}:${zone.slice(3)}`;
      }
    }

    // Pad "T10" / "T10:00" up to seconds
    const timePart = value.split('T')[1] ?? '';
    if (timePart === '') {
      value = `${value}T00:00:00`;
    } else if (timePart.split(':').length === 1) {
      value = `${value}:00:00`;
    } else if (timePart.split(':').length === 2) {
      value = `${value}:00`;
    }

    value = `${value}${zone || DEFAULT_UTC_OFFSET}`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return value;
}

const flexibleDateTime = z
  .string()
  .describe(
    'Date and time, e.g. "2026-08-01T10:00:00-05:00". Local times without a ' +
      'timezone ("2026-08-01 10:00") are read in the business timezone.'
  )
  .transform((value, ctx) => {
    const normalized = normalizeDateTime(value);
    if (!normalized) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid date/time "${value}". Use YYYY-MM-DDTHH:mm (optionally with offset, e.g. -05:00).`,
      });
      return z.NEVER;
    }
    return normalized;
  });

export const CreateAppointmentSchema = z
  .object({
    businessCalendarId: z.number().int().positive(),
    contactId: z.number().int().positive().optional(),
    contactName: z.string().min(1, 'Contact name is required'),
    // The CRM stores whichever channel is known; forcing an email made the
    // agent either invent one or hand the booking off to a human.
    contactEmail: z.string().email().optional(),
    contactPhone: z.string().min(1).optional(),
    startTime: flexibleDateTime,
    endTime: flexibleDateTime,
    status: z.string().default('confirmed'),
    title: z.string().optional(),
    description: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine((data) => Boolean(data.contactEmail || data.contactPhone || data.contactId), {
    message: 'Provide contactPhone or contactEmail (or an existing contactId).',
    path: ['contactPhone'],
  })
  .refine((data) => new Date(data.endTime) > new Date(data.startTime), {
    message: 'endTime must be after startTime.',
    path: ['endTime'],
  });
export type CreateAppointmentRequest = z.infer<typeof CreateAppointmentSchema>;

export const UpdateAppointmentSchema = z.object({
  startTime: flexibleDateTime.optional(),
  endTime: flexibleDateTime.optional(),
  status: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional()
});
export type UpdateAppointmentRequest = z.infer<typeof UpdateAppointmentSchema>;
