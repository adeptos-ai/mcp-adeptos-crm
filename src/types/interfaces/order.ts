/** Mirrors api/api/models/purchase_order.go PurchaseOrder JSON. */
export interface PurchaseOrder {
  id: number;
  businessId: number;
  agentInstanceId: number;
  customerPhone: string;
  customerName: string;
  productId?: number | null;
  productName: string;
  variantId?: number | null;
  variantName: string;
  productType: string;
  quantity?: number | null;
  note: string;
  sessionId: string;
  lineInstanceId: number;
  status: 'new' | 'contacted' | 'completed' | 'cancelled';
  reportedAt: string;
  notifyStatus: string;
  notifyError: string;
  notifyAttempts: number;
  notifyResults: string;
  lastNotifyAt?: string | null;
  product?: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrdersListPayload {
  result: PurchaseOrder[];
  total: number;
}

/** Response from utils.SendJsonResult wrapping the list payload. */
export interface PurchaseOrdersListApiResponse {
  result: PurchaseOrdersListPayload;
}

export interface PurchaseOrderApiResponse {
  result: PurchaseOrder;
}

export interface PurchaseOrdersSummary {
  new: number;
  contacted: number;
  completed: number;
  cancelled: number;
  total: number;
}

export interface PurchaseOrdersSummaryApiResponse {
  result: PurchaseOrdersSummary;
}

/** Response from agent/JWT create endpoints. */
export interface CreatePurchaseOrderApiResponse {
  ok?: boolean;
  deduped?: boolean;
  purchaseOrder?: PurchaseOrder;
  result?: {
    ok: boolean;
    deduped: boolean;
    purchaseOrder: PurchaseOrder;
  };
  error?: string;
}
