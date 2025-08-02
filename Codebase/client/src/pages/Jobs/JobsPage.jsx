import React, { useState } from "react";
import Navbar from "../../components/Navbar/Navbar.jsx";
import {
  JobCategories,
  JobForm,
  JobCard,
  RecentPosters,
  useJobsLogic,
} from "../../components/Jobs/index.js";
import "./JobsPage.css";

export default function JobsPage() {
  const [showJobForm, setShowJobForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All Jobs");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [newJob, setNewJob] = useState({
    title: "",
    type: "Freelance",
    description: "",
    requirements: "",
    compensation: "",
    deadline: "",
  });

  const {
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
    handleSubmitJob,
    handleAddComment,
    handleAddReply,
    toggleReplies,
    refreshComments,
    handleApplyToJob,
    handleShowApplicants,
  } = useJobsLogic();

  const getTypeColor = (type) => {
    switch (type) {
      case "Internship":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Freelance":
        return "bg-green-100 text-green-800 border-green-200";
      case "Part-time":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "Volunteer":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleJobSubmit = async (e) => {
    e.preventDefault();
    const jobToAdd = {
      title: newJob.title,
      type: newJob.type,
      description: newJob.description,
      requirements: newJob.requirements.split("\n").filter((req) => req.trim()),
      compensation: newJob.compensation,
      deadline: newJob.deadline
        ? new Date(newJob.deadline).toISOString()
        : null,
    };

    const result = await handleSubmitJob(jobToAdd);
    if (result.success) {
      setNewJob({
        title: "",
        type: "Freelance",
        description: "",
        requirements: "",
        compensation: "",
        deadline: "",
      });
      setShowJobForm(false);
    }
  };

  const clearForm = () => {
    setNewJob({
      title: "",
      type: "Freelance",
      description: "",
      requirements: "",
      compensation: "",
      deadline: "",
    });
  };

  // Filter jobs based on selected category
  const filteredJobs =
    selectedCategory === "All Jobs"
      ? jobs
      : jobs.filter((job) => job.type === selectedCategory);

  return (
    <div
      className="w-screen h-screen min-h-screen min-w-full bg-[background: linear-gradient(135deg, #e6fce8 50%, #e1fcee 100%);] text-gray-900 font-sans flex flex-col"
      important
    >
      {/* TOP NAVBAR */}
      <Navbar />
      
      {/* Mobile Menu Button for Jobs */}
      <button 
        className="md:hidden fixed top-20 left-4 z-50 bg-green-100 hover:bg-green-200 p-2 rounded-lg shadow-lg transition-colors"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <svg className="w-6 h-6 text-green-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex w-full h-full min-h-0 overflow-hidden justify-between px-4 animate-fade-in-up bg-white mt-[80px] md:flex-row flex-col">
        {/* Error Display */}
        {error && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-2 text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Success Display */}
        {success && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-lg">
            <div className="flex items-center gap-2">
              <span>✅</span>
              <span>{success}</span>
              <button
                onClick={() => setSuccess(null)}
                className="ml-2 text-green-500 hover:text-green-700"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        {/* LEFT SIDEBAR */}
        <JobCategories
          jobs={jobs}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />
        {/* CENTER FEED */}
        <section className="flex-1 flex flex-col items-center px-2 py-6 overflow-y-auto min-h-0 max-w-[700px] mx-auto space-y-8 md:max-w-[700px] w-full">
          {/* Page Header */}
          <div className="w-full bg-[#141866] backdrop-blur-md rounded-[12px] mb-[12px] mt-[8px] shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                📢 Job Board
              </h1>
              <button
                onClick={() => setShowJobForm(!showJobForm)}
                className="bg-green-500 hover:bg-green-600 mr-[5px] text-white px-6 py-2 rounded-full font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                {showJobForm ? "Cancel" : "Post a Job"}
              </button>
            </div>
            <p className="text-white ml-[10px]">
              Find opportunities or post job listings for the IUT community
            </p>
          </div>
          {/* Job Post Form */}
          <JobForm
            showJobForm={showJobForm}
            setShowJobForm={setShowJobForm}
            newJob={newJob}
            setNewJob={setNewJob}
            handleSubmitJob={handleJobSubmit}
            clearForm={clearForm}
          />
          {/* Job Posts */}
          {loading ? (
            <div className="w-full bg-[#f9fafb] rounded-[12px] p-8 text-center">
              <p className="text-gray-500 text-lg">Loading jobs...</p>
            </div>
          ) : filteredJobs.length > 0 ? (
            filteredJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                getTypeColor={getTypeColor}
                applicationCounts={applicationCounts}
                showApplicants={showApplicants}
                applications={applications}
                loadingApplications={loadingApplications}
                handleShowApplicants={handleShowApplicants}
                comments={comments}
                loadingComments={loadingComments}
                refreshComments={refreshComments}
                userApplicationStatus={userApplicationStatus}
                handleApplyToJob={handleApplyToJob}
                showReplies={showReplies}
                toggleReplies={toggleReplies}
                replyInputs={replyInputs}
                setReplyInputs={setReplyInputs}
                handleAddReply={handleAddReply}
                newComment={newComment}
                setNewComment={setNewComment}
                handleAddComment={handleAddComment}
              />
            ))
          ) : (
            <div className="w-full bg-[#f9fafb] rounded-[12px] p-8 text-center">
              <p className="text-gray-500 text-lg">No jobs at this moment</p>
            </div>
          )}
        </section>
        {/* RIGHT SIDEBAR - Hidden on mobile */}
        <div className="hidden md:block">
          <RecentPosters jobs={jobs} />
        </div>
      </main>
      {/* Animations */}
      <style>{`
        @keyframes fade-in-down {
          0% { opacity: 0; transform: translateY(-30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-left {
          0% { opacity: 0; transform: translateX(-30px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes fade-in-right {
          0% { opacity: 0; transform: translateX(30px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        .animate-fade-in-down { animation: fade-in-down 0.7s cubic-bezier(.4,0,.2,1) both; }
        .animate-fade-in-up { animation: fade-in-up 0.7s cubic-bezier(.4,0,.2,1) both; }
        .animate-fade-in-left { animation: fade-in-left 0.7s cubic-bezier(.4,0,.2,1) both; }
        .animate-fade-in-right { animation: fade-in-right 0.7s cubic-bezier(.4,0,.2,1) both; }
      `}</style>
    </div>
  );
}
