# GSMFlow Backend API

For overall project architecture, setup, and data flow, see the monorepo root `../README.md`.

## Project Structure

```
backend/src/
├── routes/                 # Express route definitions
│   ├── authRoutes.js       # User authentication routes
│   ├── authExtraRoutes.js  # Additional auth routes (registration, password reset)
│   ├── deviceRoutes.js     # Device checking routes
│   ├── dhruRoutes.js       # DHRU API integration routes
│   ├── dhruAdminRoutes.js  # Admin DHRU API management routes
│   ├── fundRoutes.js       # Fund management routes
│   ├── orderRoutes.js      # Order management routes
│   └── twoFactorRoutes.js  # Two-factor authentication routes
├── services/              # Business logic and service integration
│   ├── dhruService.js     # DHRU API service functions
│   ├── dhruAdminService.js # Admin DHRU API service functions
│   ├── emailService.js    # Email service functions
│   └── tokenService.js    # JWT token service functions
├── controllers/           # Request handlers
│   ├── authController.js      # Authentication request handlers
│   ├── authExtraController.js # Additional auth request handlers
│   ├── devicesController.js   # Device checking request handlers
│   ├── dhruController.js      # DHRU API request handlers
│   ├── dhruAdminController.js # Admin DHRU API request handlers
│   ├── fundsController.js     # Fund management request handlers
│   ├── oauthController.js     # OAuth request handlers
│   ├── ordersController.js    # Order management request handlers
│   └── twoFactorController.js # Two-factor authentication handlers
├── middleware/            # Authentication and security middleware
│   ├── auth.js            # JWT authentication middleware
│   ├── apiProtection.js   # API protection middleware
│   ├── inputValidation.js # Input validation middleware
│   └── security.js        # Security headers middleware
├── lib/                  # Database client and utilities
└── config/               # Configuration files
```

## Overview

This is the backend API for the GSMFlow platform. It provides RESTful APIs for authentication, order management, fund management, device checking, and DHRU API integration. The API serves both the user dashboard and admin panel frontend applications.

## Prerequisites

- Node.js 14+
- PostgreSQL database
- DHRU Fusion API credentials

## Setup

1. Install dependencies:
```bash
npm install
```

## Quick Links

- Root overview: `../README.md`
- Admin Panel docs: `../admin-panel/README.md`

2. Set up environment variables:
Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

