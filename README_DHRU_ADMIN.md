# DHRU Admin Panel Helper

## Overview

This document explains how to use the DHRU Admin Panel Helper, which provides backend functionality for managing DHRU Fusion API configurations and services. The system allows administrators to:

1. Manage multiple DHRU API servers
2. Sync services from DHRU to the database
3. Automate service synchronization with cron jobs
4. Avoid real-time sync from the frontend

## Features

### 1. Multiple API Server Support
- Configure multiple DHRU API servers
- Set one server as default for frontend use
- Manage active/inactive configurations

### 2. Service Synchronization
- Copy services from DHRU API to database based on group IDs (IMEI, SERVER, REMOTE, FILE)
- Store service details including requirements and custom fields
- Update database with latest service information

### 3. Automation
- Cron job script for automatic synchronization
- Manual sync via npm scripts
- No need for frontend to sync products in real-time

## API Endpoints

### DHRU API Configuration Management
- `GET /api/dhru-admin/api-configs` - Get all API configurations
- `GET /api/dhru-admin/api-configs/:id` - Get specific API configuration
- `POST /api/dhru-admin/api-configs` - Create new API configuration
- `PUT /api/dhru-admin/api-configs/:id` - Update API configuration
- `DELETE /api/dhru-admin/api-configs/:id` - Delete API configuration
- `POST /api/dhru-admin/api-configs/:id/default` - Set API configuration as default

### Service Management
- `POST /api/dhru-admin/test-connection` - Test DHRU API connection
- `POST /api/dhru-admin/api-configs/:apiConfigId/sync` - Sync services from DHRU API to database
- `GET /api/dhru-admin/api-configs/:apiConfigId/services` - Get all services for an API configuration
- `GET /api/dhru-admin/api-configs/:apiConfigId/services/type/:type` - Get services by type (IMEI, SERVER, REMOTE, FILE)
- `GET /api/dhru-admin/api-configs/:apiConfigId/services/group/:groupId` - Get services by group
- `GET /api/dhru-admin/api-configs/:apiConfigId/services/active` - Get active services

## Setup and Usage

### 1. Database Migration
Run the database migration to create the necessary tables:
```bash
cd backend
npx prisma migrate dev --name add_dhru_admin_models
```

### 2. Configure DHRU API
Create at least one DHRU API configuration through the admin panel or API.

### 3. Sync Services
Sync services from DHRU API to database:
```bash
# Manual sync
npm run sync:dhru

# Or via API endpoint (admin only)
curl -X POST http://localhost:3000/api/dhru-admin/api-configs/:apiConfigId/sync
```

### 4. Automation with Cron Jobs
Set up a cron job to automatically sync services:
```bash
# Example cron job entry to run every 6 hours:
0 */6 * * * cd /path/to/your/project/backend && node scripts/cron-sync-dhru-services.js >> logs/dhru-sync.log 2>&1
```

## Scripts

### sync-dhru-services.js
Manual script to sync all active API configurations:
```bash
npm run sync:dhru
```

### cron-sync-dhru-services.js
Cron job script for automatic synchronization:
```bash
npm run sync:dhru:cron
```

## Security

All admin endpoints require authentication and admin role (`UserRole.ADMIN`).

## Implementation Details

### Database Models
1. `DhruApiConfig` - Stores DHRU API configurations
2. `DhruService` - Stores synced services from DHRU API

### Service Types
- IMEI services
- SERVER services
- REMOTE services
- FILE services

### Service Groups
Services are organized by groups as defined in the DHRU API.

## Frontend Integration

The frontend can now retrieve services from the database instead of syncing in real-time:
- Fetch services from database (`DhruService` model)
- No need to call DHRU API directly from frontend
- Improved performance and reduced API load

## Troubleshooting

### Sync Issues
If sync fails, check:
1. DHRU API credentials
2. Network connectivity
3. DHRU API status

### Cron Job Issues
If cron jobs are not running:
1. Check cron syntax
2. Verify script paths
3. Check permissions
4. Review logs for errors