-- DropForeignKey
ALTER TABLE "CatPost" DROP CONSTRAINT "CatPost_userId_fkey";

-- AlterTable
ALTER TABLE "CatPost" ALTER COLUMN "userId" DROP NOT NULL,
ALTER COLUMN "image" DROP NOT NULL;

-- CreateTable
CREATE TABLE "CatQuestion" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "question" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatAnswer" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "questionId" INTEGER NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatAnswer_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CatPost" ADD CONSTRAINT "CatPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatQuestion" ADD CONSTRAINT "CatQuestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatAnswer" ADD CONSTRAINT "CatAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatAnswer" ADD CONSTRAINT "CatAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "CatQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
