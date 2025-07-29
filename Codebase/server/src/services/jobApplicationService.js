const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

class JobApplicationService {
  async applyToJob(jobId, applicantId) {
    try {
      // Check if user has already applied to this job
      const existingApplication = await prisma.jobApplication.findUnique({
        where: {
          jobId_applicantId: {
            jobId: Number(jobId),
            applicantId: Number(applicantId),
          },
        },
      });

      if (existingApplication) {
        throw new Error("You have already applied to this job");
      }

      // Create new application
      return await prisma.jobApplication.create({
        data: {
          jobId: Number(jobId),
          applicantId: Number(applicantId),
        },
        include: {
          applicant: {
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
    } catch (error) {
      throw error;
    }
  }

  async removeApplication(jobId, applicantId) {
    try {
      const application = await prisma.jobApplication.findUnique({
        where: {
          jobId_applicantId: {
            jobId: Number(jobId),
            applicantId: Number(applicantId),
          },
        },
      });

      if (!application) {
        throw new Error("Application not found");
      }

      await prisma.jobApplication.delete({
        where: {
          jobId_applicantId: {
            jobId: Number(jobId),
            applicantId: Number(applicantId),
          },
        },
      });

      return { message: "Application removed successfully" };
    } catch (error) {
      throw error;
    }
  }

  async getJobApplications(jobId) {
    try {
      return await prisma.jobApplication.findMany({
        where: {
          jobId: Number(jobId),
        },
        include: {
          applicant: {
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
        orderBy: {
          appliedAt: "desc",
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async getUserApplicationStatus(jobId, userId) {
    try {
      console.log("[JobApplicationService] Checking application status for:", {
        jobId: Number(jobId),
        userId: Number(userId),
      });

      const application = await prisma.jobApplication.findUnique({
        where: {
          jobId_applicantId: {
            jobId: Number(jobId),
            applicantId: Number(userId),
          },
        },
      });

      console.log(
        "[JobApplicationService] Found application:",
        !!application,
        application ? application.id : "none"
      );

      return { hasApplied: !!application };
    } catch (error) {
      console.error(
        "[JobApplicationService] Error in getUserApplicationStatus:",
        error
      );
      throw error;
    }
  }

  async getApplicationCount(jobId) {
    try {
      const count = await prisma.jobApplication.count({
        where: {
          jobId: Number(jobId),
        },
      });

      return { count };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new JobApplicationService();
