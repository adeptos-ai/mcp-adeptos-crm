import { describe, expect, it, vi, beforeEach } from 'vitest';
import { OrderController } from '../controllers/order.controller.js';
import { OrderService } from '../services/order.service.js';

describe('OrderController response mapping', () => {
  const service = {
    createPurchaseOrder: vi.fn(),
    getPurchaseOrders: vi.fn(),
    getPurchaseOrder: vi.fn(),
    updatePurchaseOrderStatus: vi.fn(),
    getPurchaseOrdersSummary: vi.fn(),
  } as unknown as OrderService;

  let controller: OrderController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new OrderController(service);
  });

  it('maps JWT-wrapped create responses', async () => {
    (service.createPurchaseOrder as any).mockResolvedValue({
      success: true,
      data: {
        result: {
          ok: true,
          deduped: false,
          purchaseOrder: {
            id: 10,
            businessId: 1,
            agentInstanceId: 2,
            customerPhone: '+573000000000',
            customerName: 'Ana',
            productName: 'Botox',
            variantName: '',
            productType: 'SERVICE',
            quantity: 1,
            note: '',
            sessionId: 's1',
            status: 'new',
            reportedAt: '2026-07-10T00:00:00Z',
            notifyStatus: 'sent',
          },
        },
      },
    });

    const result = await controller.handleCreatePurchaseOrder({
      agent_id: '35',
      customer_phone: '+573000000000',
      customer_name: 'Ana',
      product: '4',
      variant: '',
      note: '',
      session_id: 's1',
    });

    expect(result.success).toBe(true);
    expect(result.deduped).toBe(false);
    expect(result.order).toMatchObject({
      id: 10,
      customerName: 'Ana',
      productName: 'Botox',
      status: 'new',
    });
  });

  it('maps public agent create responses (no result wrapper)', async () => {
    (service.createPurchaseOrder as any).mockResolvedValue({
      success: true,
      data: {
        ok: true,
        deduped: true,
        purchaseOrder: {
          id: 11,
          businessId: 1,
          agentInstanceId: 2,
          customerPhone: '+573000000000',
          customerName: 'Ana',
          productName: 'Botox',
          variantName: 'Talla M',
          productType: 'PHYSICAL',
          quantity: 3,
          note: 'viernes',
          sessionId: 's2',
          status: 'new',
          reportedAt: '2026-07-10T00:00:00Z',
          notifyStatus: 'pending',
        },
      },
    });

    const result = await controller.handleCreatePurchaseOrder({
      agent_id: '35',
      customer_phone: '+573000000000',
      customer_name: 'Ana',
      product: '4',
      variant: 'Talla M',
      quantity: 3,
      note: 'viernes',
      session_id: 's2',
    });

    expect(result.success).toBe(true);
    expect(result.deduped).toBe(true);
    expect(result.message).toContain('deduplicada');
    expect(result.order.variantName).toBe('Talla M');
  });

  it('unwraps nested list payload from SendJsonResult', async () => {
    (service.getPurchaseOrders as any).mockResolvedValue({
      success: true,
      data: {
        result: {
          result: [
            {
              id: 1,
              businessId: 42,
              agentInstanceId: 1,
              customerPhone: '+573111',
              customerName: 'Bob',
              productName: 'Kit',
              variantName: '',
              productType: 'PHYSICAL',
              quantity: 2,
              note: '',
              sessionId: '',
              status: 'new',
              reportedAt: '2026-07-10T00:00:00Z',
              notifyStatus: 'sent',
            },
          ],
          total: 1,
        },
      },
    });

    const result = await controller.handleGetPurchaseOrders(42, {
      limit: 50,
      offset: 0,
    });

    expect(result.success).toBe(true);
    expect(result.total).toBe(1);
    expect(result.data[0]).toMatchObject({ id: 1, customerName: 'Bob' });
  });
});
