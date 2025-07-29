import React from "react";
import { useNavigate } from "react-router-dom";

export default function JobReply({ reply }) {
  const navigate = useNavigate();

  return (
    <div className="flex items-start gap-2">
      <img
        src={
          reply.author?.profile?.profilePicture ||
          reply.author?.avatar ||
          reply.author?.profileImg ||
          "/profile_picture.jpg"
        }
        alt="Replier"
        className="w-[20px] h-[20px] rounded-full flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all"
        onClick={() =>
          reply.author?.id && navigate(`/profile/${reply.author.id}`)
        }
      />
      <div className="flex-1">
        <div className="bg-gray-50 rounded-lg px-3 py-2">
          <p
            className="font-semibold text-[12px] text-gray-900 mb-1 cursor-pointer hover:text-blue-600 transition-colors"
            onClick={() =>
              reply.author?.id && navigate(`/profile/${reply.author.id}`)
            }
          >
            {reply.author?.name || "Unknown User"}
          </p>
          <p className="text-[12px] text-gray-700">{reply.content}</p>
        </div>
        <p className="text-[10px] text-gray-500 ml-2 mt-1">
          {new Date(reply.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}
