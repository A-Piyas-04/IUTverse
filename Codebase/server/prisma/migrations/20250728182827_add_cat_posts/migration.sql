-- CreateTable
CREATE TABLE "CatPost" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "caption" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatPostLike" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "catPostId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatPostLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatPostComment" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "catPostId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatPostComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CatPostLike_userId_catPostId_key" ON "CatPostLike"("userId", "catPostId");

-- AddForeignKey
ALTER TABLE "CatPost" ADD CONSTRAINT "CatPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatPostLike" ADD CONSTRAINT "CatPostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatPostLike" ADD CONSTRAINT "CatPostLike_catPostId_fkey" FOREIGN KEY ("catPostId") REFERENCES "CatPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatPostComment" ADD CONSTRAINT "CatPostComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatPostComment" ADD CONSTRAINT "CatPostComment_catPostId_fkey" FOREIGN KEY ("catPostId") REFERENCES "CatPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
