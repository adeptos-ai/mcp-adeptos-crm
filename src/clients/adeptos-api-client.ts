import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { AdeptosConfig, AdeptosApiResponse } from '../types/interfaces/common.js';
import { ContactResponse } from '../types/interfaces/contacts.js';
import { AppointmentResponse } from '../types/interfaces/calendar.js';
import { OpportunityResponse, Pipeline } from '../types/interfaces/opportunities.js';
import { CreateContactRequest, UpdateContactRequest } from '../types/schemas/contacts.js';
import { CreateAppointmentRequest, UpdateAppointmentRequest } from '../types/schemas/calendar.js';
import { CreateOpportunityRequest, UpdateOpportunityRequest, MoveOpportunityRequest } from '../types/schemas/opportunities.js';
import { ProductsListApiResponse, CollectionsApiResponse, InventoryApiResponse } from '../types/interfaces/products.js';
import {
  CreatePurchaseOrderApiResponse,
  PurchaseOrderApiResponse,
  PurchaseOrdersListApiResponse,
  PurchaseOrdersSummaryApiResponse,
} from '../types/interfaces/order.js';
import {
  CreatePurchaseOrderRequest,
  GetPurchaseOrdersRequest,
  UpdatePurchaseOrderStatusRequest,
} from '../types/schemas/order.js';
import { logger } from '../utils/logger.js';

/** Packed durable credentials: mcpv1.<client_id>.<client_secret> */
function parseMcpAccessToken(
  token: string
): { clientId: string; clientSecret: string } | null {
  const raw = (token || '').trim();
  if (!raw.startsWith('mcpv1.')) return null;
  const rest = raw.slice('mcpv1.'.length);
  const dot = rest.indexOf('.');
  if (dot <= 0 || dot === rest.length - 1) return null;
  return {
    clientId: rest.slice(0, dot),
    clientSecret: rest.slice(dot + 1),
  };
}

export class AdeptosApiClient {
  private axiosInstance: AxiosInstance;

