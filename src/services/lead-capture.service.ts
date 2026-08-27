import { AdeptosApiClient } from '../clients/adeptos-api-client.js';
import { logger } from '../utils/logger.js';

function unwrap(res: any): any {
  let cur = res;
  for (let i = 0; i < 5; i++) {
    if (cur == null || typeof cur !== 'object') return cur;
    if (Array.isArray(cur)) return cur;
    if (cur.result !== undefined) {
      cur = cur.result;
      continue;
    }
    if (cur.data !== undefined && typeof cur.data === 'object') {
      cur = cur.data;
      continue;
    }
    break;
  }
  return cur;
}

function asList(res: any): any[] {
  const data = unwrap(res);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function contactIdOf(contact: any): number {
  const id = Number(contact?.id ?? contact?.ID ?? 0);
  return Number.isInteger(id) && id > 0 ? id : 0;
}

export class LeadCaptureService {
  constructor(
    private client: AdeptosApiClient,
    private businessId: number
  ) {}

  async afterContact(contact: any, note?: string): Promise<{ opportunityId?: number }> {
    const customerId = contactIdOf(contact);
    if (!customerId) {
      logger.warn('[LeadCapture] skip: no contact id');
      return {};
    }
    const name = String(contact?.name || contact?.Name || 'Lead').trim() || 'Lead';
    return this.ensureOpportunity(customerId, name, note);
  }

  async afterPurchaseOrder(order: {
    customerPhone?: string;
    customerName?: string;
    productName?: string;
    note?: string;
    quantity?: number | null;
  }): Promise<{ opportunityId?: number }> {
    const phone = String(order.customerPhone || '').trim();
    if (!phone) {
      logger.warn('[LeadCapture] skip order: no phone');
      return {};
    }
    const contact = await this.findContactByPhone(phone);
    if (!contact) {
      logger.warn(`[LeadCapture] skip order: no contact for phone ${phone}`);
      return {};
    }
    const name =
      String(contact.name || order.customerName || 'Lead').trim() || 'Lead';
    const noteParts = [
      order.productName ? `Producto: ${order.productName}` : '',
      order.quantity ? `Cantidad: ${order.quantity}` : '',
      order.note || '',
    ].filter(Boolean);
    return this.ensureOpportunity(contactIdOf(contact), name, noteParts.join('\n'));
  }

  private async findContactByPhone(phone: string): Promise<any | null> {
    const digits = phone.replace(/\D/g, '');
    const tail = digits.slice(-10);
    try {
      const res = await this.client.getContacts(this.businessId, phone);
      const list = asList(res);
      const match = list.find((c) => {
        const d = String(c.phone || '').replace(/\D/g, '');
        return d && (d.endsWith(tail) || tail.endsWith(d));
      });
      return match || list[0] || null;
    } catch (err) {
      logger.warn('[LeadCapture] getContacts failed', err);
      return null;
    }
  }

  private async ensureOpportunity(
    customerId: number,
    dealName: string,
    note?: string
  ): Promise<{ opportunityId?: number }> {
    const stageId = await this.firstLeadStageId();
    if (!stageId) {
      logger.warn('[LeadCapture] no pipeline stages for business', this.businessId);
      return {};
    }

    let opportunityId = await this.findExistingOpportunity(customerId);
    if (!opportunityId) {
      try {
        const created = await this.client.createOpportunity(this.businessId, {
          customerId,
          stageId,
          name: dealName || 'Lead',
          value: 0,
          status: 'open',
          order: 0,
        });
        const opp = unwrap(created);
        opportunityId = Number(opp?.id ?? opp?.ID ?? 0) || 0;
      } catch (err) {
        logger.warn('[LeadCapture] create_opportunity failed, searching existing', err);
        opportunityId = await this.findExistingOpportunity(customerId);
      }
    }

    if (!opportunityId) {
      logger.warn('[LeadCapture] could not create or find opportunity', customerId);
      return {};
    }

    const content = String(note || '').trim();
    if (content) {
      try {
        await this.client.createOpportunityNote(this.businessId, opportunityId, content);
      } catch (err) {
        logger.warn('[LeadCapture] create opportunity note failed', err);
      }
    }

    logger.info(
      `[LeadCapture] opportunity ${opportunityId} ensured for customer ${customerId}`
    );
    return { opportunityId };
  }

  private async firstLeadStageId(): Promise<number> {
    try {
      const res = await this.client.getPipelines(this.businessId);
      const pipelines = asList(res);
      if (!pipelines.length) return 0;
      const preferred =
        pipelines.find((p) => {
          const n = String(p.name || '').toLowerCase();
          return n === 'citas' || n === 'appointments';
        }) || pipelines[0];
      const stages = Array.isArray(preferred.stages) ? [...preferred.stages] : [];
      stages.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      return Number(stages[0]?.id) || 0;
    } catch (err) {
      logger.warn('[LeadCapture] getPipelines failed', err);
      return 0;
    }
  }

  private async findExistingOpportunity(customerId: number): Promise<number> {
    try {
      const res = await this.client.getOpportunities(this.businessId);
      const list = asList(res);
      const match = list.find(
        (o) => Number(o.customerId ?? o.customer?.id) === customerId
      );
      return Number(match?.id) || 0;
    } catch (err) {
      logger.warn('[LeadCapture] getOpportunities failed', err);
      return 0;
    }
  }
}
