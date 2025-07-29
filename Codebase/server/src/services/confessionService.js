const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

class ConfessionService {
  async createConfession(data) {
    const { content, tag, poll } = data;

    // Create confession with optional poll
    return prisma.confession.create({
      data: {
        content,
        tag,
        poll: poll
          ? {
              create: {
                question: poll.question,
                options: {
                  create: poll.options.map((option, index) => ({
                    text: option.text,
                    orderIndex: index,
                  })),
                },
              },
            }
          : undefined,
      },
      include: {
        reactions: true,
        poll: {
          include: {
            options: {
              orderBy: { orderIndex: "asc" },
            },
            votes: true,
          },
        },
      },
    });
  }

  async getAllConfessions(page = 1, limit = 20, tag = null, sortBy = "recent") {
    const skip = (page - 1) * limit;
    const where = tag && tag !== "all" ? { tag } : {};

    let orderBy;
    switch (sortBy) {
      case "mostReacted":
        // This will need to be handled differently since we need to count reactions
        orderBy = { createdAt: "desc" }; // Fallback for now
        break;
      case "mostVoted":
        // This will need to be handled differently since we need to count poll votes
        orderBy = { createdAt: "desc" }; // Fallback for now
        break;
      default:
        orderBy = { createdAt: "desc" };
    }

    const confessions = await prisma.confession.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        reactions: true,
        poll: {
          include: {
            options: {
              orderBy: { orderIndex: "asc" },
            },
          },
        },
      },
    });

    // Transform the data to match frontend expectations
    return confessions.map(this.transformConfession);
  }

  async getConfessionById(id) {
    const confession = await prisma.confession.findUnique({
      where: { id: Number(id) },
      include: {
        reactions: true,
        poll: {
          include: {
            options: {
              orderBy: { orderIndex: "asc" },
            },
          },
        },
      },
    });

    return confession ? this.transformConfession(confession) : null;
  }

  async getRandomConfession() {
    const totalCount = await prisma.confession.count();
    if (totalCount === 0) return null;

    const randomIndex = Math.floor(Math.random() * totalCount);

    const confession = await prisma.confession.findMany({
      skip: randomIndex,
      take: 1,
      include: {
        reactions: true,
        poll: {
          include: {
            options: {
              orderBy: { orderIndex: "asc" },
            },
          },
        },
      },
    });

    return confession.length > 0
      ? this.transformConfession(confession[0])
      : null;
  }

  async addReaction(confessionId, userId, reactionType) {
    // Check if user already reacted with this type
    const existingReaction = await prisma.confessionReaction.findUnique({
      where: {
        confessionId_userId_reactionType: {
          confessionId: Number(confessionId),
          userId: Number(userId),
          reactionType,
        },
      },
    });

    if (existingReaction) {
      throw new Error("User has already reacted with this type");
    }

    return prisma.confessionReaction.create({
      data: {
        confessionId: Number(confessionId),
        userId: Number(userId),
        reactionType,
      },
    });
  }

  async removeReaction(confessionId, userId, reactionType) {
    return prisma.confessionReaction.deleteMany({
      where: {
        confessionId: Number(confessionId),
        userId: Number(userId),
        reactionType,
      },
    });
  }

  async voteOnPoll(pollId, optionId, userId) {
    // Check if user already voted on this poll
    const existingVote = await prisma.confessionPollVote.findUnique({
      where: {
        pollId_userId: {
          pollId: Number(pollId),
          userId: Number(userId),
        },
      },
    });

    if (existingVote) {
      throw new Error("User has already voted on this poll");
    }

    // Use transaction to ensure data consistency
    return prisma.$transaction(async (tx) => {
      // Create the vote
      await tx.confessionPollVote.create({
        data: {
          pollId: Number(pollId),
          optionId: Number(optionId),
          userId: Number(userId),
        },
      });

      // Update option vote count
      await tx.confessionPollOption.update({
        where: { id: Number(optionId) },
        data: { votes: { increment: 1 } },
      });

      // Update poll total votes
      await tx.confessionPoll.update({
        where: { id: Number(pollId) },
        data: { totalVotes: { increment: 1 } },
      });

      // Return updated poll with options
      return tx.confessionPoll.findUnique({
        where: { id: Number(pollId) },
        include: {
          options: {
            orderBy: { orderIndex: "asc" },
          },
        },
      });
    });
  }

  async getUserReactions(confessionId, userId) {
    return prisma.confessionReaction.findMany({
      where: {
        confessionId: Number(confessionId),
        userId: Number(userId),
      },
      select: {
        reactionType: true,
      },
    });
  }

  async hasUserVoted(pollId, userId) {
    const vote = await prisma.confessionPollVote.findUnique({
      where: {
        pollId_userId: {
          pollId: Number(pollId),
          userId: Number(userId),
        },
      },
    });
    return !!vote;
  }

  // Helper method to transform confession data for frontend
  transformConfession(confession) {
    // Group reactions by type and count them
    const reactionCounts = confession.reactions.reduce(
      (acc, reaction) => {
        acc[reaction.reactionType] = (acc[reaction.reactionType] || 0) + 1;
        return acc;
      },
      {
        like: 0,
        funny: 0,
        relatable: 0,
        angry: 0,
        insightful: 0,
      }
    );

    // Transform poll data if exists
    let pollData = null;
    if (confession.poll) {
      const totalVotes = confession.poll.totalVotes;
      pollData = {
        id: confession.poll.id,
        question: confession.poll.question,
        totalVotes,
        options: confession.poll.options.map((option) => ({
          id: option.id,
          text: option.text,
          votes: option.votes,
          percentage:
            totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0,
        })),
      };
    }

    return {
      id: confession.id,
      content: confession.content,
      tag: confession.tag,
      timestamp: confession.createdAt,
      reactions: reactionCounts,
      poll: pollData,
    };
  }

  async getConfessionAnalytics() {
    const totalConfessions = await prisma.confession.count();

    // Get tag counts
    const tagCounts = await prisma.confession.groupBy({
      by: ["tag"],
      _count: {
        tag: true,
      },
      orderBy: {
        _count: {
          tag: "desc",
        },
      },
      take: 3,
    });

    const topTags = tagCounts.map((item) => ({
      tag: item.tag,
      count: item._count.tag,
    }));

    // Get most reacted confession (this requires a more complex query)
    const mostReacted = await prisma.confession.findFirst({
      include: {
        reactions: true,
        poll: {
          include: {
            options: true,
          },
        },
      },
      orderBy: {
        reactions: {
          _count: "desc",
        },
      },
    });

    // Get most voted poll
    const mostVotedPoll = await prisma.confession.findFirst({
      where: {
        poll: {
          isNot: null,
        },
      },
      include: {
        poll: {
          include: {
            options: true,
          },
        },
      },
      orderBy: {
        poll: {
          totalVotes: "desc",
        },
      },
    });

    return {
      totalConfessions,
      topTags,
      mostReacted: mostReacted
        ? {
            confession: this.transformConfession(mostReacted),
            total: mostReacted.reactions.length,
          }
        : { confession: null, total: 0 },
      mostVotedPoll: mostVotedPoll || { poll: { totalVotes: 0 } },
    };
  }
}

module.exports = new ConfessionService();
