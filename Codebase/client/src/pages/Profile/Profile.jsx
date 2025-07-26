import React, { useState } from "react";
import Navbar from "../../components/Navbar/Navbar.jsx";

export default function Profile() {
  const navigate = () => {};
  const [activeTab, setActiveTab] = useState("Posts");
  const [users, setUsers] = useState([]);

  const userName = "নুরেন ফাহমিদ";
  const schoolName = "বাংলাদেশ এলিমেন্টারি স্কুল";
  const collegeName = "চট্টগ্রাম ক্যান্টনমেন্ট পাবলিক কলেজ";
  const currentDepartment = "কম্পিউটার সায়েন্স অ্যান্ড ইঞ্জিনিয়ারিং";
  const currentProgram = "কম্পিউটার সায়েন্স অ্যান্ড ইঞ্জিনিয়ারিং";
  const currentYear = "২য়";
  const currentSemester = "২য়";
  const studentId = "২২০০৪২১২১";
  const hometown = "চট্টগ্রাম, বাংলাদেশ";
  const currentResidence = "গাজীপুর, বাংলাদেশ";
  const currentHall = "সাউথ হল অফ রেসিডেন্স";
  const currentRoom = "রুম ৫০৩";
  const currentBed = "এ";

  const tabs = [
    "Posts",
    "About",
    "Friends",
    "Photos",
    "Videos",
    "Reels",
    "More",
  ];

  const userPosts = [
    {
      date: "November 28, 2024",
      content:
        "Just finished my Data Structures assignment! The feeling of getting all test cases to pass is unmatched 🎉",
      likes: 23,
      comments: 7,
      shares: 2,
    },
    {
      date: "November 25, 2024",
      content:
        "Campus cats are the real MVPs of IUT. Spotted three new kittens near the lake today 🐱❤️",
      likes: 42,
      comments: 12,
      shares: 8,
    },
    {
      date: "November 20, 2024",
      content:
        "Group study session for Calculus 2 finals. Mathematics building, Room 301. Everyone welcome!",
      likes: 18,
      comments: 5,
      shares: 15,
    },
  ];

  const profilePicture = (
    <img
      src="../../../public/profile_picture.jpg"
      alt="Profile"
      className="w-full h-full object-cover"
      onError={(e) => {
        e.target.style.display = "none";
      }}
    />
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      {/* Main Container - Facebook uses max-width with centered content */}
      <div className="max-w-[1100px] mx-auto bg-white mt-[80px]">
        {/* Cover Photo Section */}
        <div className="relative">
          <div className="w-full h-[348px] bg-gradient-to-br from-green-400 via-green-500 to-green-600 overflow-hidden relative">
            <img
              src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
              alt="Cover"
              className="w-full h-full object-cover rounded-b-[12px]"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
            {/* Edit Cover Photo Button - Positioned over the cover photo */}
            <button className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition-all duration-200 text-sm font-medium">
              <span className="text-base">📷</span>
              <span className="text-gray-700">Edit cover photo</span>
            </button>
          </div>
        </div>

        {/* Profile Info Section */}
        <div className="bg-white">
          <div className="px-4">
            <div className="flex items-end justify-between -mt-[100px] ml-[30px] pb-4">
              {/* Profile Picture */}
              <div className="relative">
                <div className="w-[168px] h-[168px] rounded-full border-4 border-white shadow-lg bg-gray-300 overflow-hidden">
                  {profilePicture}
                </div>
                {/* <button className="absolute bottom-2 right-2 w-9 h-9 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center shadow-sm transition-colors">
                  <span className="text-base">📷</span>
                </button> */}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mb-4">
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm font-medium">
                  <span className="text-lg">+</span>
                  <span>Add to story</span>
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors text-sm font-medium">
                  <span>✏️</span>
                  <span>Edit profile</span>
                </button>
              </div>
            </div>

            {/* Name and Info */}
            <div className="pb-4">
              <h1 className="text-[32px] font-bold text-gray-900 leading-tight mb-1">
                {userName}
              </h1>
              <p className="text-gray-600 text-[15px] mb-2">127 friends</p>

              {/* Friend Avatars */}
              <div className="flex items-center gap-1">
                <div className="flex -space-x-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div
                      key={i}
                      className="w-7 h-7 rounded-full border-2 border-white bg-gray-300"
                    ></div>
                  ))}
                </div>
                <span className="text-[13px] text-gray-600 ml-2">
                  Friends with Maria Khan, Alex Rahman, Tania Sultana and 5
                  others
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-t border-gray-200 px-4 mt-[12px]">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`mt-[10px] px-4 py-4 text-[15px] font-medium transition-colors relative ${
                  activeTab === tab
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area - Matches Facebook's spacing */}
      <div className="max-w-[1100px] mx-auto mt-[10px]">
        <div className="flex gap-4 pt-4 px-4">
          {/* Left Sidebar - Fixed width like Facebook */}
          <div className="w-[500px] flex-shrink-0 mr-[10px]">
            {/* Intro Card */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Intro</h3>

              <button className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 font-medium transition-colors mb-4 text-sm">
                Add bio
              </button>

              <div className="space-y-2">
                <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                  <strong>আসসালামু আলাইকুম ভাই/আপু।</strong>
                </div>
                <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                  আমি <strong> {userName}</strong>
                </div>
                <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                  আমি <strong> {schoolName}</strong>   থেকে এসএসসি পাশ করেছি
                </div>
                <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                  এবং <strong> {collegeName}</strong>   থেকে এইচএসসি পাশ করেছি
                </div>
                <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                  আমি বর্তমানে ইসলামিক ইউনিভার্সিটি অফ টেকনোলজিতে <br />
                </div>
                <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                  <strong>{currentDepartment}</strong>   ডিপার্টমেন্টে <br />
                </div>
                <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                  {<strong>{currentProgram}</strong>}   প্রোগ্রামে <br />
                </div>
                <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                  {<strong>{currentYear}</strong>}   বর্ষে <br />
                </div>
                <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                  {<strong>{currentSemester}</strong>}   সেমিস্টারে অধ্যয়নরত
                  আছি।
                </div>
                <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                  আমার স্টুডেন্ট আইডি   <strong>{studentId}</strong>
                </div>
                <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                  আমার হোমটাউন   <strong>{hometown}</strong>
                </div>
                <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                  আমার বর্তমান বাসা   <strong>{currentResidence}</strong>
                </div>
                <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                  আমি ইসলামিক ইউনিভার্সিটি অফ টেকনোলজির{" "}
                </div>
                <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                  <strong>{currentHall}</strong>   হল অফ রেসিডেন্স বিল্ডিং এ{" "}
                </div>
                <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                  {<strong>{currentRoom}</strong>}   রুমে{" "}
                </div>
                <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                  {<strong>{currentBed}</strong>}   বেডে থাকি।
                </div>
                {/* <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                  <span className="text-gray-500">🎓</span>
                  <span>
                    Studies{" "}
                    <strong>BSc. in Computer Science and Engineering</strong> at{" "}
                    <strong>Islamic University of Technology (IUT)</strong>
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[15px] text-gray-700 mb-[5px]">
                  <span className="text-gray-500">🎓</span>
                  <span>
                    Studied at <strong>Dhaka Residential Model College</strong>
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[15px] text-gray-700 mb-[5px]">
                  <span className="text-gray-500">🏫</span>
                  <span>
                    Went to <strong>Viqarunnisa Noon School and College</strong>
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[15px] text-gray-700 mb-[5px]">
                  <span className="text-gray-500">🏠</span>
                  <span>
                    Lives in <strong>Dhaka, Bangladesh</strong>
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[15px] text-gray-700 mb-[5px]">
                  <span className="text-gray-500">📍</span>
                  <span>
                    From <strong>Sylhet, Bangladesh</strong>
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[15px] text-gray-700 mb-[5px]">
                  <span className="text-gray-500">📱</span>
                  <span className="text-blue-600 cursor-pointer hover:underline">
                    sarah.ahmed.dev
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[15px] text-gray-700 mb-[5px]">
                  <span className="text-gray-500">💼</span>
                  <span>
                    Works at <strong>Tech Solutions Ltd</strong> as{" "}
                    <strong>Software Developer</strong>
                  </span>
                </div> */}
              </div>
            </div>

            {/* Photos Card */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Photos</h3>
                <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  See all photos
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                  <div
                    key={i}
                    className="aspect-square bg-gray-200 rounded"
                  ></div>
                ))}
              </div>
            </div>

            {/* Friends Card */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Friends</h3>
                <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  See all friends
                </button>
              </div>
              <p className="text-gray-600 mb-4 text-sm">127 friends</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  "Maria Khan",
                  "Alex Rahman",
                  "Tania Sultana",
                  "Rafiq Hassan",
                  "Priya Sharma",
                  "Omar Ali",
                ].map((name, i) => (
                  <div key={i} className="text-center">
                    <div className="w-full aspect-square bg-gray-300 rounded-lg mb-1"></div>
                    <p className="text-xs text-gray-800 font-medium leading-tight">
                      {name.length > 12 ? name.substring(0, 12) + "..." : name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content - Takes remaining space */}
          <div className="flex-1 min-w-0">
            {/* Create Post */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-[42px] h-[42px] mr-[12px] rounded-full overflow-hidden flex-shrink-0">
                  {profilePicture}
                </div>
                <input
                  type="text"
                  placeholder="What's on your mind?"
                  className="flex-1 py-3 px-4 bg-gray-100 rounded-[25px] text-gray-700 placeholder-gray-500 focus:outline-none text-sm"
                />
              </div>
              <div className="flex justify-around pt-3 mt-[12px] border-gray-200">
                <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <span className="text-red-500">🎥</span>
                  <span className="text-gray-600 text-sm font-medium">
                    Live video
                  </span>
                </button>
                <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <span className="text-green-500">📷</span>
                  <span className="text-gray-600 text-sm font-medium">
                    Photo/video
                  </span>
                </button>
                <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <span className="text-yellow-500">😊</span>
                  <span className="text-gray-600 text-sm font-medium">
                    Life event
                  </span>
                </button>
              </div>
            </div>

            {/* Filter and View Options */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Posts</h3>
                <div className="flex gap-2">
                  <button className="flex items-center gap-2 px-3 py-2 mr-[12px] bg-gray-100 hover:bg-gray-200 rounded-md transition-colors text-sm">
                    <span>⚙️</span>
                    <span className="font-medium">Filters</span>
                  </button>
                  <button className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors text-sm">
                    <span>⚙️</span>
                    <span className="font-medium">Manage posts</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Posts */}
            {userPosts.map((post, index) => (
              <div
                key={index}
                className="bg-[#f9fafb] rounded-[25px] mt-4 shadow-sm mb-[20px]"
              >
                {/* Post Header */}
                <div className="flex items-start gap-3 p-4 pb-3 ml-[10px]">
                  <div className="w-[42px] h-[42px] mr-[12px] rounded-full overflow-hidden flex-shrink-0 mt-[30px]">
                    {profilePicture}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-[15px] text-gray-900 mt-[30px]">
                      {userName}
                    </h4>
                    <p className="text-[13px] text-gray-500 flex items-center gap-1 mt-[-20px]">
                      {post.date} • <span className="text-blue-500">🌐</span>
                    </p>
                  </div>
                  <button className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full">
                    <span className="text-xl">⋯</span>
                  </button>
                </div>

                {/* Post Content */}
                <div className="px-4 pb-3 ml-[10px]">
                  <div className="text-[15px] text-gray-900 leading-relaxed whitespace-pre-line">
                    {post.content}
                  </div>
                </div>

                {/* Reactions and Comments Count */}
                <div className="flex justify-between items-center px-4 py-2 text-[18px] ml-[10px] text-gray-600">
                  <div className="flex items-center gap-1">
                    <div className="flex">
                      <span className="text-blue-500">👍</span>
                      <span className="text-red-500">❤️</span>
                    </div>
                    <span>{post.likes}</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="mr-[5px]">{post.comments} comments</span>
                    <span>{post.shares} shares</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-around border-t border-gray-200 py-1">
                  <button className="flex items-center justify-center gap-2 py-2 px-4 hover:bg-gray-100 rounded transition-colors text-gray-600 text-[15px] font-medium flex-1">
                    <span>👍</span>
                    <span>Like</span>
                  </button>
                  <button className="flex items-center justify-center gap-2 py-2 px-4 hover:bg-gray-100 rounded transition-colors text-gray-600 text-[15px] font-medium flex-1">
                    <span>💬</span>
                    <span>Comment</span>
                  </button>
                  <button className="flex items-center justify-center gap-2 py-2 px-4 hover:bg-gray-100 rounded transition-colors text-gray-600 text-[15px] font-medium flex-1">
                    <span>↗️</span>
                    <span>Share</span>
                  </button>
                </div>

                {/* Comment Input */}
                <div className="flex items-center gap-2 p-4 pt-2 border-t border-gray-100">
                  <img
                    src="https://www.wondercide.com/cdn/shop/articles/Upside_down_gray_cat.png?v=1685551065&width=1500"
                    alt="Me"
                    className="w-[30px] h-[30px] rounded-full"
                  />
                  <input
                    type="text"
                    placeholder="Write a comment..."
                    className="flex-1 px-3 py-2 rounded-full bg-gray-100 text-[13px] outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
