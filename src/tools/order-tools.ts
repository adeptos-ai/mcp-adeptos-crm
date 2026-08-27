import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { OrderController } from '../controllers/order.controller.js';
import { LeadCaptureService } from '../services/lead-capture.service.js';
import { ToolProvider } from '../types/tool-provider.js';
import {
  CreatePurchaseOrderSchema,
  CreatePurchaseOrderToolSchema,
  GetPurchaseOrdersSchema,
  UpdatePurchaseOrderStatusSchema,
} from '../types/schemas/order.js';
import { logger } from '../utils/logger.js';

export class OrderTools implements ToolProvider {
  constructor(
    private controller: OrderController,
    private businessId: number,
    /** Path / external agent id injected by demos via x-agent-id (per-agent, scalable). */
    private defaultAgentId: string = '',
    private leadCapture?: LeadCaptureService
  ) {}

  getTools(): Tool[] {
    return [
      {
        name: 'create_purchase_order',
        description:
          'Register a customer purchase intent for DIGITAL, PHYSICAL or SERVICE products (quantity = units bought). ' +
          'For products of type RESERVATION with check-in/check-out dates, prefer create_room_reservation instead (that tool sets quantity = nights and books the linked calendar). ' +
          'Requires customer_phone and product (id, slug or name). agent_id is optional. ' +
          'Duplicates within 24h for the same phone+product refresh the existing open order. ' +
          'Do not hand off to a human to create an order — call this tool.',
        inputSchema: zodToJsonSchema(CreatePurchaseOrderToolSchema) as any,
      },
      {
        name: 'get_purchase_orders',
        description:
          'List purchase orders for the business. Filter by status (new, contacted, completed, cancelled) or search by customer name, phone or product.',
        inputSchema: zodToJsonSchema(GetPurchaseOrdersSchema) as any,
      },
      {
        name: 'get_purchase_order',
        description: 'Get a single purchase order by its numeric ID.',
        inputSchema: {
          type: 'object',
          properties: {
            order_id: {
              type: 'integer',
              description: 'Purchase order ID',
            },
          },
          required: ['order_id'],
        },
      },
      {
        name: 'update_purchase_order_status',
        description:
          'Update the workflow status of a purchase order (new, contacted, completed, cancelled).',
        inputSchema: {
          type: 'object',
          properties: {
            order_id: {
              type: 'integer',
              description: 'Purchase order ID',
            },
            ...((zodToJsonSchema(UpdatePurchaseOrderStatusSchema) as any)
              .properties || {}),
          },
          required: ['order_id', 'status'],
        },
      },
      {
        name: 'get_purchase_orders_summary',
        description:
          'Get counts of purchase orders by status (new, contacted, completed, cancelled) plus total.',
        inputSchema: { type: 'object', properties: {} },
      },
    ];
  }

  /**
   * Prefer the runtime Path (x-agent-id) over whatever the LLM guessed.
   * That keeps every agent instance correct without hardcoding one id in catalog instructions.
   */
  private resolveAgentId(fromTool: unknown): string {
    const headerId = (this.defaultAgentId || '').trim();
    const argId =
      typeof fromTool === 'string' ? fromTool.trim() : String(fromTool ?? '').trim();
    if (headerId) {
      if (argId && argId !== headerId) {
        logger.warn(
          `[OrderTools] Ignoring LLM agent_id=${argId}; using x-agent-id=${headerId}`
        );
      }
      return headerId;
    }
    return argId;
  }

  async executeTool(
    toolName: string,
    params: Record<string, unknown>
  ): Promise<unknown> {
    switch (toolName) {
      case 'create_purchase_order': {
        const draft = CreatePurchaseOrderToolSchema.parse(params);
        const agentId = this.resolveAgentId(draft.agent_id);
        const valid = CreatePurchaseOrderSchema.parse({
          ...draft,
          agent_id: agentId,
          business_id: this.businessId,
        });
        if (!valid.agent_id && !valid.business_id) {
          throw new Error(
            'agent_id or business session is required to create a purchase order'
          );
        }
        const created = await this.controller.handleCreatePurchaseOrder(valid);
        try {
          const order = (created as any)?.order;
          if (order) {
            await this.leadCapture?.afterPurchaseOrder({
              customerPhone: order.customerPhone,
              customerName: order.customerName,
              productName: order.productName,
              note: order.note,
              quantity: order.quantity,
            });
          }
        } catch {
          // Order already created.
        }
        return created;
      }
      case 'get_purchase_orders': {
        const valid = GetPurchaseOrdersSchema.parse(params ?? {});
        return await this.controller.handleGetPurchaseOrders(
          this.businessId,
          valid
        );
      }
      case 'get_purchase_order': {
        if (params.order_id == null) {
          throw new Error('order_id is required');
        }
        const orderId = Number(params.order_id);
        if (!Number.isInteger(orderId) || orderId <= 0) {
          throw new Error('order_id must be a positive integer');
        }
        return await this.controller.handleGetPurchaseOrder(orderId);
      }
      case 'update_purchase_order_status': {
        if (params.order_id == null) {
          throw new Error('order_id is required');
        }
        const orderId = Number(params.order_id);
        if (!Number.isInteger(orderId) || orderId <= 0) {
          throw new Error('order_id must be a positive integer');
        }
        const valid = UpdatePurchaseOrderStatusSchema.parse(params);
        return await this.controller.handleUpdatePurchaseOrderStatus(
          orderId,
          valid
        );
      }
      case 'get_purchase_orders_summary':
        return await this.controller.handleGetPurchaseOrdersSummary(
          this.businessId
        );
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }
}
