import { z } from 'zod';

export const CreateOpportunitySchema = z.object({
  customerId: z.number().int().positive(),
  stageId: z.number().int().positive(),
  name: z.string().min(1),
  value: z.number().optional().default(0),
  status: z.string().optional().default('open'),
  order: z.number().optional().default(0)
});
export type CreateOpportunityRequest = z.infer<typeof CreateOpportunitySchema>;

export const UpdateOpportunitySchema = z.object({
  name: z.string().optional(),
  value: z.number().optional(),
  status: z.string().optional(),
  stageId: z.number().int().positive().optional(),
  order: z.number().optional()
});
export type UpdateOpportunityRequest = z.infer<typeof UpdateOpportunitySchema>;

export const MoveOpportunitySchema = z.object({
  stageId: z.number().int().positive(),
  order: z.number().optional()
});
export type MoveOpportunityRequest = z.infer<typeof MoveOpportunitySchema>;
