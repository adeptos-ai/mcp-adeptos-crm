import { AdeptosApiClient } from '../clients/adeptos-api-client.js';
import { CreateAppointmentRequest, UpdateAppointmentRequest } from '../types/schemas/calendar.js';
import { AppointmentResponse } from '../types/interfaces/calendar.js';

/** Unwrap Adeptos `{ result: T }` (or nested) into the payload. */
function unwrapResult<T>(res: any): T {
  let cur = res?.data !== undefined ? res.data : res;
  while (cur && typeof cur === 'object' && !Array.isArray(cur) && cur.result !== undefined) {
    cur = cur.result;
  }
  return cur as T;
}

function overlaps(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && startB < endA;
}

function dateFromIso(iso: string): string {
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  return new Date(iso).toISOString().slice(0, 10);
}

export class CalendarService {
  constructor(private client: AdeptosApiClient) {}

  async getCalendars(businessId: number) {
    return this.client.getCalendars(businessId);
  }

  async getAppointments(businessId: number) {
    return this.client.getAppointments(businessId);
  }

  async getFreeSlots(calendarId: number, date: string) {
    return this.client.getFreeSlots(calendarId, date);
  }

  async createAppointment(data: CreateAppointmentRequest) {
    await this.assertSlotFree(data.businessCalendarId, data.startTime, data.endTime);
    return this.client.createAppointment(data);
  }

  async updateAppointment(appId: number, data: UpdateAppointmentRequest) {
    return this.client.updateAppointment(appId, data);
  }

  async deleteAppointment(appId: number) {
    return this.client.deleteAppointment(appId);
  }

  /**
   * Same overlap rule as the API: start < existingEnd && existingStart < end.
   * On conflict, include free slots for that day when available.
   */
  private async assertSlotFree(
    calendarId: number,
    startTime: string,
    endTime: string,
    excludeId?: number
  ): Promise<void> {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      throw new Error('Invalid startTime/endTime for availability check.');
    }

    let appointments: AppointmentResponse[] = [];
    try {
      const res = await this.client.getCalendarAppointments(calendarId);
      const raw = unwrapResult<AppointmentResponse[]>(res);
      appointments = Array.isArray(raw) ? raw : [];
    } catch {
      // If listing fails, let the API be the source of truth on create.
      return;
    }

    const conflicts = appointments.filter((a) => {
      if (!a || a.status === 'cancelled') return false;
      if (excludeId && a.id === excludeId) return false;
      const aStart = new Date(a.startTime).getTime();
      const aEnd = new Date(a.endTime).getTime();
      if (!Number.isFinite(aStart) || !Number.isFinite(aEnd)) return false;
      return overlaps(start, end, aStart, aEnd);
    });

    if (conflicts.length === 0) return;

    const date = dateFromIso(startTime);
    let freeSlots: string[] = [];
    try {
      const slotsRes = await this.client.getFreeSlots(calendarId, date);
      const raw = unwrapResult<string[]>(slotsRes);
      freeSlots = Array.isArray(raw) ? raw : [];
    } catch {
      // alternatives are best-effort
    }

    const conflictSummary = conflicts
      .map((c) => `#${c.id} ${c.startTime}–${c.endTime} (${c.contactName || 'busy'})`)
      .join('; ');
    const alternatives =
      freeSlots.length > 0
        ? `Free slots on ${date}: ${freeSlots.join(', ')}.`
        : `No free slots found on ${date} (or slots could not be loaded).`;

    throw new Error(
      `slot_unavailable: requested time overlaps existing appointment(s): ${conflictSummary}. ` +
        `${alternatives} Call get_free_slots and book only a free slot.`
    );
  }
}
