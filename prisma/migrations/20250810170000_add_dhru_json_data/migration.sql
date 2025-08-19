-- Add JSON columns to store DHRU API responses
ALTER TABLE "public"."dhru_api_configs" 
ADD COLUMN "imeiServicesData" JSONB,
ADD COLUMN "fileServicesData" JSONB,
ADD COLUMN "serverServicesData" JSONB,
ADD COLUMN "remoteServicesData" JSONB,
ADD COLUMN "servicesSyncedAt" TIMESTAMP(3);