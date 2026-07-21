import { z } from 'zod';

export const PurchaseOrderStatusSchema = z.enum([
  'new',
  'contacted',
  'completed',
  'cancelled',
]);

export type PurchaseOrderStatus = z.infer<typeof PurchaseOrderStatusSchema>;

/** Tool input: agent_id is optional; MCP always sends business_id from the session. */
export const CreatePurchaseOrderToolSchema = z.object({
  agent_id: z.string().optional().default(''),
  customer_phone: z.string().min(1, 'customer_phone is required'),
  customer_name: z.string().optional().default(''),
  product: z.string().min(1, 'product is required'),
  variant: z.string().optional().default(''),
  quantity: z.number().int().positive().optional(),
  note: z.string().optional().default(''),
  session_id: z.string().optional().default(''),
});

/** Payload sent to Adeptos API (business_id enables backend fallback). */
export const CreatePurchaseOrderSchema = CreatePurchaseOrderToolSchema.extend({
  agent_id: z.string().optional().default(''),
  business_id: z.number().int().positive().optional(),
});
export type CreatePurchaseOrderRequest = z.infer<typeof CreatePurchaseOrderSchema>;

export const GetPurchaseOrdersSchema = z.object({
  status: PurchaseOrderStatusSchema.optional(),
  search: z.string().optional(),
  limit: z.number().int().positive().max(100).optional().default(50),
  offset: z.number().int().nonnegative().optional().default(0),
});
export type GetPurchaseOrdersRequest = z.infer<typeof GetPurchaseOrdersSchema>;

export const UpdatePurchaseOrderStatusSchema = z.object({
  status: PurchaseOrderStatusSchema,
});
export type UpdatePurchaseOrderStatusRequest = z.infer<
  typeof UpdatePurchaseOrderStatusSchema
>;
