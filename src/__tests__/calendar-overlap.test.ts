import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CalendarService } from '../services/calendar.service.js';

describe('CalendarService.createAppointment pre-check', () => {
  const client = {
    getCalendarAppointments: vi.fn(),
    getFreeSlots: vi.fn(),
    createAppointment: vi.fn(),
    getCalendars: vi.fn(),
    getAppointments: vi.fn(),
    updateAppointment: vi.fn(),
    deleteAppointment: vi.fn(),
  };

  let service: CalendarService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CalendarService(client as any);
  });

  it('rejects overlapping slot and includes free alternatives', async () => {
    client.getCalendarAppointments.mockResolvedValue({
      success: true,
      data: {
        result: [
          {
            id: 7,
            businessCalendarId: 40,
            contactName: 'Existing',
            startTime: '2026-09-24T10:00:00Z',
            endTime: '2026-09-24T10:30:00Z',
            status: 'confirmed',
          },
        ],
      },
    });
    client.getFreeSlots.mockResolvedValue({
      success: true,
      data: { result: ['09:30', '11:00', '11:30'] },
    });

    await expect(
      service.createAppointment({
        businessCalendarId: 40,
        contactName: 'New',
        contactPhone: '300',
        startTime: '2026-09-24T10:00:00Z',
        endTime: '2026-09-24T10:30:00Z',
        status: 'confirmed',
      } as any)
    ).rejects.toThrow(/slot_unavailable.*Free slots on 2026-09-24: 09:30, 11:00, 11:30/);

    expect(client.createAppointment).not.toHaveBeenCalled();
  });

  it('allows free slot and posts create', async () => {
    client.getCalendarAppointments.mockResolvedValue({
      success: true,
      data: {
        result: [
          {
            id: 7,
            businessCalendarId: 40,
            contactName: 'Existing',
            startTime: '2026-09-24T10:00:00Z',
            endTime: '2026-09-24T10:30:00Z',
            status: 'confirmed',
          },
        ],
      },
    });
    client.createAppointment.mockResolvedValue({ success: true, data: { id: 99 } });

    const result = await service.createAppointment({
      businessCalendarId: 40,
      contactName: 'New',
      contactPhone: '300',
      startTime: '2026-09-24T11:00:00Z',
      endTime: '2026-09-24T11:30:00Z',
      status: 'confirmed',
    } as any);

    expect(client.createAppointment).toHaveBeenCalledOnce();
    expect(result).toEqual({ success: true, data: { id: 99 } });
  });

  it('ignores cancelled appointments', async () => {
    client.getCalendarAppointments.mockResolvedValue({
      success: true,
      data: {
        result: [
          {
            id: 7,
            startTime: '2026-09-24T10:00:00Z',
            endTime: '2026-09-24T10:30:00Z',
            status: 'cancelled',
            contactName: 'Gone',
          },
        ],
      },
    });
    client.createAppointment.mockResolvedValue({ success: true, data: { id: 1 } });

    await service.createAppointment({
      businessCalendarId: 40,
      contactName: 'New',
      contactPhone: '300',
      startTime: '2026-09-24T10:00:00Z',
      endTime: '2026-09-24T10:30:00Z',
      status: 'confirmed',
    } as any);

    expect(client.createAppointment).toHaveBeenCalledOnce();
  });
});
