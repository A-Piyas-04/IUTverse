-- CreateEnum
CREATE TYPE "MarketplaceItemType" AS ENUM ('ELECTRONICS', 'FURNITURE', 'BOOKS', 'CLOTHING', 'STATIONERY', 'OTHERS');

-- CreateEnum
CREATE TYPE "MarketplacePostType" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('SHARED', 'PERSONAL');

-- CreateTable
CREATE TABLE "MarketplaceListing" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "itemType" "MarketplaceItemType" NOT NULL,
    "condition" TEXT NOT NULL,
    "postType" "MarketplacePostType" NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceRoommate" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "roomType" "RoomType" NOT NULL,
    "amenities" TEXT[],
    "area" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceRoommate_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceRoommate" ADD CONSTRAINT "MarketplaceRoommate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
