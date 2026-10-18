import { describe, expect, it } from 'vitest';
import { phoneOrText } from '../clients/adeptos-api-client.js';
import { OpportunityController } from '../controllers/opportunity.controller.js';

const wrap = (result: any[]) => ({ success: true, data: { result } });

describe('customer-facing reads stay small', () => {
  it('searches a phone by its last 10 digits, text as is', () => {
    expect(phoneOrText('+57 321 441 3864')).toBe('3214413864');
    expect(phoneOrText('573214413864')).toBe('3214413864');
    expect(phoneOrText('Eugenia')).toBe('Eugenia');
    expect(phoneOrText('maria.1234567@gmail.com')).toBe('maria.1234567@gmail.com');
    expect(phoneOrText('PED-0012345')).toBe('PED-0012345');
  });

  it("get_opportunities returns only the contact's", async () => {
    const all = [{ id: 1, customerId: 7 }, { id: 2, customerId: 8 }, { id: 3, customer: { id: 7 } }];
    const service: any = { getOpportunities: async () => wrap(all) };
    const res: any = await new OpportunityController(service).handleGetOpportunities(117, 7);
    expect(res.data.result.map((o: any) => o.id)).toEqual([1, 3]);
  });

  it('get_opportunities fails closed on an unexpected shape', async () => {
    const service: any = { getOpportunities: async () => ({ success: true, data: [{ id: 1, customerId: 8 }] }) };
    await expect(new OpportunityController(service).handleGetOpportunities(117, 7)).rejects.toThrow();
  });
});
