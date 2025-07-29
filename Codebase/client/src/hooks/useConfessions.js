// Custom hook for managing confession state and API interactions
import { useState, useEffect, useCallback, useMemo } from "react";
import confessionApi from "../services/confessionApi.js";
import { authUtils } from "../utils/auth.js";

export const useConfessions = () => {
  const [confessions, setConfessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [analytics, setAnalytics] = useState(null);

  const limit = 20;
  const isLoggedIn = authUtils.isAuthenticated();

  // Load confessions from API
  const loadConfessions = useCallback(
    async (params = {}) => {
      try {
        setLoading(true);
        setError(null);

        const confessionData = await confessionApi.fetchConfessions({
          page: params.page || page,
          limit,
          tag: params.tag || filter,
          sortBy: params.sortBy || sortBy,
        });

        if (params.append) {
          setConfessions((prev) => [...prev, ...confessionData]);
        } else {
          setConfessions(confessionData);
        }

        setHasMore(confessionData.length === limit);
      } catch (err) {
        console.error("Failed to load confessions:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [page, filter, sortBy, limit]
  );

  // Load analytics
  const loadAnalytics = useCallback(async () => {
    try {
      const analyticsData = await confessionApi.fetchAnalytics();
      setAnalytics(analyticsData);
    } catch (err) {
      console.error("Failed to load analytics:", err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadConfessions();
    loadAnalytics();
  }, [filter, sortBy]);

  // Reset page when filter or sort changes
  useEffect(() => {
    setPage(1);
    setConfessions([]);
  }, [filter, sortBy]);

  // Filter and sort confessions (client-side for immediate feedback)
  const filteredAndSortedConfessions = useMemo(() => {
    let filtered = confessions;

    // Additional client-side sorting for immediate feedback
    switch (sortBy) {
      case "recent":
        return filtered.sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );
      case "mostReacted":
        return filtered.sort((a, b) => {
          const aTotal = Object.values(a.reactions).reduce(
            (sum, val) => sum + val,
            0
          );
          const bTotal = Object.values(b.reactions).reduce(
            (sum, val) => sum + val,
            0
          );
          return bTotal - aTotal;
        });
      case "mostVoted":
        return filtered.sort((a, b) => {
          const aVotes = a.poll ? a.poll.totalVotes : 0;
          const bVotes = b.poll ? b.poll.totalVotes : 0;
          return bVotes - aVotes;
        });
      default:
        return filtered;
    }
  }, [confessions, sortBy]);

  // Submit new confession
  const submitConfession = useCallback(
    async (confessionData) => {
      try {
        const newConfession = await confessionApi.submitConfession(
          confessionData
        );

        // Add to the beginning of the list for immediate feedback
        setConfessions((prev) => [newConfession, ...prev]);

        // Reload analytics
        loadAnalytics();

        return newConfession;
      } catch (err) {
        console.error("Failed to submit confession:", err);
        throw err;
      }
    },
    [loadAnalytics]
  );

  // Handle reactions
  const handleReaction = useCallback(
    async (confessionId, reactionType) => {
      if (!isLoggedIn) {
        throw new Error("Please log in to react to confessions");
      }

      try {
        // Optimistic update
        setConfessions((prev) =>
          prev.map((confession) => {
            if (confession.id === confessionId) {
              return {
                ...confession,
                reactions: {
                  ...confession.reactions,
                  [reactionType]: confession.reactions[reactionType] + 1,
                },
              };
            }
            return confession;
          })
        );

        const updatedConfession = await confessionApi.toggleReaction(
          confessionId,
          reactionType
        );

        // Update with server response
        setConfessions((prev) =>
          prev.map((confession) =>
            confession.id === confessionId ? updatedConfession : confession
          )
        );
      } catch (err) {
        console.error("Failed to update reaction:", err);

        // Revert optimistic update
        setConfessions((prev) =>
          prev.map((confession) => {
            if (confession.id === confessionId) {
              return {
                ...confession,
                reactions: {
                  ...confession.reactions,
                  [reactionType]: Math.max(
                    0,
                    confession.reactions[reactionType] - 1
                  ),
                },
              };
            }
            return confession;
          })
        );

        throw err;
      }
    },
    [isLoggedIn]
  );

  // Handle poll voting
  const handlePollVote = useCallback(
    async (confessionId, pollId, optionId) => {
      if (!isLoggedIn) {
        throw new Error("Please log in to vote on polls");
      }

      try {
        const updatedConfession = await confessionApi.submitPollVote(
          confessionId,
          pollId,
          optionId
        );

        // Update confession with new poll data
        setConfessions((prev) =>
          prev.map((confession) =>
            confession.id === confessionId ? updatedConfession : confession
          )
        );
      } catch (err) {
        console.error("Failed to vote on poll:", err);
        throw err;
      }
    },
    [isLoggedIn]
  );

  // Get random confession
  const getRandomConfession = useCallback(async () => {
    try {
      return await confessionApi.fetchRandomConfession();
    } catch (err) {
      console.error("Failed to get random confession:", err);
      throw err;
    }
  }, []);

  // Load more confessions (pagination)
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;

    const nextPage = page + 1;
    setPage(nextPage);

    await loadConfessions({
      page: nextPage,
      append: true,
    });
  }, [hasMore, loading, page, loadConfessions]);

  // Refresh confessions
  const refresh = useCallback(async () => {
    setPage(1);
    await loadConfessions();
    await loadAnalytics();
  }, [loadConfessions, loadAnalytics]);

  return {
    // State
    confessions: filteredAndSortedConfessions,
    loading,
    error,
    analytics,
    filter,
    sortBy,
    hasMore,
    isLoggedIn,

    // Actions
    setFilter,
    setSortBy,
    submitConfession,
    handleReaction,
    handlePollVote,
    getRandomConfession,
    loadMore,
    refresh,

    // Computed values
    hasConfessions: filteredAndSortedConfessions.length > 0,
  };
};
