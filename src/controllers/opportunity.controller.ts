import { OpportunityService } from '../services/opportunity.service.js';
import { logger } from '../utils/logger.js';

export class OpportunityController {
  constructor(private service: OpportunityService) {}

  async handleGetPipelines(businessId: number) {
    logger.info(`[OpportunityController] getPipelines called for businessId: ${businessId}`);
    return this.service.getPipelines(businessId);
  }

  async handleGetOpportunities(businessId: number) {
    logger.info(`[OpportunityController] getOpportunities called for businessId: ${businessId}`);
    return this.service.getOpportunities(businessId);
  }

  async handleCreateOpportunity(data: any) {
    logger.info(`[OpportunityController] createOpportunity called`, data);
    return this.service.createOpportunity(data);
  }

  async handleUpdateOpportunity(oppId: number, data: any) {
    logger.info(`[OpportunityController] updateOpportunity called for oppId: ${oppId}`, data);
    return this.service.updateOpportunity(oppId, data);
  }

  async handleMoveOpportunity(oppId: number, data: any) {
    logger.info(`[OpportunityController] moveOpportunity called for oppId: ${oppId}`, data);
    return this.service.moveOpportunity(oppId, data);
  }

  async handleDeleteOpportunity(oppId: number, businessId: number) {
    logger.info(`[OpportunityController] deleteOpportunity called for oppId: ${oppId}`);
    return this.service.deleteOpportunity(oppId, businessId);
  }
}
