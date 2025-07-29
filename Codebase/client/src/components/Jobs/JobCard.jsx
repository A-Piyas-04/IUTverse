import React from "react";
import { useNavigate } from "react-router-dom";
import JobComment from "./JobComment.jsx";
import JobApplications from "./JobApplications.jsx";

export default function JobCard({
  job,
  getTypeColor,
  applicationCounts,
  showApplicants,
  applications,
  loadingApplications,
  handleShowApplicants,
  comments,
  loadingComments,
  refreshComments,
  userApplicationStatus,
  handleApplyToJob,
  showReplies,
  toggleReplies,
  replyInputs,
  setReplyInputs,
  handleAddReply,
  newComment,
  setNewComment,
  handleAddComment,
}) {
  const navigate = useNavigate();

  return (
    <div className="bg-[#f9fafb] rounded-[25px] mt-4 shadow-sm mb-[20px] min-w-full">
      {/* Post Header */}
      <div className="flex items-start gap-3 p-4 pb-3 ml-[10px]">
        <img
          src={
            job.postedBy?.profile?.profilePicture ||
            job.postedBy?.profileImg ||
            "/profile_picture.jpg"
          }
          alt="Profile"
          className="w-[35px] h-[35px] mr-[12px] rounded-full mt-[30px] cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() =>
            job.postedBy?.id && navigate(`/profile/${job.postedBy.id}`)
          }
        />
        <div className="flex-1">
          <h4
            className="font-semibold text-[15px] text-gray-900 mt-[30px] cursor-pointer hover:text-blue-600 transition-colors"
            onClick={() =>
              job.postedBy?.id && navigate(`/profile/${job.postedBy.id}`)
            }
          >
            {job.postedBy?.name || "Unknown"}
          </h4>
          <p className="text-[13px] text-gray-500 flex items-center gap-1">
            {job.createdAt
              ? new Date(job.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : ""}{" "}
            • <span className="text-blue-500">🌐</span>
          </p>
        </div>
        <button className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
          <span className="text-xl">⋯</span>
        </button>
      </div>

      {/* Post Content */}
      <div className="px-4 pb-3 ml-[10px]">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-lg font-bold text-gray-900">{job.title}</h3>
          <span
            className={`px-3 py-1 mr-[5px] rounded-[15px] text-xs font-medium border ${getTypeColor(
              job.type
            )}`}
          >
            {job.type}
          </span>
        </div>
        <div className="text-[15px] mb-[12px] text-gray-900 leading-relaxed whitespace-pre-line">
          {job.description}
        </div>
        {job.requirements && job.requirements.length > 0 && (
          <div className="mb-3">
            <h4 className="font-semibold text-sm text-gray-700 mb-2">
              Requirements:
            </h4>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              {job.requirements.map((req, index) => (
                <li key={index}>{req}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex items-center gap-4 text-sm text-gray-500 mt-3">
          {job.compensation && (
            <span className="flex items-center gap-1">
              💰 {job.compensation}
            </span>
          )}
          {job.deadline && (
            <span className="flex items-center gap-1">
              📅 Deadline: {new Date(job.deadline).toLocaleDateString("en-US")}
            </span>
          )}
        </div>
      </div>

      {/* Job Applications */}
      <JobApplications
        job={job}
        applicationCounts={applicationCounts}
        showApplicants={showApplicants}
        applications={applications}
        loadingApplications={loadingApplications}
        handleShowApplicants={handleShowApplicants}
      />

      {/* Action Buttons */}
      <div className="flex justify-between py-1 mt-[12px] mb-[12px]">
        <button
          onClick={() => refreshComments(job.id)}
          className="flex items-center justify-center gap-2 py-2 px-4 ml-[10px] mr-[35px] hover:bg-gray-100 rounded transition-colors text-gray-600 text-[15px] font-medium flex-1"
          disabled={loadingComments[job.id]}
        >
          <span>💬</span>
          <span>
            {loadingComments[job.id]
              ? "Loading..."
              : `Comment (${(comments[job.id] || []).length})`}
          </span>
        </button>
        <button
          onClick={() => handleApplyToJob(job.id)}
          disabled={loadingApplications[job.id]}
          className={`flex items-center justify-center gap-2 py-2 px-4 mr-[10px] rounded transition-colors text-[15px] font-medium flex-1 ${
            userApplicationStatus[job.id]
              ? "bg-red-100 hover:bg-red-200 text-red-700"
              : "hover:bg-gray-100 text-gray-600"
          } ${
            loadingApplications[job.id] ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <span>{userApplicationStatus[job.id] ? "❌" : "📩"}</span>
          <span>
            {loadingApplications[job.id]
              ? "Processing..."
              : userApplicationStatus[job.id]
              ? "Remove Application"
              : "Apply"}
          </span>
        </button>
      </div>

      {/* Comments Section */}
      {comments[job.id] && comments[job.id].length > 0 && (
        <div className="px-4 ml-[10px] mb-4">
          <div className="border-t border-gray-200 pt-3">
            {comments[job.id].map((comment) => (
              <JobComment
                key={comment.id}
                comment={comment}
                jobId={job.id}
                showReplies={showReplies}
                toggleReplies={toggleReplies}
                replyInputs={replyInputs}
                setReplyInputs={setReplyInputs}
                handleAddReply={handleAddReply}
                loadingComments={loadingComments}
              />
            ))}
          </div>
        </div>
      )}

      {/* Comment Input */}
      <div className="flex items-center gap-2 p-4 pt-2">
        <img
          src="/profile_picture.jpg"
          alt="Me"
          className="w-[30px] h-[30px] mr-[12px] rounded-full"
        />
        <input
          type="text"
          placeholder="Write a comment..."
          value={newComment[job.id] || ""}
          onChange={(e) =>
            setNewComment((prev) => ({
              ...prev,
              [job.id]: e.target.value,
            }))
          }
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              handleAddComment(job.id, newComment[job.id] || "");
            }
          }}
          disabled={loadingComments[job.id]}
          className="flex-1 px-3 py-2 rounded-full bg-gray-100 text-[13px] outline-none focus:bg-white focus:ring-2 focus:ring-green-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          onClick={() => handleAddComment(job.id, newComment[job.id] || "")}
          disabled={
            loadingComments[job.id] || !(newComment[job.id] || "").trim()
          }
          className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-full text-[13px] font-medium transition-all duration-200 shadow-sm hover:shadow-md disabled:cursor-not-allowed"
        >
          {loadingComments[job.id] ? "..." : "Post"}
        </button>
      </div>
    </div>
  );
}
