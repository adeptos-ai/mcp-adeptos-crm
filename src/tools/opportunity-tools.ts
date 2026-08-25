import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolProvider } from '../types/tool-provider.js';
import { OpportunityController } from '../controllers/opportunity.controller.js';
import { CreateOpportunitySchema, UpdateOpportunitySchema, MoveOpportunitySchema, CreateOpportunityNoteSchema } from '../types/schemas/opportunities.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

export class OpportunityTools implements ToolProvider {
  constructor(
    private controller: OpportunityController,
    private businessId: number
  ) {}

  getTools(): Tool[] {
    return [
      {
        name: 'get_pipelines',
        description: 'Get all pipelines and stages for the business.',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'get_opportunities',
        description: 'Get all opportunities for the business.',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'create_opportunity',
        description:
          'Create a sales/booking opportunity in a pipeline stage when the customer shows intent to buy or reserve. ' +
          'Use after (or with) contact data. For RESERVATION flows, create this before or right after create_room_reservation. ' +
          'Do not skip this to hand off to a human.',
        inputSchema: zodToJsonSchema(CreateOpportunitySchema) as any
      },
      {
        name: 'update_opportunity',
        description: 'Update an opportunity.',
        inputSchema: {
          type: 'object',
          properties: {
            opp_id: { type: 'integer', description: 'Opportunity ID' },
            ...((zodToJsonSchema(UpdateOpportunitySchema) as any).properties || {})
          },
          required: ['opp_id']
        }
      },
      {
        name: 'move_opportunity',
        description: 'Move an opportunity to a different stage.',
        inputSchema: {
          type: 'object',
          properties: {
            opp_id: { type: 'integer', description: 'Opportunity ID' },
            ...((zodToJsonSchema(MoveOpportunitySchema) as any).properties || {})
          },
          required: ['opp_id']
        }
      },
      {
        name: 'delete_opportunity',
        description: 'Delete an opportunity.',
        inputSchema: {
          type: 'object',
          properties: { opp_id: { type: 'integer', description: 'Opportunity ID' } },
          required: ['opp_id']
        }
      },
      {
        name: 'create_opportunity_note',
        description:
          'Add a detailed note to an existing opportunity. ' +
          'Call this immediately after create_opportunity. ' +
          'Include: what the customer wants, dates/prices mentioned, next steps, and any relevant context from the conversation.',
        inputSchema: zodToJsonSchema(CreateOpportunityNoteSchema) as any
      }
    ];
  }

  async executeTool(toolName: string, params: any): Promise<any> {
    switch (toolName) {
      case 'get_pipelines':
        return await this.controller.handleGetPipelines(this.businessId);
      case 'get_opportunities':
        return await this.controller.handleGetOpportunities(this.businessId);
      case 'create_opportunity': {
        const validParams = CreateOpportunitySchema.parse(params);
        return await this.controller.handleCreateOpportunity(this.businessId, validParams);
      }
      case 'update_opportunity': {
        if (!params.opp_id) throw new Error("opp_id is required");
        const validParams = UpdateOpportunitySchema.parse(params);
        return await this.controller.handleUpdateOpportunity(params.opp_id, validParams);
      }
      case 'move_opportunity': {
        if (!params.opp_id) throw new Error("opp_id is required");
        const validParams = MoveOpportunitySchema.parse(params);
        return await this.controller.handleMoveOpportunity(params.opp_id, validParams);
      }
      case 'delete_opportunity':
        if (!params.opp_id) throw new Error("opp_id is required");
        return await this.controller.handleDeleteOpportunity(params.opp_id, this.businessId);
      case 'create_opportunity_note': {
        const validParams = CreateOpportunityNoteSchema.parse(params);
        return await this.controller.handleCreateOpportunityNote(
          this.businessId,
          validParams.opp_id,
          validParams.content
        );
      }
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }
}

