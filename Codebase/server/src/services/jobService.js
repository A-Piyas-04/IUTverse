const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

class JobService {
  async createJob(data) {
    return prisma.job.create({
      data,
      include: {
        postedBy: {
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

  async getAllJobs() {
    return prisma.job.findMany({
      include: {
        postedBy: {
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
      orderBy: { createdAt: "desc" },
    });
  }

  async getJobById(id) {
    return prisma.job.findUnique({
      where: { id: Number(id) },
      include: {
        postedBy: {
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

  async updateJob(id, data) {
    return prisma.job.update({
      where: { id: Number(id) },
      data,
    });
  }
}

module.exports = new JobService();
