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
        name: 'create_appointment',
        description:
          'Book an appointment on a calendar. Times accept "YYYY-MM-DDTHH:mm" ' +
          '(read in the business timezone) or an ISO string with offset such as ' +
          '"2026-08-01T10:00:00-05:00". A phone number is enough; email is optional.',
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

