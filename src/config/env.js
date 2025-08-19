import dotenv from 'dotenv'

dotenv.config()

// Validate JWT secret in production
if ((process.env.NODE_ENV === 'production' || process.env.PRODUCTION === 'true') &&
    (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'dev_secret_change_me')) {
  console.error('ERROR: JWT_SECRET must be set in production environment')
  process.exit(1)
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  corsOrigins:
    (process.env.NODE_ENV === 'production' || process.env.PRODUCTION === 'true') && process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',')
      : ['http://localhost:8080', 'http://localhost:8081', 'http://127.0.0.1:8080', 'http://localhost:5173'],

  jwt: {
    secret: process.env.JWT_SECRET || 'dev_secret_change_me',
    expiresIn: process.env.JWT_EXPIRES_IN || '2h'
  },
  dhru: {
    apiUrl: process.env.DHRU_API_URL || 'https://gsmiair.com',
    username: process.env.DHRU_USERNAME || 'testdhru',
    apiKey: process.env.DHRU_API_KEY || 'BJ4-3P8-JO8-JGX-MWJ-VX2-R25-7VJ'
  },
  nowpayments: {
    apiKey: process.env.NOWPAYMENTS_API_KEY || 'your_nowpayments_api_key_here',
    ipnSecret: process.env.NOWPAYMENTS_IPN_SECRET || 'your_nowpayments_ipn_secret_here',
    baseUrl: process.env.NOWPAYMENTS_API_BASE_URL || 'https://api.nowpayments.io/v1'
  },
  production: process.env.PRODUCTION === 'true'

}
