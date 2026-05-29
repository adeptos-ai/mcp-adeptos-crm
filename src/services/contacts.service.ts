import { AdeptosApiClient } from '../clients/adeptos-api-client.js';
import { CreateContactRequest, UpdateContactRequest } from '../types/schemas/contacts.js';

export class ContactsService {
  constructor(private client: AdeptosApiClient) {}

  async getContacts(businessId: number) {
    return this.client.getContacts(businessId);
  }

  async createContact(businessId: number, data: CreateContactRequest) {
    return this.client.createContact(businessId, data);
  }

  async updateContact(businessId: number, contactId: number, data: UpdateContactRequest) {
    return this.client.updateContact(businessId, contactId, data);
  }

  async deleteContact(businessId: number, contactId: number) {
    return this.client.deleteContact(businessId, contactId);
  }
}
