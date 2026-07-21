import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  CheckRoomAvailabilitySchema,
  CreatePurchaseOrderSchema,
  CreateRoomReservationSchema,
  GetPurchaseOrdersSchema,
  UpdatePurchaseOrderStatusSchema,
} from '../schemas/order.js';
import { OrderTools } from '../../tools/order-tools.js';
import { HotelTools } from '../../tools/hotel-tools.js';
import { OrderController } from '../../controllers/order.controller.js';

describe('Purchase order Zod schemas', () => {
  it('accepts a valid create payload like the agent curl example', () => {
    const parsed = CreatePurchaseOrderSchema.parse({
      agent_id: '35',
      customer_name: 'Santiago Ospina',
      product: '4',
      variant: 'Talla M',
      quantity: 3,
      note: 'Quiere entrega para el viernes',
      customer_phone: '+573173062430',
      session_id: 'landing-2026-07-10-13-31-06-178-788f2512-1529-48b9-a672-50132fa73040',
    });

    expect(parsed.agent_id).toBe('35');
    expect(parsed.product).toBe('4');
    expect(parsed.quantity).toBe(3);
  });

  it('rejects create without required fields', () => {
    expect(() =>
      CreatePurchaseOrderSchema.parse({
        customer_phone: '',
        product: '',
      })
    ).toThrow();
  });

  it('accepts create with business_id and without agent_id', () => {
    const parsed = CreatePurchaseOrderSchema.parse({
      business_id: 7,
      customer_phone: '+573000000000',
      product: 'Orto',
    });
    expect(parsed.business_id).toBe(7);
    expect(parsed.agent_id).toBe('');
  });

  it('rejects non-positive quantity', () => {
    expect(() =>
      CreatePurchaseOrderSchema.parse({
        agent_id: '35',
        customer_phone: '+573000000000',
        product: '4',
        quantity: 0,
      })
    ).toThrow();
  });

  it('defaults list filters', () => {
    const parsed = GetPurchaseOrdersSchema.parse({});
    expect(parsed.limit).toBe(50);
    expect(parsed.offset).toBe(0);
  });

  it('accepts valid status updates only', () => {
    expect(
      UpdatePurchaseOrderStatusSchema.parse({ status: 'contacted' }).status
    ).toBe('contacted');
    expect(() =>
      UpdatePurchaseOrderStatusSchema.parse({ status: 'pending' })
    ).toThrow();
  });
});

