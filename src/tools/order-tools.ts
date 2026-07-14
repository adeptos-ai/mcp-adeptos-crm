import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { OrderController } from '../controllers/order.controller.js';
import { ToolProvider } from '../types/tool-provider.js';
import {
  CreatePurchaseOrderSchema,
  GetPurchaseOrdersSchema,
  UpdatePurchaseOrderStatusSchema,
} from '../types/schemas/order.js';

export class OrderTools implements ToolProvider {
  constructor(
    private controller: OrderController,
    private businessId: number
  ) {}

  getTools(): Tool[] {
    return [
      {
        name: 'create_purchase_order',
        description:
          'Register a customer purchase/reservation intent for a product. ' +
          'Use when the customer confirms they want to buy or reserve something. ' +
          'Requires agent_id, customer_phone and product (id, slug or name). ' +
          'Duplicates within 24h for the same phone+product refresh the existing open order.',
        inputSchema: zodToJsonSchema(CreatePurchaseOrderSchema) as any,
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

  async executeTool(
    toolName: string,
    params: Record<string, unknown>
  ): Promise<unknown> {
    switch (toolName) {
      case 'create_purchase_order': {
        const valid = CreatePurchaseOrderSchema.parse(params);
        return await this.controller.handleCreatePurchaseOrder(valid);
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
