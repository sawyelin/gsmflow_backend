-- CreateTable
CREATE TABLE "public"."dhru_services" (
    "id" TEXT NOT NULL,
    "apiConfigId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "credit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deliveryTime" TEXT,
    "minQuantity" INTEGER,
    "maxQuantity" INTEGER,
    "supportsCustomFields" BOOLEAN NOT NULL DEFAULT false,
    "customFields" JSONB,
    "requires" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dhru_services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dhru_services_apiConfigId_idx" ON "public"."dhru_services"("apiConfigId");

-- CreateIndex
CREATE INDEX "dhru_services_type_idx" ON "public"."dhru_services"("type");

-- CreateIndex
CREATE INDEX "dhru_services_groupId_idx" ON "public"."dhru_services"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "dhru_services_apiConfigId_serviceId_key" ON "public"."dhru_services"("apiConfigId", "serviceId");

-- AddForeignKey
ALTER TABLE "public"."dhru_services" ADD CONSTRAINT "dhru_services_apiConfigId_fkey" FOREIGN KEY ("apiConfigId") REFERENCES "public"."dhru_api_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