3. Configure your database connection in the `.env` file:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/database_name?schema=public"
```

4. Configure DHRU API credentials:
```env
DHRU_API_URL="https://your-dhru-server.com"
DHRU_USERNAME="your_username"
DHRU_API_KEY="your_api_key"
```

## Database Setup

### Prisma Migration

1. Run the initial migration to set up the database:
```bash
npx prisma migrate dev --name init
```

2. Run the DHRU admin models migration:
```bash
npx prisma migrate dev --name add_dhru_admin_models
```

3. Generate Prisma client:
```bash
npx prisma generate
```

### Database Schema

The database includes the following models:
- `User` - User accounts and balances
- `Order` - Service orders with DHRU integration
- `Device` - Device checking records
- `Invoice` - Financial transactions
- `DhruApiConfig` - DHRU API configurations (multiple servers support)
- `DhruService` - Synced services from DHRU API

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user info

### Orders
- `GET /api/orders` - List user orders
- `GET /api/orders/:id` - Get order details
- `POST /api/orders` - Create new order
- `POST /api/orders/:id/place` - Place order with DHRU
- `POST /api/orders/:id/check-status` - Check order status
- `DELETE /api/orders/:id` - Cancel order

### Funds
- `GET /api/funds/balance` - Get user balance
- `POST /api/funds/add` - Add funds to account
- `GET /api/funds/invoices` - List user invoices
- `POST /api/funds/invoices/:id/pay` - Pay invoice

### Devices
- `POST /api/devices/check-icloud` - Check iCloud status
- `POST /api/devices/check-samsung-kg` - Check Samsung KG status
- `POST /api/devices/check-samsung-info` - Check Samsung device info
- `POST /api/devices/check-micloud` - Check MiCloud status

### DHRU API
- `GET /api/dhru/status` - Check DHRU API status
- `GET /api/dhru/account-info` - Get DHRU account info
- `GET /api/dhru/services` - Get IMEI services
- `GET /api/dhru/file-services` - Get file services
- `POST /api/dhru/place-order` - Place single order
- `POST /api/dhru/place-bulk-order` - Place bulk orders

### DHRU Admin (Admin Only)
- `GET /api/dhru-admin/api-configs` - Get all API configurations
- `GET /api/dhru-admin/api-configs/:id` - Get specific API configuration
- `POST /api/dhru-admin/api-configs` - Create new API configuration
- `PUT /api/dhru-admin/api-configs/:id` - Update API configuration
- `DELETE /api/dhru-admin/api-configs/:id` - Delete API configuration
- `POST /api/dhru-admin/api-configs/:id/default` - Set API configuration as default
- `POST /api/dhru-admin/test-connection` - Test DHRU API connection
- `POST /api/dhru-admin/api-configs/:apiConfigId/sync` - Sync services from DHRU
- `GET /api/dhru-admin/sync-logs` - Get sync logs

### Admin User Management (Admin Only)
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user

### Admin Dashboard
- `GET /api/admin/dashboard-stats` - Get dashboard statistics

## DHRU Admin Panel Helper

The backend includes an admin panel helper for managing DHRU Fusion API configurations and services:

1. **Multiple API Server Support**: Configure multiple DHRU API servers
2. **Service Synchronization**: Sync services from DHRU to database based on group IDs
3. **Automation**: Cron job script for automatic synchronization
4. **No Real-time Sync**: Frontend retrieves services from database instead of real-time sync

### Running DHRU Service Sync

Manual sync:
```bash
npm run sync:dhru
```

Cron job sync:
```bash
npm run sync:dhru:cron
```

### Setting up Cron Job Automation

Add to your crontab:
```bash
# Run every 6 hours
0 */6 * * * cd /path/to/your/project/backend && node scripts/cron-sync-dhru-services.js >> logs/dhru-sync.log 2>&1
```

## Development

### Project Structure
```
backend/
├── src/
│   ├── controllers/    # Request handlers
│   ├── routes/         # API route definitions
│   ├── services/       # Business logic
│   ├── middleware/     # Authentication, security
│   ├── lib/            # Database client, utilities
│   ├── config/         # Configuration files
│   ├── app.js          # Express app setup
│   └── server.js       # Server entry point
├── prisma/
│   ├── schema.prisma   # Database schema
│   └── migrations/    # Database migrations
├── scripts/            # Utility scripts
└── package.json        # Dependencies and scripts
```

## Security

- JWT tokens for authentication
- Password hashing with bcrypt
- Rate limiting
- Security headers
- CORS configuration

## API Endpoints

### Authentication
- POST `/api/auth/login` - User login
- POST `/api/auth/register` - User registration
- POST `/api/auth/forgot-password` - Password reset request
- POST `/api/auth/reset-password` - Password reset
- GET `/api/auth/me` - Get current user info
- POST `/api/auth/logout` - User logout
- POST `/api/auth/verify-email` - Email verification
- POST `/api/auth/two-factor/setup` - Two-factor authentication setup
- POST `/api/auth/two-factor/verify` - Two-factor authentication verification

### Orders
- GET `/api/orders` - List user orders
- GET `/api/orders/:id` - Get order details
- POST `/api/orders` - Create new order
- POST `/api/orders/:id/place` - Place order with DHRU
- POST `/api/orders/:id/check-status` - Check order status
- DELETE `/api/orders/:id` - Cancel order

### Funds
- GET `/api/funds/balance` - Get user balance
- POST `/api/funds/add` - Add funds to account
- GET `/api/funds/invoices` - List user invoices

### Devices
- POST `/api/devices/check-icloud` - Check iCloud status
- POST `/api/devices/check-samsung-kg` - Check Samsung KG status
- POST `/api/devices/check-samsung-info` - Check Samsung device info
- POST `/api/devices/check-micloud` - Check MiCloud status

### DHRU API
- GET `/api/dhru/status` - Check DHRU API status
- GET `/api/dhru/account-info` - Get DHRU account info
- GET `/api/dhru/services` - Get IMEI services

### DHRU Admin (Admin Only)
- GET `/api/dhru-admin/api-configs` - Get all API configurations
- GET `/api/dhru-admin/api-configs/:id` - Get specific API configuration
- POST `/api/dhru-admin/api-configs` - Create new API configuration
- PUT `/api/dhru-admin/api-configs/:id` - Update API configuration
- DELETE `/api/dhru-admin/api-configs/:id` - Delete API configuration
- POST `/api/dhru-admin/api-configs/:id/default` - Set API configuration as default
- POST `/api/dhru-admin/test-connection` - Test DHRU API connection
- POST `/api/dhru-admin/api-configs/:apiConfigId/sync` - Sync services from DHRU API to database
- GET `/api/dhru-admin/api-configs/:apiConfigId/services` - Get all services for an API configuration
- GET `/api/dhru-admin/sync-logs` - List sync logs
- GET `/api/admin/dashboard-stats` - Admin dashboard statistics

## Troubleshooting

### Database Issues
If you encounter database connection issues:
1. Verify your DATABASE_URL in `.env`
2. Ensure PostgreSQL is running
3. Check database credentials

### DHRU API Issues
If DHRU API calls fail:
1. Verify DHRU credentials in `.env`
2. Check DHRU API status
3. Review DHRU API documentation for parameter changes

### Migration Issues
If migrations fail:
1. Check database connectivity
2. Ensure no conflicting migrations
3. Review migration SQL files for errors

### Admin User Management (Admin Only)
To create an admin user:
1. Register a normal user through the frontend
2. Update the user's role in the database to 'ADMIN'
3. The user can now access admin endpoints
