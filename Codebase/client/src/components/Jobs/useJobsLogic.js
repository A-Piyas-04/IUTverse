import { useState, useEffect } from "react";
import ApiService from "../../services/api.js";

export const useJobsLogic = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState({});
  const [loadingComments, setLoadingComments] = useState({});
  const [showReplies, setShowReplies] = useState({});
  const [replyInputs, setReplyInputs] = useState({});
  const [applicationCounts, setApplicationCounts] = useState({});
  const [userApplicationStatus, setUserApplicationStatus] = useState({});
  const [showApplicants, setShowApplicants] = useState({});
  const [applications, setApplications] = useState({});
  const [loadingApplications, setLoadingApplications] = useState({});

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await ApiService.getJobs();
        if (res.success) {
          setJobs(res.data);
          // Load comments for each job
          const commentPromises = res.data.map(async (job) => {
            try {
              const commentsRes = await ApiService.getJobComments(job.id);
              if (commentsRes.success) {
                return { jobId: job.id, comments: commentsRes.data };
              }
              return { jobId: job.id, comments: [] };
            } catch (error) {
              console.error(
                `Failed to load comments for job ${job.id}:`,
                error
              );
              return { jobId: job.id, comments: [] };
            }
          });
          const commentsData = await Promise.all(commentPromises);
          const commentsMap = {};
          commentsData.forEach(({ jobId, comments }) => {
            commentsMap[jobId] = comments;
          });
          setComments(commentsMap);

          // Load application data for each job
          const applicationPromises = res.data.map(async (job) => {
            try {
              const [countRes, statusRes] = await Promise.all([
                ApiService.getJobApplicationCount(job.id),
                ApiService.getUserApplicationStatus(job.id),
              ]);

              return {
                jobId: job.id,
                count: countRes.success ? countRes.data.count : 0,
                hasApplied: statusRes.success
                  ? statusRes.data.hasApplied
                  : false,
              };
            } catch (error) {
              console.error(
                `Failed to load application data for job ${job.id}:`,
                error
              );
              return { jobId: job.id, count: 0, hasApplied: false };
            }
          });

          const applicationData = await Promise.all(applicationPromises);
          const countsMap = {};
          const statusMap = {};
          applicationData.forEach(({ jobId, count, hasApplied }) => {
            countsMap[jobId] = count;
            statusMap[jobId] = hasApplied;
          });
          setApplicationCounts(countsMap);
          setUserApplicationStatus(statusMap);
        } else {
          setJobs([]);
          setError(res.error || "Failed to load jobs");
        }
      } catch (error) {
        console.error("Error fetching jobs:", error);
        setError("Failed to load jobs. Please try again.");
        setJobs([]);
      }
      setLoading(false);
    };
    fetchJobs();
  }, []);

  const handleSubmitJob = async (jobToAdd) => {
    setError(null);
    try {
      const res = await ApiService.createJob(jobToAdd);
      if (res.success) {
        // Refresh jobs from backend
        const jobsRes = await ApiService.getJobs();
        if (jobsRes.success) {
          setJobs(jobsRes.data);
          // Initialize empty comments for new jobs
          const newCommentsMap = { ...comments };
          jobsRes.data.forEach((job) => {
            if (!newCommentsMap[job.id]) {
              newCommentsMap[job.id] = [];
            }
          });
          setComments(newCommentsMap);
        }
        setSuccess("Job posted successfully!");
        setTimeout(() => setSuccess(null), 3000);
        return { success: true };
      } else {
        setError(res.error || "Failed to create job");
        return { success: false };
      }
    } catch (error) {
      console.error("Error creating job:", error);
      setError("Failed to create job. Please try again.");
      return { success: false };
    }
  };

  const handleAddComment = async (jobId, commentText) => {
    if (!commentText.trim()) return;

    setLoadingComments((prev) => ({ ...prev, [jobId]: true }));
    setError(null);

    try {
      // Add comment via API
      const res = await ApiService.createJobComment(jobId, commentText.trim());
      if (res.success) {
        // Update local comments state
        setComments((prevComments) => ({
          ...prevComments,
          [jobId]: [...(prevComments[jobId] || []), res.data],
        }));

        // Clear the input
        setNewComment((prev) => ({
          ...prev,
          [jobId]: "",
        }));
      } else {
        console.error("Failed to add comment:", res.error);
        setError(res.error || "Failed to add comment");
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      setError("Failed to add comment. Please try again.");
    } finally {
      setLoadingComments((prev) => ({ ...prev, [jobId]: false }));
    }
  };

  const handleAddReply = async (jobId, commentId, replyText) => {
    if (!replyText.trim()) return;

    setLoadingComments((prev) => ({
      ...prev,
      [`${jobId}-${commentId}`]: true,
    }));
    setError(null);

    try {
      const res = await ApiService.replyToComment(
        jobId,
        commentId,
        replyText.trim()
      );
      if (res.success) {
        // Update local comments state - add reply to the parent comment
        setComments((prevComments) => {
          const updatedComments = { ...prevComments };
          const jobComments = [...(updatedComments[jobId] || [])];
          const commentIndex = jobComments.findIndex((c) => c.id === commentId);

          if (commentIndex !== -1) {
            jobComments[commentIndex] = {
              ...jobComments[commentIndex],
              replies: [...(jobComments[commentIndex].replies || []), res.data],
            };
          }

          updatedComments[jobId] = jobComments;
          return updatedComments;
        });

        // Clear the reply input
        setReplyInputs((prev) => ({
          ...prev,
          [commentId]: "",
        }));
      } else {
        console.error("Failed to add reply:", res.error);
        setError(res.error || "Failed to add reply");
      }
    } catch (error) {
      console.error("Error adding reply:", error);
      setError("Failed to add reply. Please try again.");
    } finally {
      setLoadingComments((prev) => ({
        ...prev,
        [`${jobId}-${commentId}`]: false,
      }));
    }
  };

  const toggleReplies = (commentId) => {
    setShowReplies((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  const refreshComments = async (jobId) => {
    setLoadingComments((prev) => ({ ...prev, [jobId]: true }));
    try {
      const res = await ApiService.getJobComments(jobId);
      if (res.success) {
        setComments((prev) => ({
          ...prev,
          [jobId]: res.data,
        }));
      }
    } catch (error) {
      console.error("Error refreshing comments:", error);
    } finally {
      setLoadingComments((prev) => ({ ...prev, [jobId]: false }));
    }
  };

  const handleApplyToJob = async (jobId) => {
    setLoadingApplications((prev) => ({ ...prev, [jobId]: true }));
    setError(null);

    try {
      const hasApplied = userApplicationStatus[jobId];

      if (hasApplied) {
        // Remove application
        const res = await ApiService.removeJobApplication(jobId);
        if (res.success) {
          setUserApplicationStatus((prev) => ({ ...prev, [jobId]: false }));
          setApplicationCounts((prev) => ({
            ...prev,
            [jobId]: Math.max(0, (prev[jobId] || 1) - 1),
          }));
          setSuccess("Application removed successfully!");
          setTimeout(() => setSuccess(null), 3000);
        } else {
          setError(res.message || "Failed to remove application");
        }
      } else {
        // Apply to job
        const res = await ApiService.applyToJob(jobId);
        if (res.success) {
          setUserApplicationStatus((prev) => ({ ...prev, [jobId]: true }));
          setApplicationCounts((prev) => ({
            ...prev,
            [jobId]: (prev[jobId] || 0) + 1,
          }));
          setSuccess("Applied to job successfully!");
          setTimeout(() => setSuccess(null), 3000);
        } else {
          setError(res.message || "Failed to apply to job");
        }
      }
    } catch (error) {
      console.error("Error handling job application:", error);
      setError("Failed to process application. Please try again.");
    } finally {
      setLoadingApplications((prev) => ({ ...prev, [jobId]: false }));
    }
  };

  const handleShowApplicants = async (jobId) => {
    if (showApplicants[jobId]) {
      // Hide applicants
      setShowApplicants((prev) => ({ ...prev, [jobId]: false }));
      return;
    }

    setLoadingApplications((prev) => ({ ...prev, [`${jobId}-list`]: true }));
    try {
      const res = await ApiService.getJobApplications(jobId);
      if (res.success) {
        setApplications((prev) => ({ ...prev, [jobId]: res.data }));
        setShowApplicants((prev) => ({ ...prev, [jobId]: true }));
      } else {
        setError("Failed to load applicants");
      }
    } catch (error) {
      console.error("Error loading applicants:", error);
      setError("Failed to load applicants. Please try again.");
    } finally {
      setLoadingApplications((prev) => ({ ...prev, [`${jobId}-list`]: false }));
    }
  };

  return {
    // State
    jobs,
    loading,
    error,
    setError,
    success,
    setSuccess,
    comments,
    newComment,
    setNewComment,
    loadingComments,
    showReplies,
    replyInputs,
    setReplyInputs,
    applicationCounts,
    userApplicationStatus,
    showApplicants,
    applications,
    loadingApplications,

    // Functions
    handleSubmitJob,
    handleAddComment,
    handleAddReply,
    toggleReplies,
    refreshComments,
    handleApplyToJob,
    handleShowApplicants,
  };
};
