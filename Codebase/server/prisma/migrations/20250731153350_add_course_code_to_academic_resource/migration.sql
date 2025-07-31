-- AlterEnum
ALTER TYPE "ResourceType" ADD VALUE 'CLASS_LECTURE';

-- AlterTable
ALTER TABLE "AcademicResource" ADD COLUMN     "courseCode" TEXT;
