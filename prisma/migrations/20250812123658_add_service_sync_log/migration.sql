/*
  Warnings:

  - You are about to drop the `dhru_services` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."dhru_services" DROP CONSTRAINT "dhru_services_apiConfigId_fkey";

-- DropTable
DROP TABLE "public"."dhru_services";

-- CreateTable
CREATE TABLE "public"."service_sync_logs" (
    "id" TEXT NOT NULL,
    "apiConfigId" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "syncedCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_sync_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."service_sync_logs" ADD CONSTRAINT "service_sync_logs_apiConfigId_fkey" FOREIGN KEY ("apiConfigId") REFERENCES "public"."dhru_api_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
