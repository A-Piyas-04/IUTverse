import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar/Navbar.jsx";
import PostModal from "../../components/PostModal.jsx";
import { authUtils } from "../../utils/auth.js";

export default function HomePage() {
  
  const navigate = useNavigate();

  const [userName] = useState("John Doe"); // Add default username
  const [selectedPost, setSelectedPost] = useState(null);
  
  // Sample posts data - this should eventually come from API
  const userPosts = [
    {
      id: 1,
      name: "John Doe",
      date: "2 hours ago",
      content: "Just finished working on the new IUTverse features! Excited to share them with everyone.",
      likes: 15,
      shares: 3,
      img: null
    },
    {
      id: 2,
      name: "Jane Smith", 
      date: "5 hours ago",
      content: "Beautiful sunset from IUT campus today 🌅\n\nThe lake looks amazing this time of year!",
      likes: 28,
      shares: 7,
      img: "/picture1.jpg"
    },
    {
      id: 3,
      name: "Alex Johnson",
      date: "1 day ago", 
      content: "Study group for Computer Networks tomorrow at 3 PM in the library. All CSE students welcome!",
      likes: 12,
      shares: 15,
      img: null
    }
  ];

  // Handle adding comments to posts
  const handleAddComment = useCallback((postId, comment) => {
    console.log(`Adding comment to post ${postId}:`, comment);
    // This would normally update the post with the new comment
  }, []);

  // Handle logout
  const handleLogout = () => {
    // Clear authentication data
    authUtils.clearAuthData();
    
    // Navigate to login page
    navigate("/login");
  };
  
  return (
    <div className="w-screen h-screen min-h-screen min-w-full bg-white text-gray-900 font-sans flex flex-col">
     <Navbar />

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex w-full h-full min-h-0 overflow-hidden justify-between px-4 animate-fade-in-up bg-[linear-gradient(135deg,_#d1ffd6_50%,_#dbffec_100%)] mt-[80px]">
        {/* LEFT SIDEBAR */}
        <aside className="flex flex-col w-[320px] max-w-xs p-4 text-gray-800 space-y-4 backdrop-blur-md bg-green-50/60 rounded-2xl shadow-xl mt-6 animate-fade-in-left ">
          <h3 className="font-semibold text-xl border-b border-green-200 pb-2 ml-[10px] mb-2 tracking-wide">
            Menu
          </h3>
          <ul className="space-y-4 text-base">
            {[
              {
                label: (
                  <span
                    className="font-bold"
                    onClick={() => {
                      navigate("/profile");
                    }}
                  >
                    {userName}
                  </span>
                ),
                icon: (
                  <img
                    src="https://www.wondercide.com/cdn/shop/articles/Upside_down_gray_cat.png?v=1685551065&width=1500"
                    alt="Profile"
                    className="h-[30px] w-[30px] mr-[12px] rounded-full shadow-md border-2 border-green-400 hover:scale-105 transition-transform duration-200"
                  />
                ),
              },
              { label: "Friends", icon: "👥", bg: "bg-blue-200" },
              { label: "Saved", icon: "🔖", bg: "bg-pink-200" },
              { label: "Memories", icon: "⏰", bg: "bg-blue-100" },
              { label: "Groups", icon: "🧑‍🤝‍🧑", bg: "bg-blue-300" },
              { label: "Video", icon: "🎥", bg: "bg-blue-200" },
              { label: "Marketplace", icon: "🏪", bg: "bg-blue-100" },
              { label: "Feeds", icon: "📰", bg: "bg-blue-200" },
            ].map((item, i) => (
              <li
                key={i}
                className="flex items-center gap-3 mb-[12px] hover:text-green-700 transition group cursor-pointer"
              >
                {typeof item.icon === "string" ? (
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center ${item.bg} shadow group-hover:scale-110 transition-transform duration-200`}
                  >
                    <span className="text-xl">{item.icon}</span>
                  </div>
                ) : (
                  item.icon
                )}
                <span className="group-hover:font-semibold transition-all duration-200">
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </aside>

        {/* CENTER FEED */}
        <section className="flex-1 flex flex-col items-center px-2 py-6 overflow-y-auto min-h-0 max-w-[600px] mx-auto space-y-8">
          {/* Post box */}
          <div className="w-full bg-[#f9fafb] backdrop-blur-md rounded-[12px] mb-[12px] mt-[8px] shadow-2xl p-4">
            <div className="flex items-center gap-3 mb-[10px] mt-[8px]">
              <img
                src="https://www.wondercide.com/cdn/shop/articles/Upside_down_gray_cat.png?v=1685551065&width=1500"
                alt="Profile"
                className="h-[30px] w-[35px] mr-[12px] rounded-full shadow-md border-2 border-green-400 hover:scale-105 transition-transform duration-200"
              />
              <input
                type="text"
                placeholder="What's on your mind?"
                className="w-full px-4 py-2 rounded-full bg-white text-gray-800 placeholder-gray-400 border border-green-100 focus:outline-none focus:ring-2 focus:ring-green-300 transition shadow-inner hover:shadow-green-200/30"
              />
            </div>
            <div className="flex gap-6 text-sm mb-[10px] font-semibold justify-around">
              <button className="flex items-center gap-1 text-red-500 hover:underline active:scale-95 transition-transform duration-200">
                📹 Live video
              </button>
              <button className="flex items-center gap-1 text-green-600 hover:underline active:scale-95 transition-transform duration-200">
                🖼️ Photo/video
              </button>
              <button className="flex items-center gap-1 text-yellow-500 hover:underline active:scale-95 transition-transform duration-200">
                😊 Feeling/activity
              </button>
            </div>
          </div>

          {/* Posts */}
          {userPosts.map((post, index) => (
            <div
              key={index}
              className="bg-[#f9fafb] rounded-[25px] mt-4 shadow-sm mb-[20px] min-w-full cursor-pointer hover:shadow-lg transition"
              onClick={() => setSelectedPost(post)}
            >
              {/* Post Header */}
              <div className="flex items-start gap-3 p-4 pb-3">
                <img
                  src="https://www.wondercide.com/cdn/shop/articles/Upside_down_gray_cat.png?v=1685551065&width=1500"
                  alt="Profile"
                  className="w-[35px] h-[40px] mr-[12px] rounded-full mt-[30px]"
                />
                <div className="flex-1">
                  <h4 className="font-semibold text-[15px] text-gray-900 mt-[30px]">
                    {post.name}
                  </h4>
                  <p className="text-[13px] text-gray-500 flex items-center gap-1">
                    {post.date} • <span className="text-blue-500">🌐</span>
                  </p>
                </div>
                <button className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full">
                  <span className="text-xl">⋯</span>
                </button>
              </div>

              {/* Post Content */}
              <div className="px-4 pb-3">
                <div className="text-[15px] mb-[12px] text-gray-900 leading-relaxed whitespace-pre-line">
                  {post.content}
                </div>
                {post.img && (
                  <img
                    src={post.img}
                    alt="Post"
                    className="w-full h-auto rounded-lg mt-3 shadow-md"
                  />
                )}
              </div>

              {/* Reactions and Comments Count */}
              <div className="flex justify-between items-center px-4 py-2 text-[13px] text-gray-600">
                <div className="flex items-center gap-1">
                  <div className="flex">
                    <span className="text-blue-500">👍</span>
                    <span className="text-red-500">❤️</span>
                  </div>
                  <span>{post.likes}</span>
                </div>
                <div className="flex gap-4">
                  <span>{post.shares} shares</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-around  py-1">
                <button className="flex items-center justify-center gap-2 py-2 px-4 mr-[5px] hover:bg-gray-100 rounded transition-colors text-gray-600 text-[15px] font-medium flex-1">
                  <span>👍</span>
                  <span>Like</span>
                </button>
                <button className="flex items-center justify-center gap-2 py-2 px-4 mr-[5px] hover:bg-gray-100 rounded transition-colors text-gray-600 text-[15px] font-medium flex-1">
                  <span>💬</span>
                  <span>Comment</span>
                </button>
                <button className="flex items-center justify-center gap-2 py-2 px-4  hover:bg-gray-100 rounded transition-colors text-gray-600 text-[15px] font-medium flex-1">
                  <span>↗️</span>
                  <span>Share</span>
                </button>
              </div>
            </div>
          ))}
          {/* Post Detail Modal */}
          {selectedPost && (
            <PostModal
              post={userPosts.find((p) => p.id === selectedPost.id)}
              onClose={() => setSelectedPost(null)}
              onCommentSubmit={handleAddComment}
            />
          )}
        </section>

        {/* RIGHT SIDEBAR */}
        <aside className="flex flex-col w-[320px] max-w-xs p-4 backdrop-blur-md bg-green-50/60 rounded-2xl shadow-xl mt-6 animate-fade-in-right text-gray-800">
          <h3 className="font-semibold text-xl border-b border-green-200 pb-2 mb-4 tracking-wide">
            Contacts
          </h3>
          <ul className="space-y-4 text-base mb-[15px]">
            {[
              "Abu Zafar Sheikh Mohammad Golam Musabbereen Chishti",
              "Irfan Shafee",
              "Samiur Rahman Nafiz",
              "Faiyaz Awsaf",
              "Mashrur Faiyaz",
            ].map((name, i) => (
              <li
                key={i}
                className="flex items-center gap-3 hover:text-green-700 mb-[5px] transition group cursor-pointer"
              >
                <img
                  src="https://www.wondercide.com/cdn/shop/articles/Upside_down_gray_cat.png?v=1685551065&width=1500"
                  alt="User"
                  className="h-[30px] w-[30px] mr-[8px] rounded-full bg-gray-300 border-2 border-green-400 shadow group-hover:scale-110 transition-transform duration-200"
                />
                <span className="group-hover:font-semibold transition-all duration-200">
                  {name}
                </span>
              </li>
            ))}
          </ul>
        </aside>
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
