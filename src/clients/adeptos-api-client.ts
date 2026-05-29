import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { AdeptosConfig, AdeptosApiResponse } from '../types/interfaces/common.js';
import { ContactResponse } from '../types/interfaces/contacts.js';
import { AppointmentResponse } from '../types/interfaces/calendar.js';
import { OpportunityResponse, Pipeline } from '../types/interfaces/opportunities.js';
import { CreateContactRequest, UpdateContactRequest } from '../types/schemas/contacts.js';
import { CreateAppointmentRequest, UpdateAppointmentRequest } from '../types/schemas/calendar.js';
import { CreateOpportunityRequest, UpdateOpportunityRequest, MoveOpportunityRequest } from '../types/schemas/opportunities.js';
import { logger } from '../utils/logger.js';

export class AdeptosApiClient {
  private axiosInstance: AxiosInstance;

  constructor(private config: AdeptosConfig) {
    this.axiosInstance = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
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
    const message = error.response?.data?.error || error.message || 'Unknown error';
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

  async getContacts(businessId: number): Promise<AdeptosApiResponse<ContactResponse[]>> {
    try {
      const response: AxiosResponse<ContactResponse[]> = await this.axiosInstance.post(
        `/api/v1/business/${businessId}/customers`, {}
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

  async createOpportunity(data: CreateOpportunityRequest): Promise<AdeptosApiResponse<OpportunityResponse>> {
    try {
      const response: AxiosResponse<OpportunityResponse> = await this.axiosInstance.post(
        '/api/v1/opportunity/',
        data
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
}
