import React from "react";

export default function FeedCard({ post }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-green-200 p-4 mb-4">
      <div className="font-semibold text-green-800 mb-1">{post.user}</div>
      <img
        src={post.image}
        alt="cat"
        className="w-full h-64 object-cover rounded-md mb-2"
      />
      <p className="text-sm text-gray-700">{post.caption}</p>
    </div>
  );
}
