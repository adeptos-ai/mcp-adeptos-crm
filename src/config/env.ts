import * as dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3005', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  adeptosApiBaseUrl: process.env.ADEPTOS_API_BASE_URL || 'https://api.adeptos.ai',
  adeptosJwtToken: process.env.ADEPTOS_JWT_TOKEN || '',
  adeptosBusinessId: parseInt(process.env.ADEPTOS_BUSINESS_ID || '0', 10)
};

if (!config.adeptosJwtToken || !config.adeptosBusinessId) {
  // We don't throw here to allow dynamic injection via headers later
}
