import { AdeptosApiClient } from '../clients/adeptos-api-client.js';
import { CreateAppointmentRequest, UpdateAppointmentRequest } from '../types/schemas/calendar.js';

export class CalendarService {
  constructor(private client: AdeptosApiClient) {}

  async getCalendars(businessId: number) {
    return this.client.getCalendars(businessId);
  }

  async getAppointments(businessId: number) {
    return this.client.getAppointments(businessId);
  }

  async createAppointment(data: CreateAppointmentRequest) {
    return this.client.createAppointment(data);
  }

  async updateAppointment(appId: number, data: UpdateAppointmentRequest) {
    return this.client.updateAppointment(appId, data);
  }

  async deleteAppointment(appId: number) {
    return this.client.deleteAppointment(appId);
  }
}
