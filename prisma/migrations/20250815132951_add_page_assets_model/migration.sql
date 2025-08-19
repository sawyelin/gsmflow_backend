-- CreateTable
CREATE TABLE "public"."page_assets" (
    "id" TEXT NOT NULL,
    "loginPageImage" TEXT,
    "registerPageImage" TEXT,
    "resetPageImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "page_assets_pkey" PRIMARY KEY ("id")
);
