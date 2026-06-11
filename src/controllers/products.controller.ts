import { ProductsService } from '../services/products.service.js';
import { logger } from '../utils/logger.js';

export class ProductsController {
  constructor(private service: ProductsService) {}

  private formatPrice(cents: number, currency: string): string {
    if (cents === 0) return 'requiere valoración';
    const amount = cents / 100;
    try {
      const formatter = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: currency || 'USD',
        minimumFractionDigits: 2
      });
      return formatter.format(amount);
    } catch (e) {
      return `${amount.toFixed(2)} ${currency || 'USD'}`;
    }
  }

  private formatAvailability(trackInventory: boolean, stock: number, continueSelling: boolean): string {
    if (!trackInventory) {
      return 'Disponible';
    }
    if (stock > 0) {
      return `Disponible (${stock} en stock)`;
    }
    if (continueSelling) {
      return 'Disponible (sin stock pero se puede pedir)';
    }
    return 'Sin stock';
  }

  private mapProduct(p: any) {
    const formattedVariants = p.variants?.map((v: any) => ({
      id: v.id,
      name: v.name,
      price: this.formatPrice(v.priceCents, v.currency || p.currency),
      sku: v.sku,
      availability: this.formatAvailability(v.trackInventory, v.stock, v.continueSelling)
    })) || [];

    return {
      id: p.id,
      name: p.name,
      description: p.description,
      productType: p.productType, // DIGITAL | PHYSICAL | SERVICE
      price: this.formatPrice(p.priceCents, p.currency),
      availability: this.formatAvailability(p.trackInventory, p.stock, p.continueSelling),
      variants: formattedVariants,
      image: p.image || null,
      slug: p.slug
    };
  }

  async handleGetProducts(
    businessId: number,
    filters?: { search?: string; productType?: string; collectionId?: number; limit?: number; offset?: number }
  ) {
    logger.info(`[ProductsController] getProducts called for businessId: ${businessId}`, filters);
    
    const response = await this.service.getProducts(businessId, filters);
    if (response.success && response.data?.result?.result) {
      // Filter available and enabled products only, as per plan
      const filtered = response.data.result.result
        .filter((p: any) => p.enabled === true && p.availableInStore === true)
        .map((p: any) => this.mapProduct(p));
        
      return {
        success: true,
        data: filtered,
        total: filtered.length
      };
    }
    return response;
  }

  async handleGetInventory(businessId: number) {
    logger.info(`[ProductsController] getInventory called for businessId: ${businessId}`);
    const response = await this.service.getInventory(businessId);
    if (response.success && response.data?.result) {
      return {
        success: true,
        data: response.data.result
      };
    }
    return response;
  }

  async handleGetProductCollections(businessId: number) {
    logger.info(`[ProductsController] getProductCollections called for businessId: ${businessId}`);
    const response = await this.service.getProductCollections(businessId);
    if (response.success && response.data?.result) {
      return {
        success: true,
        data: response.data.result
      };
    }
    return response;
  }

  async handleCheckAvailability(businessId: number, nameOrId: string | number) {
    logger.info(`[ProductsController] checkAvailability called for businessId: ${businessId}, nameOrId: ${nameOrId}`);
    
    // If nameOrId is a number or can be parsed as a number, we can search by ID. Otherwise search by name.
    const isId = typeof nameOrId === 'number' || !isNaN(Number(nameOrId));
    
    const filters: any = {};
    if (!isId) {
      filters.search = nameOrId.toString();
    }
    
    const response = await this.service.getProducts(businessId, filters);
    if (response.success && response.data?.result?.result) {
      let matched = response.data.result.result;
      
      if (isId) {
        const idNum = Number(nameOrId);
        matched = matched.filter((p: any) => p.id === idNum);
      }
      
      // Filter out disabled/not in store
      const activeMatched = matched.filter((p: any) => p.enabled === true && p.availableInStore === true);
      
      if (activeMatched.length === 0) {
        return {
          success: true,
          message: `No se encontró ningún producto o servicio activo disponible con la referencia "${nameOrId}".`,
          products: []
        };
      }
      
      const mapped = activeMatched.map((p: any) => this.mapProduct(p));
      return {
        success: true,
        products: mapped
      };
    }
    
    return response;
  }
}
