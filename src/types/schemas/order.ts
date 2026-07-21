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
  check_in: z.string().optional().default(''), // YYYY-MM-DD for RESERVATION products
  check_out: z.string().optional().default(''),
  num_guests: z.number().int().positive().optional(),
});

/** Payload sent to Adeptos API (business_id enables backend fallback). */
export const CreatePurchaseOrderSchema = CreatePurchaseOrderToolSchema.extend({
  agent_id: z.string().optional().default(''),
  business_id: z.number().int().positive().optional(),
});
export type CreatePurchaseOrderRequest = z.infer<typeof CreatePurchaseOrderSchema>;

export const CheckRoomAvailabilitySchema = z.object({
  room: z.string().min(1, 'room is required'),
  check_in: z.string().min(1, 'check_in is required (YYYY-MM-DD)'),
  check_out: z.string().min(1, 'check_out is required (YYYY-MM-DD)'),
});
export type CheckRoomAvailabilityRequest = z.infer<typeof CheckRoomAvailabilitySchema>;

export const CreateRoomReservationSchema = z.object({
  room: z.string().min(1, 'room is required'),
  check_in: z.string().min(1, 'check_in is required (YYYY-MM-DD)'),
  check_out: z.string().min(1, 'check_out is required (YYYY-MM-DD)'),
  num_guests: z.number().int().positive().optional(),
  customer_phone: z.string().min(1, 'customer_phone is required'),
  customer_name: z.string().optional().default(''),
  customer_email: z.string().email().optional().or(z.literal('')).default(''),
  variant: z.string().optional().default(''),
  note: z.string().optional().default(''),
  agent_id: z.string().optional().default(''),
  session_id: z.string().optional().default(''),
});
export type CreateRoomReservationRequest = z.infer<typeof CreateRoomReservationSchema>;

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
