-- CreateTable
CREATE TABLE "Confession" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Confession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfessionReaction" (
    "id" SERIAL NOT NULL,
    "confessionId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "reactionType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfessionReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfessionPoll" (
    "id" SERIAL NOT NULL,
    "confessionId" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "totalVotes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfessionPoll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfessionPollOption" (
    "id" SERIAL NOT NULL,
    "pollId" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "votes" INTEGER NOT NULL DEFAULT 0,
    "orderIndex" INTEGER NOT NULL,

    CONSTRAINT "ConfessionPollOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfessionPollVote" (
    "id" SERIAL NOT NULL,
    "pollId" INTEGER NOT NULL,
    "optionId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "votedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfessionPollVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConfessionReaction_confessionId_idx" ON "ConfessionReaction"("confessionId");

-- CreateIndex
CREATE INDEX "ConfessionReaction_userId_idx" ON "ConfessionReaction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConfessionReaction_confessionId_userId_reactionType_key" ON "ConfessionReaction"("confessionId", "userId", "reactionType");

-- CreateIndex
CREATE UNIQUE INDEX "ConfessionPoll_confessionId_key" ON "ConfessionPoll"("confessionId");

-- CreateIndex
CREATE INDEX "ConfessionPollOption_pollId_idx" ON "ConfessionPollOption"("pollId");

-- CreateIndex
CREATE INDEX "ConfessionPollVote_pollId_idx" ON "ConfessionPollVote"("pollId");

-- CreateIndex
CREATE INDEX "ConfessionPollVote_userId_idx" ON "ConfessionPollVote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConfessionPollVote_pollId_userId_key" ON "ConfessionPollVote"("pollId", "userId");

-- AddForeignKey
ALTER TABLE "ConfessionReaction" ADD CONSTRAINT "ConfessionReaction_confessionId_fkey" FOREIGN KEY ("confessionId") REFERENCES "Confession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfessionReaction" ADD CONSTRAINT "ConfessionReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfessionPoll" ADD CONSTRAINT "ConfessionPoll_confessionId_fkey" FOREIGN KEY ("confessionId") REFERENCES "Confession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfessionPollOption" ADD CONSTRAINT "ConfessionPollOption_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "ConfessionPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfessionPollVote" ADD CONSTRAINT "ConfessionPollVote_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "ConfessionPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfessionPollVote" ADD CONSTRAINT "ConfessionPollVote_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "ConfessionPollOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfessionPollVote" ADD CONSTRAINT "ConfessionPollVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
