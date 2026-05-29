export interface AdeptosConfig {
  baseUrl: string;
  accessToken: string;
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
