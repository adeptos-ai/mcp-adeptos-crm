export interface ContactResponse {
  id: number;
  uid: string;
  userId: number;
  name: string;
  email: string;
  phone: string;
  type: string;
  enabled: boolean;
  address: string;
  city: string;
  province: string;
  country: string;
  notes: string;
  fields: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}
