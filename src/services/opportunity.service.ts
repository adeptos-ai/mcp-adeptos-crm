import { AdeptosApiClient } from '../clients/adeptos-api-client.js';
import { CreateOpportunityRequest, UpdateOpportunityRequest, MoveOpportunityRequest } from '../types/schemas/opportunities.js';

export class OpportunityService {
  constructor(private client: AdeptosApiClient) {}

  async getPipelines(businessId: number) {
    return this.client.getPipelines(businessId);
  }

  async getOpportunities(businessId: number) {
    return this.client.getOpportunities(businessId);
  }

  async createOpportunity(businessId: number, data: CreateOpportunityRequest) {
    return this.client.createOpportunity(businessId, data);
  }

  async updateOpportunity(oppId: number, data: UpdateOpportunityRequest) {
    return this.client.updateOpportunity(oppId, data);
  }

  async moveOpportunity(oppId: number, data: MoveOpportunityRequest) {
    return this.client.moveOpportunity(oppId, data);
  }

  async deleteOpportunity(oppId: number, businessId: number) {
    return this.client.deleteOpportunity(oppId, businessId);
  }

  async createOpportunityNote(businessId: number, oppId: number, content: string) {
    return this.client.createOpportunityNote(businessId, oppId, content);
  }
}