describe('OrderTools', () => {
  const controller = {
    handleCreatePurchaseOrder: vi.fn(),
    handleGetPurchaseOrders: vi.fn(),
    handleGetPurchaseOrder: vi.fn(),
    handleUpdatePurchaseOrderStatus: vi.fn(),
    handleGetPurchaseOrdersSummary: vi.fn(),
  } as unknown as OrderController;

  let tools: OrderTools;

  beforeEach(() => {
    vi.clearAllMocks();
    tools = new OrderTools(controller, 42);
  });

  it('exposes the five purchase-order tools', () => {
    const names = tools.getTools().map((t) => t.name);
    expect(names).toEqual([
      'create_purchase_order',
      'get_purchase_orders',
      'get_purchase_order',
      'update_purchase_order_status',
      'get_purchase_orders_summary',
    ]);
  });

  it('create_purchase_order validates and delegates', async () => {
    (controller.handleCreatePurchaseOrder as any).mockResolvedValue({
      success: true,
      order: { id: 1 },
    });

    const result = await tools.executeTool('create_purchase_order', {
      agent_id: '35',
      customer_phone: '+573173062430',
      product: '4',
      quantity: 3,
    });

    expect(controller.handleCreatePurchaseOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        agent_id: '35',
        business_id: 42,
        customer_phone: '+573173062430',
        product: '4',
        quantity: 3,
      })
    );
    expect(result).toEqual({ success: true, order: { id: 1 } });
  });

  it('create_purchase_order prefers x-agent-id default over LLM agent_id', async () => {
    tools = new OrderTools(controller, 42, '2');
    (controller.handleCreatePurchaseOrder as any).mockResolvedValue({
      success: true,
      order: { id: 9 },
    });

    await tools.executeTool('create_purchase_order', {
      agent_id: 'wrong-id',
      customer_phone: '+573123235534',
      product: 'Orto',
      quantity: 1,
    });

    expect(controller.handleCreatePurchaseOrder).toHaveBeenCalledWith(
      expect.objectContaining({ agent_id: '2', product: 'Orto' })
    );
  });

  it('create_purchase_order fills agent_id from default when omitted', async () => {
    tools = new OrderTools(controller, 42, '2');
    (controller.handleCreatePurchaseOrder as any).mockResolvedValue({
      success: true,
      order: { id: 10 },
    });

    await tools.executeTool('create_purchase_order', {
      customer_phone: '+573123235534',
      product: 'Orto',
    });

    expect(controller.handleCreatePurchaseOrder).toHaveBeenCalledWith(
      expect.objectContaining({ agent_id: '2', business_id: 42 })
    );
  });

  it('create_purchase_order always sends business_id from MCP session', async () => {
    (controller.handleCreatePurchaseOrder as any).mockResolvedValue({
      success: true,
      order: { id: 11 },
    });

    await tools.executeTool('create_purchase_order', {
      agent_id: 'wrong',
      customer_phone: '+573123235534',
      product: 'Orto',
    });

    expect(controller.handleCreatePurchaseOrder).toHaveBeenCalledWith(
      expect.objectContaining({ business_id: 42 })
    );
  });

  it('get_purchase_orders uses businessId from MCP session', async () => {
    (controller.handleGetPurchaseOrders as any).mockResolvedValue({
      success: true,
      data: [],
      total: 0,
    });

    await tools.executeTool('get_purchase_orders', { status: 'new' });

    expect(controller.handleGetPurchaseOrders).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ status: 'new', limit: 50 })
    );
  });

  it('get_purchase_order requires a positive order_id', async () => {
    await expect(
      tools.executeTool('get_purchase_order', {})
    ).rejects.toThrow('order_id is required');

    await expect(
      tools.executeTool('get_purchase_order', { order_id: -1 })
    ).rejects.toThrow('order_id must be a positive integer');
  });

  it('update_purchase_order_status validates status + order_id', async () => {
    (controller.handleUpdatePurchaseOrderStatus as any).mockResolvedValue({
      success: true,
    });

    await tools.executeTool('update_purchase_order_status', {
      order_id: 9,
      status: 'completed',
    });

    expect(controller.handleUpdatePurchaseOrderStatus).toHaveBeenCalledWith(9, {
      status: 'completed',
    });
  });

  it('get_purchase_orders_summary delegates with businessId', async () => {
    (controller.handleGetPurchaseOrdersSummary as any).mockResolvedValue({
      success: true,
      data: { total: 0 },
    });

    await tools.executeTool('get_purchase_orders_summary', {});
    expect(controller.handleGetPurchaseOrdersSummary).toHaveBeenCalledWith(42);
  });
});

describe('Hotel reservation Zod schemas', () => {
  it('requires room and stay dates for availability', () => {
    const parsed = CheckRoomAvailabilitySchema.parse({
      room: 'Suite Mar',
      check_in: '2026-08-01',
      check_out: '2026-08-03',
    });
    expect(parsed.room).toBe('Suite Mar');
  });

  it('requires customer_phone for create_room_reservation', () => {
    expect(() =>
      CreateRoomReservationSchema.parse({
        room: '1',
        check_in: '2026-08-01',
        check_out: '2026-08-02',
      })
    ).toThrow();
  });
});

describe('HotelTools', () => {
  it('exposes check_room_availability and create_room_reservation', () => {
    const tools = new HotelTools(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      1,
      '2'
    ).getTools();
    expect(tools.map((t) => t.name)).toEqual([
      'check_room_availability',
      'create_room_reservation',
    ]);
  });

  it('returns unavailable when product lookup finds nothing', async () => {
    const productsController = {
      handleCheckAvailability: vi.fn().mockResolvedValue({
        success: true,
        products: [],
        message: 'not found',
      }),
    };
    const hotel = new HotelTools(
      {} as any,
      productsController as any,
      {} as any,
      {} as any,
      7,
      '2'
    );
    const result = (await hotel.executeTool('check_room_availability', {
      room: 'Ghost',
      check_in: '2026-08-01',
      check_out: '2026-08-03',
    })) as any;
    expect(result.success).toBe(false);
    expect(result.available).toBe(false);
  });
});
