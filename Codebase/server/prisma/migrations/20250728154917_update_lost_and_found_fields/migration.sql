/*
  Warnings:

  - You are about to drop the column `hallOrDept` on the `LostAndFound` table. All the data in the column will be lost.
  - Added the required column `contact` to the `LostAndFound` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `LostAndFound` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "LostAndFound" DROP COLUMN "hallOrDept",
ADD COLUMN     "contact" TEXT NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "image" DROP NOT NULL;
