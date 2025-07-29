-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('Internship', 'Freelance', 'PartTime', 'Volunteer');

-- CreateTable
CREATE TABLE "Job" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "type" "JobType" NOT NULL,
    "description" TEXT NOT NULL,
    "requirements" TEXT[],
    "compensation" TEXT,
    "deadline" TIMESTAMP(3),
    "postedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
