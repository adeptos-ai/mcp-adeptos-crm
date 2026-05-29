import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolProvider } from '../types/tool-provider.js';
import { ContactsController } from '../controllers/contacts.controller.js';
import { CreateContactSchema, UpdateContactSchema } from '../types/schemas/contacts.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

export class ContactTools implements ToolProvider {
  constructor(
    private controller: ContactsController,
    private businessId: number
  ) {}

  getTools(): Tool[] {
    return [
      {
        name: 'get_contacts',
        description: 'Get all contacts for the business.',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'create_contact',
        description: 'Create a new contact or lead.',
        inputSchema: zodToJsonSchema(CreateContactSchema) as any
      },
      {
        name: 'update_contact',
        description: 'Update an existing contact.',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: { type: 'integer', description: 'Contact ID' },
            ...((zodToJsonSchema(UpdateContactSchema) as any).properties || {})
          },
          required: ['contact_id']
        }
      },
      {
        name: 'delete_contact',
        description: 'Delete a contact.',
        inputSchema: {
          type: 'object',
          properties: { contact_id: { type: 'integer', description: 'Contact ID' } },
          required: ['contact_id']
        }
      }
    ];
  }

  async executeTool(toolName: string, params: any): Promise<any> {
    switch (toolName) {
      case 'get_contacts':
        return await this.controller.handleGetContacts(this.businessId);
      case 'create_contact': {
        const validParams = CreateContactSchema.parse(params);
        return await this.controller.handleCreateContact(this.businessId, validParams);
      }
      case 'update_contact': {
        if (!params.contact_id) throw new Error("contact_id is required");
        const validParams = UpdateContactSchema.parse(params);
        return await this.controller.handleUpdateContact(this.businessId, params.contact_id, validParams);
      }
      case 'delete_contact':
        if (!params.contact_id) throw new Error("contact_id is required");
        return await this.controller.handleDeleteContact(this.businessId, params.contact_id);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }
}

