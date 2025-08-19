/*
  Warnings:

  - You are about to drop the `dhru_services` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."dhru_services" DROP CONSTRAINT "dhru_services_apiConfigId_fkey";

-- DropTable
DROP TABLE "public"."dhru_services";
