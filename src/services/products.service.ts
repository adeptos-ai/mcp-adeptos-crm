import { AdeptosApiClient } from '../clients/adeptos-api-client.js';

export class ProductsService {
  constructor(private client: AdeptosApiClient) {}

  async getProducts(
    businessId: number,
    filters?: { search?: string; productType?: string; collectionId?: number; limit?: number; offset?: number }
  ) {
    return this.client.getProducts(businessId, filters);
  }

  async getInventory(businessId: number) {
    return this.client.getInventory(businessId);
  }

  async getProductCollections(businessId: number) {
    return this.client.getProductCollections(businessId);
  }
}
