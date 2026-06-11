import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolProvider } from '../types/tool-provider.js';
import { ProductsController } from '../controllers/products.controller.js';

export class ProductTools implements ToolProvider {
  constructor(
    private controller: ProductsController,
    private businessId: number
  ) {}

  getTools(): Tool[] {
    return [
      {
        name: 'get_products',
        description: 'Get all products and services for the business. Auto-filters to only show enabled and available-in-store items.',
        inputSchema: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'Search term to filter by name or description' },
            productType: { 
              type: 'string', 
              enum: ['DIGITAL', 'PHYSICAL', 'SERVICE'], 
              description: 'Filter by product type (DIGITAL, PHYSICAL, or SERVICE)' 
            },
            collectionId: { type: 'integer', description: 'Filter by collection ID' },
            limit: { type: 'integer', description: 'Maximum number of products to return (default 50)' },
            offset: { type: 'integer', description: 'Number of products to skip (default 0)' }
          }
        }
      },
      {
        name: 'check_product_availability',
        description: 'Check stock, price and detailed availability of a specific product or service by name, term or product ID.',
        inputSchema: {
          type: 'object',
          properties: {
            nameOrId: { 
              type: 'string', 
              description: 'The product/service name (e.g. "Botox") or product ID to check availability for' 
            }
          },
          required: ['nameOrId']
        }
      },
      {
        name: 'get_product_collections',
        description: 'Get all product collections/categories for the business.',
        inputSchema: { type: 'object', properties: {} }
      }
    ];
  }

  async executeTool(toolName: string, params: Record<string, unknown>): Promise<any> {
    switch (toolName) {
      case 'get_products': {
        const filters: any = {};
        if (params.search) filters.search = String(params.search);
        if (params.productType) filters.productType = String(params.productType);
        if (params.collectionId) filters.collectionId = Number(params.collectionId);
        if (params.limit) filters.limit = Number(params.limit);
        if (params.offset) filters.offset = Number(params.offset);
        
        return await this.controller.handleGetProducts(this.businessId, filters);
      }
      case 'check_product_availability': {
        if (!params.nameOrId) {
          throw new Error('nameOrId parameter is required');
        }
        return await this.controller.handleCheckAvailability(this.businessId, params.nameOrId as string | number);
      }
      case 'get_product_collections': {
        return await this.controller.handleGetProductCollections(this.businessId);
      }
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }
}
