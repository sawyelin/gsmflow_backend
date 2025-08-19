-- CreateTable
CREATE TABLE "DhruApiConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "apiUrl" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DhruApiConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DhruService" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "apiConfigId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "credit" DOUBLE PRECISION NOT NULL,
    "deliveryTime" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "minQuantity" INTEGER,
    "maxQuantity" INTEGER,
    "supportsCustomFields" BOOLEAN NOT NULL DEFAULT false,
    "customFields" JSONB,
    "requires" JSONB,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DhruService_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DhruApiConfig_name_key" ON "DhruApiConfig"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DhruApiConfig_apiUrl_username_key" ON "DhruApiConfig"("apiUrl", "username");

-- CreateIndex
CREATE UNIQUE INDEX "DhruService_serviceId_apiConfigId_key" ON "DhruService"("serviceId", "apiConfigId");

-- AddForeignKey
ALTER TABLE "DhruService" ADD CONSTRAINT "DhruService_apiConfigId_fkey" FOREIGN KEY ("apiConfigId") REFERENCES "DhruApiConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;