import { z } from 'zod';

export const PurchaseOrderStatusSchema = z.enum([
  'new',
  'contacted',
  'completed',
  'cancelled',
]);

export type PurchaseOrderStatus = z.infer<typeof PurchaseOrderStatusSchema>;

/** Payload aligned with POST /api/v1/agent/purchase-order and JWT create. */
export const CreatePurchaseOrderSchema = z.object({
  agent_id: z.string().min(1, 'agent_id is required'),
  customer_phone: z.string().min(1, 'customer_phone is required'),
  customer_name: z.string().optional().default(''),
  product: z.string().min(1, 'product is required'),
  variant: z.string().optional().default(''),
  quantity: z.number().int().positive().optional(),
  note: z.string().optional().default(''),
  session_id: z.string().optional().default(''),
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
