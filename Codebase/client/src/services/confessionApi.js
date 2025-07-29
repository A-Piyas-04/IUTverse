// Confession API service
import ApiService from "./api.js";

class ConfessionApiService {
  // Get all confessions with optional filtering and pagination
  async getConfessions(params = {}) {
    const { page = 1, limit = 20, tag, sortBy = "recent" } = params;
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sortBy,
    });

    if (tag && tag !== "all") {
      queryParams.append("tag", tag);
    }

    return ApiService.request(`/confessions?${queryParams.toString()}`, {
      method: "GET",
    });
  }

  // Get a specific confession by ID
  async getConfessionById(id) {
    return ApiService.request(`/confessions/${id}`, {
      method: "GET",
    });
  }

  // Get a random confession
  async getRandomConfession() {
    return ApiService.request("/confessions/random", {
      method: "GET",
    });
  }

  // Get confession analytics
  async getAnalytics() {
    return ApiService.request("/confessions/analytics", {
      method: "GET",
    });
  }

  // Create a new confession (requires authentication)
  async createConfession(confessionData) {
    return ApiService.request("/confessions", {
      method: "POST",
      body: JSON.stringify(confessionData),
    });
  }

  // Add a reaction to a confession (requires authentication)
  async addReaction(confessionId, reactionType) {
    return ApiService.request(`/confessions/${confessionId}/reactions`, {
      method: "POST",
      body: JSON.stringify({ reactionType }),
    });
  }

  // Remove a reaction from a confession (requires authentication)
  async removeReaction(confessionId, reactionType) {
    return ApiService.request(`/confessions/${confessionId}/reactions`, {
      method: "DELETE",
      body: JSON.stringify({ reactionType }),
    });
  }

  // Get user's reactions to a specific confession (requires authentication)
  async getUserReactions(confessionId) {
    return ApiService.request(`/confessions/${confessionId}/user-reactions`, {
      method: "GET",
    });
  }

  // Vote on a confession poll (requires authentication)
  async voteOnPoll(confessionId, pollId, optionId) {
    return ApiService.request(
      `/confessions/${confessionId}/polls/${pollId}/vote`,
      {
        method: "POST",
        body: JSON.stringify({ optionId }),
      }
    );
  }

  // Check if user has voted on a poll (requires authentication)
  async hasUserVoted(pollId) {
    return ApiService.request(`/confessions/polls/${pollId}/user-voted`, {
      method: "GET",
    });
  }

  // Helper method to handle API responses and extract data
  handleApiResponse(response) {
    if (response.success) {
      return response.data;
    } else {
      throw new Error(response.error || "API request failed");
    }
  }

  // Wrapper methods that handle responses automatically
  async fetchConfessions(params = {}) {
    const response = await this.getConfessions(params);
    return this.handleApiResponse(response);
  }

  async fetchConfessionById(id) {
    const response = await this.getConfessionById(id);
    return this.handleApiResponse(response);
  }

  async fetchRandomConfession() {
    const response = await this.getRandomConfession();
    return this.handleApiResponse(response);
  }

  async fetchAnalytics() {
    const response = await this.getAnalytics();
    return this.handleApiResponse(response);
  }

  async submitConfession(confessionData) {
    const response = await this.createConfession(confessionData);
    return this.handleApiResponse(response);
  }

  async toggleReaction(confessionId, reactionType, isRemoving = false) {
    const response = isRemoving
      ? await this.removeReaction(confessionId, reactionType)
      : await this.addReaction(confessionId, reactionType);
    return this.handleApiResponse(response);
  }

  async fetchUserReactions(confessionId) {
    const response = await this.getUserReactions(confessionId);
    return this.handleApiResponse(response);
  }

  async submitPollVote(confessionId, pollId, optionId) {
    const response = await this.voteOnPoll(confessionId, pollId, optionId);
    return this.handleApiResponse(response);
  }

  async checkUserVoted(pollId) {
    const response = await this.hasUserVoted(pollId);
    return this.handleApiResponse(response);
  }
}

export default new ConfessionApiService();
