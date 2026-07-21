/**
 * Simulation: LLM sends a wrong agent_id; MCP injects business_id from session.
 * Backend resolve logic is covered by Go tests; this covers the MCP payload shape.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { OrderTools } from '../tools/order-tools.js';
import { OrderController } from '../controllers/order.controller.js';

describe('Purchase order simulation (wrong agent_id + business fallback)', () => {
  const controller = {
    handleCreatePurchaseOrder: vi.fn(),
  } as unknown as OrderController;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('simulates Juan Store chat: wrong agent_id, business 7 from MCP session', async () => {
    const tools = new OrderTools(controller, 7 /* ADEPTOS_BUSINESS_ID / x-business-id */);
    (controller.handleCreatePurchaseOrder as any).mockResolvedValue({
      success: true,
      deduped: false,
      message: 'Orden de compra creada correctamente. El negocio fue notificado.',
      order: {
        id: 101,
        status: 'new',
        customerName: 'sebastian betan',
        customerPhone: '3123235534',
        productName: 'Orto',
        quantity: 1,
        businessId: 7,
        agentInstanceId: 99,
      },
    });

    // What the LLM typically sends after "dame un orto"
    const result = await tools.executeTool('create_purchase_order', {
      agent_id: 'juan-store', // wrong — not the Path "2"
      customer_name: 'sebastian betan',
      customer_phone: '3123235534',
      product: 'Orto',
      quantity: 1,
      note: 'Pedido desde chat',
    });

    expect(controller.handleCreatePurchaseOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        agent_id: 'juan-store', // MCP still forwards it
        business_id: 7, // backend uses this when agent_id fails
        customer_phone: '3123235534',
        product: 'Orto',
        quantity: 1,
      })
    );
    expect(result).toMatchObject({
      success: true,
      order: expect.objectContaining({ id: 101, productName: 'Orto' }),
    });
  });

  it('simulates x-agent-id Path=2 overriding wrong LLM id', async () => {
    const tools = new OrderTools(controller, 7, '2');
    (controller.handleCreatePurchaseOrder as any).mockResolvedValue({
      success: true,
      order: { id: 102 },
    });

    await tools.executeTool('create_purchase_order', {
      agent_id: 'wrong',
      customer_phone: '3123235534',
      product: 'Orto',
    });

    expect(controller.handleCreatePurchaseOrder).toHaveBeenCalledWith(
      expect.objectContaining({ agent_id: '2', business_id: 7 })
    );
  });
});
