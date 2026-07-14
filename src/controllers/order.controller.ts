import { OrderService } from '../services/order.service.js';
import {
  CreatePurchaseOrderRequest,
  GetPurchaseOrdersRequest,
  UpdatePurchaseOrderStatusRequest,
} from '../types/schemas/order.js';
import { logger } from '../utils/logger.js';

export class OrderController {
  constructor(private service: OrderService) {}

  private mapOrder(order: any) {
    return {
      id: order.id,
      status: order.status,
      customerName: order.customerName || '',
      customerPhone: order.customerPhone || '',
      productName: order.productName || '',
      variantName: order.variantName || '',
      productType: order.productType || '',
      productId: order.productId ?? null,
      quantity: order.quantity ?? null,
      note: order.note || '',
      sessionId: order.sessionId || '',
      reportedAt: order.reportedAt,
      notifyStatus: order.notifyStatus,
      businessId: order.businessId,
      agentInstanceId: order.agentInstanceId,
    };
  }

  async handleCreatePurchaseOrder(data: CreatePurchaseOrderRequest) {
    logger.info('[OrderController] createPurchaseOrder', {
      agent_id: data.agent_id,
      product: data.product,
      customer_phone: data.customer_phone,
    });

    const response = await this.service.createPurchaseOrder(data);
    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error ?? {
          message: 'Failed to create purchase order',
          statusCode: 500,
        },
      };
    }

    const payload = response.data.result ?? response.data;
    const order = payload.purchaseOrder;
    if (!order) {
      return {
        success: false,
        error: {
          message: 'Purchase order was not returned by the API',
          statusCode: 500,
        },
      };
    }

    return {
      success: true,
      deduped: Boolean(payload.deduped),
      message: payload.deduped
        ? 'Se actualizó una orden abierta existente (deduplicada en ventana de 24h).'
        : 'Orden de compra creada correctamente. El negocio fue notificado.',
      order: this.mapOrder(order),
    };
  }

  async handleGetPurchaseOrders(
    businessId: number,
    filters?: GetPurchaseOrdersRequest
  ) {
    logger.info(
      `[OrderController] getPurchaseOrders businessId=${businessId}`,
      filters
    );

    const response = await this.service.getPurchaseOrders(businessId, filters);
    if (response.success && response.data?.result) {
      const payload = response.data.result;
      const orders = Array.isArray(payload.result) ? payload.result : [];
      return {
        success: true,
        total: payload.total ?? orders.length,
        data: orders.map((o) => this.mapOrder(o)),
      };
    }
    return response;
  }

  async handleGetPurchaseOrder(orderId: number) {
    logger.info(`[OrderController] getPurchaseOrder orderId=${orderId}`);

    const response = await this.service.getPurchaseOrder(orderId);
    if (response.success && response.data?.result) {
      return {
        success: true,
        data: this.mapOrder(response.data.result),
      };
    }
    return response;
  }

  async handleUpdatePurchaseOrderStatus(
    orderId: number,
    data: UpdatePurchaseOrderStatusRequest
  ) {
    logger.info(
      `[OrderController] updatePurchaseOrderStatus orderId=${orderId}`,
      data
    );

    const response = await this.service.updatePurchaseOrderStatus(orderId, data);
    if (response.success && response.data?.result) {
      return {
        success: true,
        message: `Estado de la orden actualizado a "${data.status}".`,
        data: this.mapOrder(response.data.result),
      };
    }
    return response;
  }

  async handleGetPurchaseOrdersSummary(businessId: number) {
    logger.info(
      `[OrderController] getPurchaseOrdersSummary businessId=${businessId}`
    );

    const response = await this.service.getPurchaseOrdersSummary(businessId);
    if (response.success && response.data?.result) {
      return {
        success: true,
        data: response.data.result,
      };
    }
    return response;
  }
}
