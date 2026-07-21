export interface AdeptosConfig {
  baseUrl: string;
  accessToken: string;
  /** When set, sent as x-business-id (MCP client credential scope). */
  businessId?: number;
}

export interface AdeptosApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    statusCode: number;
    details?: any;
  };
}
