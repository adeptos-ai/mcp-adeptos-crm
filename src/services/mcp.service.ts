import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { AdeptosApiClient } from '../clients/adeptos-api-client.js';
import { ContactsService } from './contacts.service.js';
import { ContactsController } from '../controllers/contacts.controller.js';
import { ContactTools } from '../tools/contact-tools.js';
import { CalendarService } from './calendar.service.js';
import { CalendarController } from '../controllers/calendar.controller.js';
import { CalendarTools } from '../tools/calendar-tools.js';
import { OpportunityService } from './opportunity.service.js';
import { OpportunityController } from '../controllers/opportunity.controller.js';
import { OpportunityTools } from '../tools/opportunity-tools.js';
import { ToolProvider } from '../types/tool-provider.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

export class McpService {
  createServer(businessId: number, jwtToken: string): Server {
    const client = new AdeptosApiClient({
      accessToken: jwtToken,
      baseUrl: config.adeptosApiBaseUrl,
    });

    const contactsService = new ContactsService(client);
    const contactsController = new ContactsController(contactsService);
    
    const calendarService = new CalendarService(client);
    const calendarController = new CalendarController(calendarService);

    const opportunityService = new OpportunityService(client);
    const opportunityController = new OpportunityController(opportunityService);

    const providers: ToolProvider[] = [
      new ContactTools(contactsController, businessId),
      new CalendarTools(calendarController, businessId),
      new OpportunityTools(opportunityController, businessId)
    ];

    const flatTools = providers.flatMap(p => p.getTools());

    const server = new Server(
      { name: "mcp-adeptos-crm", version: "1.0.0" },
      {
        capabilities: { tools: {} },
        instructions: "Adeptos CRM server.",
      },
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => {
      logger.debug("Tools requested by client.");
      return { tools: flatTools };
    });

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      logger.info(`Executing tool: ${name}`);

      let targetProvider: ToolProvider | undefined;
      for (const provider of providers) {
        if (provider.getTools().some(t => t.name === name)) {
          targetProvider = provider;
          break;
        }
      }

      if (!targetProvider) {
        logger.error(`Tool not found: ${name}`);
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }

      try {
        const result = await targetProvider.executeTool(name, (args || {}) as Record<string, unknown>);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        if (error instanceof Error && 'issues' in error) {
          logger.error(`Validation error in tool ${name}:`, (error as any).issues);
          return {
            content: [{ type: "text" as const, text: `Validation Error: ${JSON.stringify((error as any).issues)}` }],
            isError: true,
          };
        }
        logger.error(`Error executing tool ${name}:`, error);
        return {
          content: [{ type: "text" as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    });

    return server;
  }
}
