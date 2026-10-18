import { OpportunityService } from '../services/opportunity.service.js';
import { logger } from '../utils/logger.js';

export class OpportunityController {
  constructor(private service: OpportunityService) {}

  async handleGetPipelines(businessId: number) {
    logger.info(`[OpportunityController] getPipelines called for businessId: ${businessId}`);
    return this.service.getPipelines(businessId);
  }

  async handleGetOpportunities(businessId: number, contactId: number) {
    logger.info(`[OpportunityController] getOpportunities called for businessId: ${businessId}`);
    const res: any = await this.service.getOpportunities(businessId);
    // ponytail: the API has no customer filter, so it is applied here; unfiltered it was ~1.5M chars per call.
    const result = res?.data?.result;
    // Fail closed: an unexpected shape must not hand the model every opportunity.
    if (!Array.isArray(result)) throw new Error('Unexpected opportunities response from the CRM');
    const mine = result.filter((o: any) => Number(o.customerId ?? o.customer?.id) === contactId);
    return { ...res, data: { ...res.data, result: mine } };
  }

  async handleCreateOpportunity(businessId: number, data: any) {
    logger.info(`[OpportunityController] createOpportunity called for businessId: ${businessId}`, data);
    return this.service.createOpportunity(businessId, data);
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

  async handleCreateOpportunityNote(businessId: number, oppId: number, content: string) {
    logger.info(`[OpportunityController] createOpportunityNote called for oppId: ${oppId}`);
    return this.service.createOpportunityNote(businessId, oppId, content);
  }
}
