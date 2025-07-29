import React from "react";
import { useNavigate } from "react-router-dom";
import JobReply from "./JobReply.jsx";

export default function JobComment({
  comment,
  jobId,
  showReplies,
  toggleReplies,
  replyInputs,
  setReplyInputs,
  handleAddReply,
  loadingComments,
}) {
  const navigate = useNavigate();

  return (
    <div className="flex items-start gap-3 mb-3">
      <img
        src={
          comment.author?.profile?.profilePicture ||
          comment.author?.avatar ||
          comment.author?.profileImg ||
          "/profile_picture.jpg"
        }
        alt="Commenter"
        className="w-[25px] h-[25px] rounded-full flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all"
        onClick={() =>
          comment.author?.id && navigate(`/profile/${comment.author.id}`)
        }
      />
      <div className="flex-1">
        <div className="bg-gray-100 rounded-lg px-3 py-2">
          <p
            className="font-semibold text-[13px] text-gray-900 mb-1 cursor-pointer hover:text-blue-600 transition-colors"
            onClick={() =>
              comment.author?.id && navigate(`/profile/${comment.author.id}`)
            }
          >
            {comment.author?.name || "Unknown User"}
          </p>
          <p className="text-[13px] text-gray-700">{comment.content}</p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-gray-500 ml-3 mt-1">
          <span>
            {new Date(comment.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <button
            onClick={() => toggleReplies(comment.id)}
            className="hover:text-blue-600 transition-colors"
          >
            Reply
          </button>
          {comment.replies && comment.replies.length > 0 && (
            <button
              onClick={() => toggleReplies(comment.id)}
              className="hover:text-blue-600 transition-colors"
            >
              {showReplies[comment.id] ? "Hide" : "Show"}{" "}
              {comment.replies.length}{" "}
              {comment.replies.length === 1 ? "reply" : "replies"}
            </button>
          )}
        </div>

        {/* Reply Input */}
        {showReplies[comment.id] && (
          <div className="ml-6 mt-2">
            <div className="flex items-center gap-2">
              <img
                src="/profile_picture.jpg"
                alt="Me"
                className="w-[20px] h-[20px] rounded-full"
              />
              <input
                type="text"
                placeholder="Write a reply..."
                value={replyInputs[comment.id] || ""}
                onChange={(e) =>
                  setReplyInputs((prev) => ({
                    ...prev,
                    [comment.id]: e.target.value,
                  }))
                }
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleAddReply(
                      jobId,
                      comment.id,
                      replyInputs[comment.id] || ""
                    );
                  }
                }}
                className="flex-1 px-2 py-1 rounded-full bg-gray-100 text-[12px] outline-none focus:bg-white focus:ring-1 focus:ring-green-300 transition-all"
                disabled={loadingComments[`${jobId}-${comment.id}`]}
              />
              <button
                onClick={() =>
                  handleAddReply(
                    jobId,
                    comment.id,
                    replyInputs[comment.id] || ""
                  )
                }
                disabled={loadingComments[`${jobId}-${comment.id}`]}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-3 py-1 rounded-full text-[12px] font-medium transition-all duration-200"
              >
                {loadingComments[`${jobId}-${comment.id}`] ? "..." : "Reply"}
              </button>
            </div>
          </div>
        )}

        {/* Display Replies */}
        {showReplies[comment.id] &&
          comment.replies &&
          comment.replies.length > 0 && (
            <div className="ml-6 mt-2 space-y-2">
              {comment.replies.map((reply) => (
                <JobReply key={reply.id} reply={reply} />
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