  constructor(private config: AdeptosConfig) {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${config.accessToken}`,
      Cookie: `adeptosJWT=${config.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (config.businessId && config.businessId > 0) {
      headers['x-business-id'] = String(config.businessId);
    }
    // Durable MCP client_id/secret packed as mcpv1.<id>.<secret> (no browser JWT).
    const mcpCreds = parseMcpAccessToken(config.accessToken);
    if (mcpCreds) {
      headers['X-MCP-Client-Id'] = mcpCreds.clientId;
      headers['X-MCP-Client-Secret'] = mcpCreds.clientSecret;
    }

    this.axiosInstance = axios.create({
      baseURL: config.baseUrl,
      headers,
      timeout: 30000,
    });

    this.axiosInstance.interceptors.request.use(
      (config) => {
        logger.info(`[ADEPTOS API REQUEST] ${config.method?.toUpperCase()} ${config.url}`);
        if (config.data) {
          logger.debug(`[ADEPTOS API PAYLOAD]`, JSON.stringify(config.data));
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.axiosInstance.interceptors.response.use(
      (response) => {
        logger.info(`[ADEPTOS API RESPONSE] ${response.status}: ${response.config.url}`);
        if (response.data) {
          logger.debug(`[ADEPTOS API DATA]`, JSON.stringify(response.data).substring(0, 500) + '...');
        }
        return response;
      },
      (error: AxiosError<any>) => {
        logger.error(`[ADEPTOS API ERROR] Status: ${error.response?.status} - URL: ${error.config?.url}`);
        logger.error(`[ADEPTOS API ERROR DETAILS]`, error.response?.data || error.message);
        return Promise.reject(this.handleApiError(error));
      }
    );
  }

  private handleApiError(error: AxiosError<any>): Error {
    const status = error.response?.status || 500;
    const data = error.response?.data;
    let message = error.message || 'Unknown error';
    if (typeof data?.error === 'string') {
      message = data.error;
    } else if (data?.error?.message) {
      message = data.error.message;
    } else if (typeof data?.message === 'string') {
      message = data.message;
    }
    return new Error(`Adeptos API Error (${status}): ${message}`);
  }

  private wrapResponse<T>(data: T): AdeptosApiResponse<T> {
    return {
      success: true,
      data
    };
  }

  // ---------------------------------------------------------------------------
  // CONTACTS
  // ---------------------------------------------------------------------------

  async getContacts(
    businessId: number,
    searchTerm?: string
  ): Promise<AdeptosApiResponse<ContactResponse[]>> {
    try {
      const response: AxiosResponse<ContactResponse[]> = await this.axiosInstance.post(
        `/api/v1/business/${businessId}/customers`,
        { searchTerm: searchTerm || '', paginate: false }
      );
      return this.wrapResponse(response.data);
    } catch (error) {
      throw error;
    }
  }

  async createContact(businessId: number, data: CreateContactRequest): Promise<AdeptosApiResponse<ContactResponse>> {
    try {
      const response: AxiosResponse<ContactResponse> = await this.axiosInstance.post(
        `/api/v1/business/${businessId}/customers/new`,
        data
      );
      return this.wrapResponse(response.data);
    } catch (error) {
      throw error;
    }
  }

  async updateContact(businessId: number, contactId: number, data: UpdateContactRequest): Promise<AdeptosApiResponse<ContactResponse>> {
    try {
      const response: AxiosResponse<ContactResponse> = await this.axiosInstance.put(
        `/api/v1/business/${businessId}/customers/${contactId}`,
        data
      );
      return this.wrapResponse(response.data);
    } catch (error) {
      throw error;
    }
  }

  async deleteContact(businessId: number, contactId: number): Promise<AdeptosApiResponse<{ message: string }>> {
    try {
      const response: AxiosResponse<{ message: string }> = await this.axiosInstance.delete(
        `/api/v1/business/${businessId}/customers/${contactId}`
      );
      return this.wrapResponse(response.data);
    } catch (error) {
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // CALENDAR
  // ---------------------------------------------------------------------------

  async getCalendars(businessId: number): Promise<AdeptosApiResponse<any[]>> {
    try {
      const response: AxiosResponse<any[]> = await this.axiosInstance.get(
        `/api/v1/calendar?businessId=${businessId}`
      );
      return this.wrapResponse(response.data);
    } catch (error) {
      throw error;
    }
  }

  async getAppointments(businessId: number): Promise<AdeptosApiResponse<AppointmentResponse[]>> {
    try {
      const response: AxiosResponse<AppointmentResponse[]> = await this.axiosInstance.get(
        `/api/v1/calendar/appointments?businessId=${businessId}`
      );
      return this.wrapResponse(response.data);
    } catch (error) {
      throw error;
    }
  }

  async createAppointment(data: CreateAppointmentRequest): Promise<AdeptosApiResponse<AppointmentResponse>> {
    try {
      const response: AxiosResponse<AppointmentResponse> = await this.axiosInstance.post(
        '/api/v1/calendar/appointments',
        data
      );
      return this.wrapResponse(response.data);
    } catch (error) {
      throw error;
    }
  }

  async updateAppointment(appId: number, data: UpdateAppointmentRequest): Promise<AdeptosApiResponse<AppointmentResponse>> {
    try {
      const response: AxiosResponse<AppointmentResponse> = await this.axiosInstance.put(
        `/api/v1/calendar/appointments/${appId}`,
        data
      );
      return this.wrapResponse(response.data);
    } catch (error) {
      throw error;
    }
  }

  async deleteAppointment(appId: number): Promise<AdeptosApiResponse<{ message: string }>> {
    try {
      const response: AxiosResponse<{ message: string }> = await this.axiosInstance.delete(
        `/api/v1/calendar/appointments/${appId}`
      );
      return this.wrapResponse(response.data);
    } catch (error) {
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // OPPORTUNITIES
  // ---------------------------------------------------------------------------

  async getPipelines(businessId: number): Promise<AdeptosApiResponse<Pipeline[]>> {
    try {
      const response: AxiosResponse<Pipeline[]> = await this.axiosInstance.get(
        `/api/v1/opportunity/pipelines?businessId=${businessId}`
      );
      return this.wrapResponse(response.data);
    } catch (error) {
      throw error;
    }
  }

  async getOpportunities(businessId: number): Promise<AdeptosApiResponse<OpportunityResponse[]>> {
    try {
      const response: AxiosResponse<OpportunityResponse[]> = await this.axiosInstance.get(
        `/api/v1/opportunity/?businessId=${businessId}`
      );
      return this.wrapResponse(response.data);
    } catch (error) {
      throw error;
    }
  }

  async createOpportunity(businessId: number, data: CreateOpportunityRequest): Promise<AdeptosApiResponse<OpportunityResponse>> {
    try {
      const response: AxiosResponse<OpportunityResponse> = await this.axiosInstance.post(
        '/api/v1/opportunity/',
        {
          ...data,
          businessId
        }
      );
      return this.wrapResponse(response.data);
    } catch (error) {
      throw error;
    }
  }

  async updateOpportunity(oppId: number, data: UpdateOpportunityRequest): Promise<AdeptosApiResponse<OpportunityResponse>> {
    try {
      const response: AxiosResponse<OpportunityResponse> = await this.axiosInstance.put(
        `/api/v1/opportunity/${oppId}`,
        data
      );
      return this.wrapResponse(response.data);
    } catch (error) {
      throw error;
    }
  }

  async moveOpportunity(oppId: number, data: MoveOpportunityRequest): Promise<AdeptosApiResponse<{ message: string }>> {
    try {
      const response: AxiosResponse<{ message: string }> = await this.axiosInstance.patch(
        `/api/v1/opportunity/${oppId}/move`,
        data
      );
      return this.wrapResponse(response.data);
    } catch (error) {
      throw error;
    }
  }

  async deleteOpportunity(oppId: number, businessId: number): Promise<AdeptosApiResponse<{ message: string }>> {
    try {
      const response: AxiosResponse<{ message: string }> = await this.axiosInstance.delete(
        `/api/v1/opportunity/${oppId}?businessId=${businessId}`
      );
      return this.wrapResponse(response.data);
    } catch (error) {
      throw error;
    }
  }

  async createOpportunityNote(
    businessId: number,
    oppId: number,
    content: string
  ): Promise<AdeptosApiResponse<any>> {
    try {
      const response: AxiosResponse<any> = await this.axiosInstance.post(
        `/api/v1/opportunity/${oppId}/notes?businessId=${businessId}`,
        { content }
      );
      return this.wrapResponse(response.data);
    } catch (error) {
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // PRODUCTS
  // ---------------------------------------------------------------------------

  async getProducts(
    businessId: number,
    filters?: { search?: string; productType?: string; collectionId?: number; limit?: number; offset?: number }
  ): Promise<AdeptosApiResponse<ProductsListApiResponse>> {
    try {
      const params = new URLSearchParams();
      params.append('businessId', businessId.toString());
      if (filters?.search) params.append('search', filters.search);
      if (filters?.productType) params.append('productType', filters.productType);
      if (filters?.collectionId) params.append('collectionId', filters.collectionId.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());

      const response: AxiosResponse<ProductsListApiResponse> = await this.axiosInstance.get(
        `/api/v1/product/?${params.toString()}`
      );
      return this.wrapResponse(response.data);
    } catch (error) {
      throw error;
    }
  }

  async getInventory(businessId: number): Promise<AdeptosApiResponse<InventoryApiResponse>> {
    try {
      const response: AxiosResponse<InventoryApiResponse> = await this.axiosInstance.get(
        `/api/v1/product/inventory?businessId=${businessId}`
      );
      return this.wrapResponse(response.data);
    } catch (error) {
      throw error;
    }
  }

  async getProductCollections(businessId: number): Promise<AdeptosApiResponse<CollectionsApiResponse>> {
    try {
      const response: AxiosResponse<CollectionsApiResponse> = await this.axiosInstance.get(
        `/api/v1/product/collections?businessId=${businessId}`
      );
      return this.wrapResponse(response.data);
    } catch (error) {
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // PURCHASE ORDERS
  // ---------------------------------------------------------------------------

  /**
   * Creates via JWT-protected POST /api/v1/purchase-orders/.
   * Falls back to the public agent endpoint if the protected route is unavailable (404/405).
   */
  async createPurchaseOrder(
    data: CreatePurchaseOrderRequest
  ): Promise<AdeptosApiResponse<CreatePurchaseOrderApiResponse>> {
    const body = {
      agent_id: data.agent_id,
      business_id: data.business_id,
      customer_phone: data.customer_phone,
      customer_name: data.customer_name ?? '',
      product: data.product,
      variant: data.variant ?? '',
      quantity: data.quantity,
      note: data.note ?? '',
      session_id: data.session_id ?? '',
      check_in: data.check_in || undefined,
      check_out: data.check_out || undefined,
      num_guests: data.num_guests,
    };

    try {
      const response: AxiosResponse<CreatePurchaseOrderApiResponse> =
        await this.axiosInstance.post('/api/v1/purchase-orders/', body);
      return this.wrapResponse(response.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const canFallback = /\((404|405)\)/.test(message);
      if (!canFallback) {
        throw error;
      }
      logger.warn(
        '[ADEPTOS API] Protected create purchase-order unavailable; falling back to agent endpoint'
      );
      const response: AxiosResponse<CreatePurchaseOrderApiResponse> =
        await this.axiosInstance.post('/api/v1/agent/purchase-order', body);
      return this.wrapResponse(response.data);
    }
  }

  async getPurchaseOrders(
    businessId: number,
    filters?: GetPurchaseOrdersRequest
  ): Promise<AdeptosApiResponse<PurchaseOrdersListApiResponse>> {
    try {
      const params = new URLSearchParams();
      params.append('businessId', businessId.toString());
      if (filters?.status) params.append('status', filters.status);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.limit != null) params.append('limit', String(filters.limit));
      if (filters?.offset != null) params.append('offset', String(filters.offset));

      const response: AxiosResponse<PurchaseOrdersListApiResponse> =
        await this.axiosInstance.get(
          `/api/v1/purchase-orders/?${params.toString()}`
        );
      return this.wrapResponse(response.data);
    } catch (error) {
      throw error;
    }
  }

  async getPurchaseOrder(
    orderId: number
  ): Promise<AdeptosApiResponse<PurchaseOrderApiResponse>> {
    try {
      const response: AxiosResponse<PurchaseOrderApiResponse> =
        await this.axiosInstance.get(`/api/v1/purchase-orders/${orderId}`);
      return this.wrapResponse(response.data);
    } catch (error) {
      throw error;
    }
  }

  async updatePurchaseOrderStatus(
    orderId: number,
    data: UpdatePurchaseOrderStatusRequest
  ): Promise<AdeptosApiResponse<PurchaseOrderApiResponse>> {
    try {
      const response: AxiosResponse<PurchaseOrderApiResponse> =
        await this.axiosInstance.put(
          `/api/v1/purchase-orders/${orderId}/status`,
          { status: data.status }
        );
      return this.wrapResponse(response.data);
    } catch (error) {
      throw error;
    }
  }

  async getPurchaseOrdersSummary(
    businessId: number
  ): Promise<AdeptosApiResponse<PurchaseOrdersSummaryApiResponse>> {
    try {
      const response: AxiosResponse<PurchaseOrdersSummaryApiResponse> =
        await this.axiosInstance.get(
          `/api/v1/purchase-orders/summary?businessId=${businessId}`
        );
      return this.wrapResponse(response.data);
    } catch (error) {
      throw error;
    }
  }
}
