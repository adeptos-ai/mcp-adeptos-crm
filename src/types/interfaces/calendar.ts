import { ContactResponse } from './contacts.js';

export interface BusinessCalendarResponse {
  id: number;
  businessId: number;
  name: string;
  description: string;
  slug: string;
  type: string;
  slotDuration: number;
  slotInterval: number;
  bufferTime: number;
  minNotice: number;
  maxLookAhead: number;
  availability: Record<string, string[]>;
  integrationInstanceId: number;
  externalCalendarId: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentResponse {
  id: number;
  businessCalendarId: number;
  contactId?: number;
  contact?: ContactResponse;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  startTime: string;
  endTime: string;
  status: string;
  title: string;
  description: string;
  externalEventId: string;
  meetingLink: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}
