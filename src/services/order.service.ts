import { AdeptosApiClient } from '../clients/adeptos-api-client.js';
import {
  CreatePurchaseOrderRequest,
  GetPurchaseOrdersRequest,
  UpdatePurchaseOrderStatusRequest,
} from '../types/schemas/order.js';

export class OrderService {
  constructor(private client: AdeptosApiClient) {}

  async createPurchaseOrder(data: CreatePurchaseOrderRequest) {
    return this.client.createPurchaseOrder(data);
  }

  async getPurchaseOrders(businessId: number, filters?: GetPurchaseOrdersRequest) {
    return this.client.getPurchaseOrders(businessId, filters);
  }

  async getPurchaseOrder(orderId: number) {
    return this.client.getPurchaseOrder(orderId);
  }

  async updatePurchaseOrderStatus(
    orderId: number,
    data: UpdatePurchaseOrderStatusRequest
  ) {
    return this.client.updatePurchaseOrderStatus(orderId, data);
  }

  async getPurchaseOrdersSummary(businessId: number) {
    return this.client.getPurchaseOrdersSummary(businessId);
  }
}
