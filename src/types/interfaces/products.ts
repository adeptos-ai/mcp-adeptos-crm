export interface ProductVariant {
  id: number;
  productId: number;
  name: string;
  priceCents: number;
  currency: string;
  sku: string;
  stock: number;
  trackInventory: boolean;
  continueSelling: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductItem {
  id: number;
  businessId: number;
  name: string;
  description: string;
  productType: 'DIGITAL' | 'PHYSICAL' | 'SERVICE';
  image: string;
  slug: string;
  priceCents: number;
  currency: string;
  compareAtPriceCents: number;
  availableInStore: boolean;
  enabled: boolean;
  sku: string;
  stock: number;
  trackInventory: boolean;
  continueSelling: boolean;
  variants?: ProductVariant[];
  collectionId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCollection {
  id: number;
  businessId: number;
  name: string;
  slug: string;
  image: string;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductsListApiResponse {
  result: {
    result: ProductItem[];
    total: number;
  };
}

export interface CollectionsApiResponse {
  result: ProductCollection[];
}

export interface InventoryApiResponse {
  result: any[];
}
