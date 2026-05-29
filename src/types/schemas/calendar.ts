import { z } from 'zod';

export const CreateAppointmentSchema = z.object({
  businessCalendarId: z.number().int().positive(),
  contactId: z.number().int().positive().optional(),
  contactName: z.string().min(1, 'Contact name is required'),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  status: z.string().default('confirmed'),
  title: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional()
});
export type CreateAppointmentRequest = z.infer<typeof CreateAppointmentSchema>;

export const UpdateAppointmentSchema = z.object({
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  status: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional()
});
export type UpdateAppointmentRequest = z.infer<typeof UpdateAppointmentSchema>;
