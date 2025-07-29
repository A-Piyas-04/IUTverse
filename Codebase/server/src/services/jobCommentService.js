const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

class JobCommentService {
  async createComment(data) {
    return prisma.jobComment.create({
      data,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: {
              select: { profilePicture: true },
            },
          },
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                profile: {
                  select: { profilePicture: true },
                },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  }

  async getCommentsByJobId(jobId) {
    return prisma.jobComment.findMany({
      where: {
        jobId: Number(jobId),
        parentCommentId: null, // Only get top-level comments
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: {
              select: { profilePicture: true },
            },
          },
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                profile: {
                  select: { profilePicture: true },
                },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async createReply(commentId, data) {
    return prisma.jobComment.create({
      data: {
        ...data,
        parentCommentId: Number(commentId),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: {
              select: { profilePicture: true },
            },
          },
        },
      },
    });
  }

  async updateComment(commentId, content, userId) {
    // First check if the comment belongs to the user
    const comment = await prisma.jobComment.findUnique({
      where: { id: Number(commentId) },
    });

    if (!comment || comment.authorId !== userId) {
      throw new Error("Unauthorized to update this comment");
    }

    return prisma.jobComment.update({
      where: { id: Number(commentId) },
      data: { content },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: {
              select: { profilePicture: true },
            },
          },
        },
      },
    });
  }

  async deleteComment(commentId, userId) {
    // First check if the comment belongs to the user
    const comment = await prisma.jobComment.findUnique({
      where: { id: Number(commentId) },
    });

    if (!comment || comment.authorId !== userId) {
      throw new Error("Unauthorized to delete this comment");
    }

    // Delete the comment (this will cascade delete replies due to schema)
    return prisma.jobComment.delete({
      where: { id: Number(commentId) },
    });
  }

  async getCommentById(commentId) {
    return prisma.jobComment.findUnique({
      where: { id: Number(commentId) },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: {
              select: { profilePicture: true },
            },
          },
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                profile: {
                  select: { profilePicture: true },
                },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  }
}

module.exports = new JobCommentService();
