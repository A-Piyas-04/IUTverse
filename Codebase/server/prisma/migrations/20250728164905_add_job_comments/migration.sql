-- CreateTable
CREATE TABLE "JobComment" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "jobId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "parentCommentId" INTEGER,

    CONSTRAINT "JobComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobComment_jobId_idx" ON "JobComment"("jobId");

-- CreateIndex
CREATE INDEX "JobComment_authorId_idx" ON "JobComment"("authorId");

-- CreateIndex
CREATE INDEX "JobComment_parentCommentId_idx" ON "JobComment"("parentCommentId");

-- AddForeignKey
ALTER TABLE "JobComment" ADD CONSTRAINT "JobComment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobComment" ADD CONSTRAINT "JobComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobComment" ADD CONSTRAINT "JobComment_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "JobComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
