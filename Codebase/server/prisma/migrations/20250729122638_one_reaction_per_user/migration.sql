/*
  Warnings:

  - A unique constraint covering the columns `[confessionId,userId]` on the table `ConfessionReaction` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ConfessionReaction_confessionId_userId_reactionType_key";

-- CreateIndex
CREATE UNIQUE INDEX "ConfessionReaction_confessionId_userId_key" ON "ConfessionReaction"("confessionId", "userId");
