/*
  Warnings:

  - You are about to drop the `MarketplaceListing` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MarketplaceRoommate` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "MarketplaceListing" DROP CONSTRAINT "MarketplaceListing_userId_fkey";

-- DropForeignKey
ALTER TABLE "MarketplaceRoommate" DROP CONSTRAINT "MarketplaceRoommate_userId_fkey";

-- DropTable
DROP TABLE "MarketplaceListing";

-- DropTable
DROP TABLE "MarketplaceRoommate";

-- DropEnum
DROP TYPE "MarketplaceItemType";

-- DropEnum
DROP TYPE "MarketplacePostType";

-- DropEnum
DROP TYPE "RoomType";
