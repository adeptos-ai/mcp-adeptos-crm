import { z } from 'zod';

export const CreateContactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  type: z.string().default('lead'),
  enabled: z.boolean().default(true),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().optional(),
  fields: z.record(z.any()).optional()
});
export type CreateContactRequest = z.infer<typeof CreateContactSchema>;

export const UpdateContactSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  type: z.string().optional(),
  enabled: z.boolean().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().optional(),
  fields: z.record(z.any()).optional()
});
export type UpdateContactRequest = z.infer<typeof UpdateContactSchema>;
