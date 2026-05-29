import { CalendarService } from '../services/calendar.service.js';
import { logger } from '../utils/logger.js';

export class CalendarController {
  constructor(private service: CalendarService) {}

  async handleGetCalendars(businessId: number) {
    logger.info(`[CalendarController] getCalendars called for businessId: ${businessId}`);
    return this.service.getCalendars(businessId);
  }

  async handleGetAppointments(businessId: number) {
    logger.info(`[CalendarController] getAppointments called for businessId: ${businessId}`);
    return this.service.getAppointments(businessId);
  }

  async handleCreateAppointment(data: any) {
    logger.info(`[CalendarController] createAppointment called`, data);
    return this.service.createAppointment(data);
  }

  async handleUpdateAppointment(appId: number, data: any) {
    logger.info(`[CalendarController] updateAppointment called for appId: ${appId}`, data);
    return this.service.updateAppointment(appId, data);
  }

  async handleDeleteAppointment(appId: number) {
    logger.info(`[CalendarController] deleteAppointment called for appId: ${appId}`);
    return this.service.deleteAppointment(appId);
  }
}
