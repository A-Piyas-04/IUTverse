-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "department" TEXT,
    "batch" INTEGER,
    "studentId" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "userId" INTEGER NOT NULL,
    "bio" TEXT,
    "profilePicture" TEXT,
    "interests" TEXT[],
    "badges" TEXT[],

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostReaction" (
    "id" SERIAL NOT NULL,
    "postId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "reactionType" TEXT NOT NULL,

    CONSTRAINT "PostReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfessionTag" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ConfessionTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostTag" (
    "postId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,

    CONSTRAINT "PostTag_pkey" PRIMARY KEY ("postId","tagId")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventRsvp" (
    "userId" INTEGER NOT NULL,
    "eventId" INTEGER NOT NULL,

    CONSTRAINT "EventRsvp_pkey" PRIMARY KEY ("userId","eventId")
);

-- CreateTable
CREATE TABLE "LostAndFound" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "hallOrDept" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LostAndFound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cat" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "uploadedById" INTEGER NOT NULL,
    "image" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatVote" (
    "userId" INTEGER NOT NULL,
    "catId" INTEGER NOT NULL,

    CONSTRAINT "CatVote_pkey" PRIMARY KEY ("userId","catId")
);

-- CreateTable
CREATE TABLE "QuestionPaper" (
    "id" SERIAL NOT NULL,
    "uploadedById" INTEGER NOT NULL,
    "department" TEXT NOT NULL,
    "courseCode" TEXT NOT NULL,
    "semester" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionPaper_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_studentId_key" ON "User"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "PostReaction_postId_userId_key" ON "PostReaction"("postId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConfessionTag_name_key" ON "ConfessionTag"("name");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostReaction" ADD CONSTRAINT "PostReaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostReaction" ADD CONSTRAINT "PostReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostTag" ADD CONSTRAINT "PostTag_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostTag" ADD CONSTRAINT "PostTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "ConfessionTag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRsvp" ADD CONSTRAINT "EventRsvp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRsvp" ADD CONSTRAINT "EventRsvp_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LostAndFound" ADD CONSTRAINT "LostAndFound_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cat" ADD CONSTRAINT "Cat_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatVote" ADD CONSTRAINT "CatVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatVote" ADD CONSTRAINT "CatVote_catId_fkey" FOREIGN KEY ("catId") REFERENCES "Cat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionPaper" ADD CONSTRAINT "QuestionPaper_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
