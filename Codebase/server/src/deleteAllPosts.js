// Temporary script to delete all posts from main modules
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Delete CatQA answers and questions first (to avoid FK issues)
    await prisma.catAnswer.deleteMany();
    await prisma.catQuestion.deleteMany();
    // Delete CatPosts
    await prisma.catPostComment.deleteMany();
    await prisma.catPostLike.deleteMany();
    await prisma.catPost.deleteMany();
    // Delete homepage/general posts
    await prisma.postComment.deleteMany();
    await prisma.postReaction.deleteMany();
    await prisma.post.deleteMany();
    // Delete LostAndFound
    await prisma.lostAndFound.deleteMany();
    // Delete Jobs
    await prisma.jobApplication.deleteMany();
    await prisma.jobComment.deleteMany();
    await prisma.job.deleteMany();
    // Delete Confessions
    await prisma.confessionPollOption.deleteMany();
    await prisma.confessionPoll.deleteMany();
    await prisma.confession.deleteMany();
    // Delete Academics
    await prisma.academicResource.deleteMany();
    console.log('All posts and related data deleted successfully.');
  } catch (err) {
    console.error('Error deleting posts:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();