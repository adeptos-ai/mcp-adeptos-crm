import { ContactsService } from '../services/contacts.service.js';
import { logger } from '../utils/logger.js';

export class ContactsController {
  constructor(private service: ContactsService) {}

  async handleGetContacts(businessId: number) {
    logger.info(`[ContactsController] getContacts called for businessId: ${businessId}`);
    return this.service.getContacts(businessId);
  }

  async handleCreateContact(businessId: number, data: any) {
    logger.info(`[ContactsController] createContact called for businessId: ${businessId}`, data);
    return this.service.createContact(businessId, data);
  }

  async handleUpdateContact(businessId: number, contactId: number, data: any) {
    logger.info(`[ContactsController] updateContact called for businessId: ${businessId}, contactId: ${contactId}`, data);
    return this.service.updateContact(businessId, contactId, data);
  }

  async handleDeleteContact(businessId: number, contactId: number) {
    logger.info(`[ContactsController] deleteContact called for businessId: ${businessId}, contactId: ${contactId}`);
    return this.service.deleteContact(businessId, contactId);
  }
}
