import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolProvider } from '../types/tool-provider.js';
import { CalendarController } from '../controllers/calendar.controller.js';
import { CreateAppointmentSchema, UpdateAppointmentSchema } from '../types/schemas/calendar.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

export class CalendarTools implements ToolProvider {
  constructor(
    private controller: CalendarController,
    private businessId: number
  ) {}

  getTools(): Tool[] {
    return [
      {
        name: 'get_calendars',
        description: 'Get all calendars for the business.',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'get_appointments',
        description: 'Get all appointments for the business.',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'get_free_slots',
        description:
          'List free appointment slots for a calendar on a given date (YYYY-MM-DD). ' +
          'REQUIRED before create_appointment for SERVICE / advisory bookings — never invent a time.',
        inputSchema: {
          type: 'object',
          properties: {
            calendar_id: {
              type: 'integer',
              description: 'Calendar ID from get_calendars'
            },
            date: {
              type: 'string',
              description: 'Date to check, YYYY-MM-DD'
            }
          },
          required: ['calendar_id', 'date']
        }
      },
      {
        name: 'create_appointment',
        description:
          'Book an appointment on a calendar. Times accept "YYYY-MM-DDTHH:mm" ' +
          '(read in the business timezone) or an ISO string with offset such as ' +
          '"2026-08-01T10:00:00-05:00". A phone number is enough; email is optional. ' +
          'For SERVICE bookings you MUST call get_free_slots first and only use a free slot; ' +
          'overlapping times are rejected.',
        // $refs would make endTime point at startTime, which models handle badly
        inputSchema: zodToJsonSchema(CreateAppointmentSchema, { $refStrategy: 'none' }) as any
      },
      {
        name: 'update_appointment',
        description: 'Update an appointment.',
        inputSchema: {
          type: 'object',
          properties: {
            app_id: { type: 'integer', description: 'Appointment ID' },
            ...((zodToJsonSchema(UpdateAppointmentSchema, { $refStrategy: 'none' }) as any)
              .properties || {})
          },
          required: ['app_id']
        }
      },
      {
        name: 'delete_appointment',
        description: 'Delete an appointment.',
        inputSchema: {
          type: 'object',
          properties: { app_id: { type: 'integer', description: 'Appointment ID' } },
          required: ['app_id']
        }
      }
    ];
  }

  async executeTool(toolName: string, params: any): Promise<any> {
    switch (toolName) {
      case 'get_calendars':
        return await this.controller.handleGetCalendars(this.businessId);
      case 'get_appointments':
        return await this.controller.handleGetAppointments(this.businessId);
      case 'get_free_slots': {
        const calendarId = params.calendar_id ?? params.calendarId;
        const date = params.date;
        if (!calendarId) throw new Error('calendar_id is required');
        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
          throw new Error('date is required in YYYY-MM-DD format');
        }
        return await this.controller.handleGetFreeSlots(Number(calendarId), String(date));
      }
      case 'create_appointment': {
        const validParams = CreateAppointmentSchema.parse(params);
        return await this.controller.handleCreateAppointment(validParams);
      }
      case 'update_appointment': {
        if (!params.app_id) throw new Error("app_id is required");
        const validParams = UpdateAppointmentSchema.parse(params);
        return await this.controller.handleUpdateAppointment(params.app_id, validParams);
      }
      case 'delete_appointment':
        if (!params.app_id) throw new Error("app_id is required");
        return await this.controller.handleDeleteAppointment(params.app_id);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }
}
