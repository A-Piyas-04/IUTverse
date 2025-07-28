import React, { useState, useEffect } from "react";
import Navbar from "../../components/Navbar/Navbar.jsx";
import ApiService from "../../services/api.js";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { useProfile } from "../../hooks/useProfile.js";

export default function Profile() {
  const { user } = useAuth();
  const { profileData, userPosts, loading, error, createPost, toggleLike, deletePost } = useProfile();
  const [activeTab, setActiveTab] = useState("Posts");
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [showIntroForm, setShowIntroForm] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [showPostCreator, setShowPostCreator] = useState(false);
  const [introForm, setIntroForm] = useState({
    bio: "",
    schoolName: "",
    collegeName: "",
    currentProgram: "",
    currentYear: "",
    currentSemester: "",
    hometown: "",
    currentResidence: "",
    currentHall: "",
    currentRoom: "",
    currentBed: "",
  });

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      setProfileLoading(true);
      const res = await ApiService.getProfileByUserId(user.id);
      if (res.success && res.data) {
        setProfile(res.data);
      } else {
        setProfile(null);
      }
      setProfileLoading(false);
    };
    fetchProfile();
  }, [user]);

  const handleIntroChange = (e) => {
    setIntroForm({ ...introForm, [e.target.name]: e.target.value });
  };

  const handleIntroSubmit = async (e) => {
    e.preventDefault();
    const res = await ApiService.createProfile(introForm);
    if (res.success) {
      setShowIntroForm(false);
      setProfile(res.data);
    } else {
      alert("Failed to create profile");
    }
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;
    
    setIsCreatingPost(true);
    try {
      const result = await createPost(newPostContent);
      if (result.success) {
        setNewPostContent("");
        setShowPostCreator(false);
      } else {
        alert(result.message || "Failed to create post");
      }
    } catch (error) {
      alert("Failed to create post");
    } finally {
      setIsCreatingPost(false);
    }
  };

  const handleLikePost = async (postId) => {
    await toggleLike(postId);
  };

  const handleDeletePost = async (postId) => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      await deletePost(postId);
    }
  };

  const navigate = () => {};
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
    <div className="h-screen bg-gray-100 overflow-y-auto">
      {" "}
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

              {profileLoading ? (
                <p>Loading profile...</p>
              ) : !profile ? (
                showIntroForm ? (
                  <form onSubmit={handleIntroSubmit} className="space-y-2">
                    <input
                      name="bio"
                      value={introForm.bio}
                      onChange={handleIntroChange}
                      placeholder="Bio"
                      className="w-full p-2 border rounded"
                    />
                    <input
                      name="schoolName"
                      value={introForm.schoolName}
                      onChange={handleIntroChange}
                      placeholder="School Name"
                      className="w-full p-2 border rounded"
                    />
                    <input
                      name="collegeName"
                      value={introForm.collegeName}
                      onChange={handleIntroChange}
                      placeholder="College Name"
                      className="w-full p-2 border rounded"
                    />
                    <input
                      name="currentProgram"
                      value={introForm.currentProgram}
                      onChange={handleIntroChange}
                      placeholder="Current Program"
                      className="w-full p-2 border rounded"
                    />
                    <input
                      name="currentYear"
                      value={introForm.currentYear}
                      onChange={handleIntroChange}
                      placeholder="Current Year"
                      className="w-full p-2 border rounded"
                    />
                    <input
                      name="currentSemester"
                      value={introForm.currentSemester}
                      onChange={handleIntroChange}
                      placeholder="Current Semester"
                      className="w-full p-2 border rounded"
                    />
                    <input
                      name="hometown"
                      value={introForm.hometown}
                      onChange={handleIntroChange}
                      placeholder="Hometown"
                      className="w-full p-2 border rounded"
                    />
                    <input
                      name="currentResidence"
                      value={introForm.currentResidence}
                      onChange={handleIntroChange}
                      placeholder="Current Residence"
                      className="w-full p-2 border rounded"
                    />
                    <input
                      name="currentHall"
                      value={introForm.currentHall}
                      onChange={handleIntroChange}
                      placeholder="Current Hall"
                      className="w-full p-2 border rounded"
                    />
                    <input
                      name="currentRoom"
                      value={introForm.currentRoom}
                      onChange={handleIntroChange}
                      placeholder="Current Room"
                      className="w-full p-2 border rounded"
                    />
                    <input
                      name="currentBed"
                      value={introForm.currentBed}
                      onChange={handleIntroChange}
                      placeholder="Current Bed"
                      className="w-full p-2 border rounded"
                    />
                    <button
                      type="submit"
                      className="w-full py-2 px-4 bg-blue-500 text-white rounded"
                    >
                      Save Intro
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowIntroForm(false)}
                      className="w-full py-2 px-4 bg-gray-200 text-gray-700 rounded mt-2"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={() => setShowIntroForm(true)}
                    className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 font-medium transition-colors mb-4 text-sm"
                  >
                    Add intro
                  </button>
                )
              ) : (
                <form onSubmit={handleIntroSubmit} className="space-y-2">
                  <button
                    type="submit"
                    className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 font-medium transition-colors mb-4 text-sm"
                  >
                    Edit intro
                  </button>

                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                      <strong>আসসালামু আলাইকুম ভাই/আপু।</strong>
                    </div>
                    <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                      আমি <strong> {profile.userName}</strong>
                    </div>
                    <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                      আমি <strong> {profile.schoolName}</strong>   থেকে এসএসসি পাশ করেছি
                    </div>
                    <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                      এবং <strong> {profile.collegeName}</strong>   থেকে এইচএসসি পাশ করেছি
                    </div>
                    <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                      আমি বর্তমানে ইসলামিক ইউনিভার্সিটি অফ টেকনোলজিতে <br />
                    </div>
                    <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                      <strong>{profile.currentDepartment}</strong>   ডিপার্টমেন্টে <br />
                    </div>
                    <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                      {<strong>{profile.currentProgram}</strong>}   প্রোগ্রামে <br />
                    </div>
                    <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                      {<strong>{profile.currentYear}</strong>}   বর্ষে <br />
                    </div>
                    <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                      {<strong>{profile.currentSemester}</strong>}   সেমিস্টারে অধ্যয়নরত
                      আছি।
                    </div>
                    <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                      আমার স্টুডেন্ট আইডি   <strong>{profile.studentId}</strong>
                    </div>
                    <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                      আমার হোমটাউন   <strong>{profile.hometown}</strong>
                    </div>
                    <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                      আমার বর্তমান বাসা   <strong>{profile.currentResidence}</strong>
                    </div>
                    <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                      আমি ইসলামিক ইউনিভার্সিটি অফ টেকনোলজির{" "}
                    </div>
                    <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                      <strong>{profile.currentHall}</strong>   হল অফ রেসিডেন্স বিল্ডিং এ{" "}
                    </div>
                    <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                      {<strong>{profile.currentRoom}</strong>}   রুমে{" "}
                    </div>
                    <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                      {<strong>{profile.currentBed}</strong>}   বেডে থাকি।
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
                </form>
              )}
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
            {/* Enhanced Create Post */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
              {!showPostCreator ? (
                /* Collapsed Post Creator */
                <div className="flex items-center gap-3">
                  <div className="w-[42px] h-[42px] mr-[12px] rounded-full overflow-hidden flex-shrink-0">
                    {profilePicture}
                  </div>
                  <button
                    onClick={() => setShowPostCreator(true)}
                    className="flex-1 py-3 px-4 bg-gray-100 rounded-[25px] text-gray-500 text-left hover:bg-gray-200 transition-colors text-sm"
                  >
                    What's on your mind?
                  </button>
                </div>
              ) : (
                /* Expanded Post Creator */
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-[42px] h-[42px] mr-[12px] rounded-full overflow-hidden flex-shrink-0">
                      {profilePicture}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">Create a post</h3>
                      <p className="text-sm text-gray-500">{user?.name || user?.email || "Anonymous"}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowPostCreator(false);
                        setNewPostContent("");
                      }}
                      className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-gray-100 rounded-full"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="relative">
                    <textarea
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      placeholder="What's on your mind?"
                      className="w-full min-h-[120px] p-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                      maxLength={500}
                      disabled={isCreatingPost}
                    />
                    <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                      {newPostContent.length}/500
                    </div>
                  </div>

                  {/* Post Options */}
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <button className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors">
                          <span className="text-green-500">📷</span>
                          <span className="text-gray-600 text-sm font-medium">Photo/video</span>
                        </button>
                        <button className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors">
                          <span className="text-yellow-500">😊</span>
                          <span className="text-gray-600 text-sm font-medium">Feeling/activity</span>
                        </button>
                        <button className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors">
                          <span className="text-red-500">📍</span>
                          <span className="text-gray-600 text-sm font-medium">Check in</span>
                        </button>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setShowPostCreator(false);
                            setNewPostContent("");
                          }}
                          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
                          disabled={isCreatingPost}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleCreatePost}
                          disabled={!newPostContent.trim() || isCreatingPost}
                          className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
                            newPostContent.trim() && !isCreatingPost
                              ? 'bg-blue-500 text-white hover:bg-blue-600'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {isCreatingPost ? (
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>Posting...</span>
                            </div>
                          ) : (
                            'Post'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Action Buttons (shown when collapsed) */}
              {!showPostCreator && (
                <div className="flex justify-around pt-3 mt-4 border-t border-gray-200">
                  <button 
                    onClick={() => setShowPostCreator(true)}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <span className="text-red-500">🎥</span>
                    <span className="text-gray-600 text-sm font-medium">Live video</span>
                  </button>
                  <button 
                    onClick={() => setShowPostCreator(true)}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <span className="text-green-500">📷</span>
                    <span className="text-gray-600 text-sm font-medium">Photo/video</span>
                  </button>
                  <button 
                    onClick={() => setShowPostCreator(true)}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <span className="text-yellow-500">😊</span>
                    <span className="text-gray-600 text-sm font-medium">Life event</span>
                  </button>
                </div>
              )}
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
            {loading ? (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <p className="text-gray-500">Loading posts...</p>
              </div>
            ) : error ? (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <p className="text-red-500">Error: {error}</p>
              </div>
            ) : userPosts.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <p className="text-gray-500">No posts yet. Create your first post above!</p>
              </div>
            ) : (
              userPosts.map((post) => (
                <div
                  key={post.id}
                  className="bg-[#f9fafb] rounded-[25px] mt-4 shadow-sm mb-[20px]"
                >
                  {/* Post Header */}
                  <div className="flex items-start gap-3 p-4 pb-3 ml-[10px]">
                    <div className="w-[42px] h-[42px] mr-[12px] rounded-full overflow-hidden flex-shrink-0 mt-[30px]">
                      {profilePicture}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-[15px] text-gray-900 mt-[30px]">
                        {post.author?.name || user?.name || "Anonymous"}
                      </h4>
                      <p className="text-[13px] text-gray-500 flex items-center gap-1 ">
                        {new Date(post.createdAt).toLocaleDateString()} • <span className="text-blue-500">🌐</span>
                      </p>
                    </div>
                    <button 
                      onClick={() => handleDeletePost(post.id)}
                      className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                    >
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
                      <span>{post.likesCount || 0}</span>
                    </div>
                    <div className="flex gap-4">
                      <span className="mr-[5px]">{post.commentsCount || 0} comments</span>
                      <span>{post.sharesCount || 0} shares</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-around border-t border-gray-200 py-1">
                    <button 
                      onClick={() => handleLikePost(post.id)}
                      className={`flex items-center justify-center gap-2 py-2 px-4 hover:bg-gray-100 rounded transition-colors text-[15px] font-medium flex-1 ${
                        post.isLikedByCurrentUser ? 'text-blue-500' : 'text-gray-600'
                      }`}
                    >
                      <span>{post.isLikedByCurrentUser ? '👍' : '👍'}</span>
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
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
