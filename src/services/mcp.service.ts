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
import { ProductsService } from './products.service.js';
import { ProductsController } from '../controllers/products.controller.js';
import { ProductTools } from '../tools/product-tools.js';
import { OrderService } from './order.service.js';
import { OrderController } from '../controllers/order.controller.js';
import { OrderTools } from '../tools/order-tools.js';
import { HotelTools } from '../tools/hotel-tools.js';
import { ToolProvider } from '../types/tool-provider.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

export class McpService {
  /**
   * @param defaultAgentId Path / remote agent id from x-agent-id (one value per agent instance).
   */
  createServer(businessId: number, jwtToken: string, defaultAgentId = ''): Server {
    const client = new AdeptosApiClient({
      accessToken: jwtToken,
      baseUrl: config.adeptosApiBaseUrl,
      businessId,
    });
    if (jwtToken.startsWith('mcpv1.')) {
      logger.info(
        `[MCP] Using durable client credentials for businessId=${businessId}`
      );
    }
    const contactsService = new ContactsService(client);
    const contactsController = new ContactsController(contactsService);
    
    const calendarService = new CalendarService(client);
    const calendarController = new CalendarController(calendarService);

    const opportunityService = new OpportunityService(client);
    const opportunityController = new OpportunityController(opportunityService);

    const productsService = new ProductsService(client);
    const productsController = new ProductsController(productsService);

    const orderService = new OrderService(client);
    const orderController = new OrderController(orderService);

    const providers: ToolProvider[] = [
      new ContactTools(contactsController, businessId),
      new CalendarTools(calendarController, businessId),
      new OpportunityTools(opportunityController, businessId),
      new ProductTools(productsController, businessId),
      new OrderTools(orderController, businessId, defaultAgentId),
      new HotelTools(
        orderController,
        productsController,
        calendarController,
        contactsController,
        businessId,
        defaultAgentId
      ),
    ];

    const flatTools = providers.flatMap(p => p.getTools());

    const server = new Server(
      { name: "mcp-adeptos-crm", version: "1.0.0" },
      {
        capabilities: { tools: {} },
        instructions: [
          'Adeptos CRM MCP. You MUST use these tools to write CRM data — never invent IDs, prices, or say a human will finish the booking when tools are available.',
          '',
          'PRODUCT TYPES:',
          '- RESERVATION (rooms, cabins, rentals, spaces with dates): use check_room_availability then create_room_reservation (creates contact + purchase order + calendar). Prefer exact product id from get_products.',
          '- DIGITAL / PHYSICAL / SERVICE: use create_purchase_order (quantity = units). Also create_contact + create_opportunity + create_opportunity_note.',
          '',
          'LEADS AND OPPORTUNITIES:',
          '- For ANY customer interaction that shows interest (inquiry, quote, reservation intent, product question with buying signals), create an opportunity. Do not skip this even if the booking is not finalized.',
          '- After every create_opportunity, immediately call create_opportunity_note with a detailed summary of the conversation.',
          '- The note must be at least 3–5 sentences covering: what the customer wants, dates/prices mentioned, special requests, source/channel if known, and next steps.',
          '',
          'RESERVATION BOOKING FLOW (when customer wants to book and you have name, phone, dates, guests):',
          '1) get_products (productType=RESERVATION) → pick exact unit/product id',
          '2) check_room_availability(room=id or exact name, check_in, check_out YYYY-MM-DD)',
          '3) get_pipelines → create_opportunity (link contact if you already created one)',
          '4) create_opportunity_note with a rich conversation summary',
          '5) create_room_reservation(room, dates, num_guests, customer_name, customer_phone, customer_email)',
          '6) Optionally move_opportunity to the booked/won stage',
          '',
          'create_room_reservation already upserts the contact — you do not need a separate create_contact first, but creating the contact early when you have phone/email is fine.',
          'Purchase-order quantity for RESERVATION = nights (check_out - check_in), NOT number of guests. Guests go in num_guests.',
          '',
          'NEVER hand off to a human to: check availability, create contact, create opportunity, write opportunity notes, create order, or book calendar.',
          'Only suggest a human if tools return hard failures repeatedly, payment must be taken offline by policy, or the customer explicitly asks for a person.',
          'Seasonal tariffs / club discounts: quote from your prompt or product price; do not block the CRM write on that.',
        ].join('\n'),
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
