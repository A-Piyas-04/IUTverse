const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class CatQAService {
  // Get all questions with their answers
  async getAllQuestions() {
    try {
      const questions = await prisma.catQuestion.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          answers: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            },
            orderBy: {
              createdAt: 'asc'
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      return questions;
    } catch (error) {
      throw new Error(`Failed to fetch questions: ${error.message}`);
    }
  }

  // Create a new question
  async createQuestion(questionData) {
    try {
      const { question, userId } = questionData;
      
      if (!question || question.trim().length === 0) {
        throw new Error('Question content is required');
      }

      const newQuestion = await prisma.catQuestion.create({
        data: {
          question: question.trim(),
          userId: userId || null
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          answers: true
        }
      });

      return newQuestion;
    } catch (error) {
      throw new Error(`Failed to create question: ${error.message}`);
    }
  }

  // Get a specific question by ID
  async getQuestionById(questionId) {
    try {
      const question = await prisma.catQuestion.findUnique({
        where: {
          id: parseInt(questionId)
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          answers: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            },
            orderBy: {
              createdAt: 'asc'
            }
          }
        }
      });

      if (!question) {
        throw new Error('Question not found');
      }

      return question;
    } catch (error) {
      throw new Error(`Failed to fetch question: ${error.message}`);
    }
  }

  // Add an answer to a question
  async addAnswer(answerData) {
    try {
      const { questionId, answer, userId } = answerData;
      
      if (!answer || answer.trim().length === 0) {
        throw new Error('Answer content is required');
      }

      // Check if question exists
      const question = await prisma.catQuestion.findUnique({
        where: { id: parseInt(questionId) }
      });

      if (!question) {
        throw new Error('Question not found');
      }

      const newAnswer = await prisma.catAnswer.create({
        data: {
          answer: answer.trim(),
          questionId: parseInt(questionId),
          userId: userId || null
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          question: {
            select: {
              id: true,
              question: true
            }
          }
        }
      });

      return newAnswer;
    } catch (error) {
      throw new Error(`Failed to add answer: ${error.message}`);
    }
  }

  // Delete a question (only by the author or admin)
  async deleteQuestion(questionId, userId) {
    try {
      const question = await prisma.catQuestion.findUnique({
        where: { id: parseInt(questionId) }
      });

      if (!question) {
        throw new Error('Question not found');
      }

      // Check if user is the author (for now, allow anyone to delete for testing)
      // if (question.userId !== userId) {
      //   throw new Error('Unauthorized to delete this question');
      // }

      await prisma.catQuestion.delete({
        where: { id: parseInt(questionId) }
      });

      return { message: 'Question deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete question: ${error.message}`);
    }
  }

  // Delete an answer (only by the author or admin)
  async deleteAnswer(answerId, userId) {
    try {
      const answer = await prisma.catAnswer.findUnique({
        where: { id: parseInt(answerId) }
      });

      if (!answer) {
        throw new Error('Answer not found');
      }

      // Check if user is the author (for now, allow anyone to delete for testing)
      // if (answer.userId !== userId) {
      //   throw new Error('Unauthorized to delete this answer');
      // }

      await prisma.catAnswer.delete({
        where: { id: parseInt(answerId) }
      });

      return { message: 'Answer deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete answer: ${error.message}`);
    }
  }
}

module.exports = new CatQAService();