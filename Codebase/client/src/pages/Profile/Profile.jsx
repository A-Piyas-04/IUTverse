import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar/Navbar.jsx";
import ApiService from "../../services/api.js";
import { useAuth } from "../../contexts/AuthContext.jsx";

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { userId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Posts");
  const [profile, setProfile] = useState(null);
  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showIntroForm, setShowIntroForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);

  // Check if this is the current user's profile or someone else's
  const isOwnProfile = !userId || userId === user?.id?.toString();

  const [introForm, setIntroForm] = useState({
    name: "",
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
    if (!user) {
      console.log("User not loaded yet, skipping profile fetch");
      return;
    }

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const targetUserId = userId || user.id;
        console.log("=== PROFILE FETCH DEBUG ===");
        console.log("URL userId:", userId);
        console.log("Current user.id:", user.id);
        console.log("Target User ID:", targetUserId);
        console.log("isOwnProfile:", isOwnProfile);

        // Fetch profile data
        const profileRes = await ApiService.getProfileByUserId(targetUserId);
        if (profileRes.success && profileRes.data) {
          setProfile(profileRes.data);
        } else {
          setProfile(null);
        }

        // If viewing someone else's profile, we need to get their user info
        if (!isOwnProfile) {
          console.log("Fetching other user's data...");
          try {
            // Test with hardcoded ID first to isolate the issue
            const testUserId = 1;
            console.log("Testing with user ID:", testUserId);

            const userRes = await ApiService.getUserById(testUserId);
            console.log("API Response:", userRes);

            if (userRes.success && userRes.data) {
              console.log(
                "SUCCESS! Setting profileUser with name:",
                userRes.data.name
              );
              setProfileUser({
                id: testUserId,
                name: userRes.data.name || "Unknown User",
                email: userRes.data.email,
                department: userRes.data.department,
                batch: userRes.data.batch,
                studentId: userRes.data.studentId,
              });
            } else {
              console.warn("API call failed:", userRes);
              setProfileUser({
                id: targetUserId,
                name: "Unknown User",
              });
            }
          } catch (userError) {
            console.error("Error in API call:", userError);
            setProfileUser({
              id: targetUserId,
              name: "Unknown User",
            });
          }
        } else {
          console.log("Using current user data");
          setProfileUser(user);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        setProfile(null);
        setProfileUser(null);
      }
      setLoading(false);
    };

    fetchProfile();

    // Initialize form with user name if available and it's own profile
    if (isOwnProfile && user.name) {
      setIntroForm((prev) => ({ ...prev, name: user.name }));
    }
  }, [user, userId, isOwnProfile]);

  const handleIntroChange = (e) => {
    setIntroForm({ ...introForm, [e.target.name]: e.target.value });
  };

  const handleEditProfile = () => {
    // Populate form with existing data
    setIntroForm({
      name: user?.name || "",
      bio: profile?.bio || "",
      schoolName: profile?.schoolName || "",
      collegeName: profile?.collegeName || "",
      currentProgram: profile?.currentProgram || "",
      currentYear: profile?.currentYear || "",
      currentSemester: profile?.currentSemester || "",
      hometown: profile?.hometown || "",
      currentResidence: profile?.currentResidence || "",
      currentHall: profile?.currentHall || "",
      currentRoom: profile?.currentRoom || "",
      currentBed: profile?.currentBed || "",
    });
    setShowEditForm(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    try {
      // Extract name from form data
      const { name, ...profileData } = introForm;

      // Update user name if provided and different from current
      if (name && name.trim() && name.trim() !== user?.name) {
        const nameUpdateResult = await ApiService.updateUserName(name.trim());
        if (!nameUpdateResult.success) {
          alert(`Failed to update name: ${nameUpdateResult.error}`);
          return;
        }
        // Update user context with new name
        updateUser({ name: name.trim() });
      }

      // Update profile with remaining data
      const res = await ApiService.updateProfile(profileData);
      if (res.success) {
        setShowEditForm(false);
        setProfile(res.data);

        // Optionally refresh user data in context if name was updated
        if (name && name.trim() && name.trim() !== user?.name) {
          alert("Name and profile updated successfully!");
        } else {
          alert("Profile updated successfully!");
        }
      } else {
        alert(`Failed to update profile: ${res.error}`);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("An error occurred while updating profile");
    }
  };

  const handleIntroSubmit = async (e) => {
    e.preventDefault();

    try {
      // Extract name from form data
      const { name, ...profileData } = introForm;

      // Update user name if provided
      if (name && name.trim()) {
        const nameUpdateResult = await ApiService.updateUserName(name.trim());
        if (!nameUpdateResult.success) {
          alert(`Failed to update name: ${nameUpdateResult.error}`);
          return;
        }
        // Update user context with new name
        updateUser({ name: name.trim() });
      }

      // Create or update profile with remaining data
      const res = await ApiService.createProfile(profileData);
      if (res.success) {
        setShowIntroForm(false);
        setProfile(res.data);

        // Show appropriate success message
        if (name && name.trim()) {
          alert("Name and profile created successfully!");
        } else {
          alert("Profile created successfully!");
        }
      } else {
        alert(`Failed to create profile: ${res.error}`);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("An error occurred while updating profile");
    }
  };

  const [users, setUsers] = useState([]);

  // Use appropriate user name based on whose profile we're viewing
  const displayUser = isOwnProfile ? user : profileUser;
  const userName = displayUser?.name || "Unknown User";

  console.log("Final userName:", userName, "from displayUser:", displayUser);

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
    <div className="h-screen bg-gray-100 overflow-y-auto">
      <Navbar />
      {!isOwnProfile && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
          <div className="max-w-6xl mx-auto flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
            >
              <span className="text-lg">←</span>
              <span className="font-medium">Back</span>
            </button>
            <div className="text-gray-700">
              <span className="text-sm">Viewing profile of </span>
              <span className="font-semibold">{userName}</span>
            </div>
          </div>
        </div>
      )}
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
            {isOwnProfile && (
              <button className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition-all duration-200 text-sm font-medium">
                <span className="text-base">📷</span>
                <span className="text-gray-700">Edit cover photo</span>
              </button>
            )}
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
              {isOwnProfile && (
                <div className="flex gap-2 mb-4">
                  <button className="flex items-center gap-2 px-4 py-2 bg-[blue-500] text-white rounded-md hover:bg-blue-600 transition-colors text-sm font-medium">
                    <span className="text-lg">+</span>
                    <span>Add to story</span>
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors text-sm font-medium">
                    <span>✏️</span>
                    <span>Edit profile</span>
                  </button>
                </div>
              )}
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

              {loading ? (
                <p>Loading profile...</p>
              ) : !profile ? (
                isOwnProfile ? (
                  showIntroForm ? (
                    <form onSubmit={handleIntroSubmit} className="space-y-2">
                      <input
                        name="name"
                        value={introForm.name}
                        onChange={handleIntroChange}
                        placeholder="Full Name"
                        className="w-full p-2 border rounded"
                      />
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
                  <div className="text-center text-gray-500 py-4">
                    <p>This user hasn't added an intro yet.</p>
                  </div>
                )
              ) : isOwnProfile ? (
                <form onSubmit={handleEditSubmit} className="space-y-2">
                  <button
                    type="button"
                    onClick={handleEditProfile}
                    className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 font-medium transition-colors mb-4 text-sm"
                  >
                    Edit intro
                  </button>

                  {showEditForm ? (
                    <>
                      <input
                        name="name"
                        value={introForm.name}
                        onChange={handleIntroChange}
                        placeholder="Full Name"
                        className="w-full p-2 border rounded"
                      />
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
                        Save Changes
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowEditForm(false)}
                        className="w-full py-2 px-4 bg-gray-200 text-gray-700 rounded mt-2"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                        <strong>আসসালামু আলাইকুম ভাই/আপু।</strong>
                      </div>
                      <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                        আমি <strong> {useAuth().user.name}</strong>
                      </div>
                      <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                        আমি <strong> {profile.schoolName}</strong>   থেকে এসএসসি
                        পাশ করেছি
                      </div>
                      <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                        এবং <strong> {profile.collegeName}</strong>   থেকে
                        এইচএসসি পাশ করেছি
                      </div>
                      <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                        আমি বর্তমানে ইসলামিক ইউনিভার্সিটি অফ টেকনোলজিতে <br />
                      </div>
                      <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                        <strong>{profile.currentDepartment}</strong>  
                        ডিপার্টমেন্টে <br />
                      </div>
                      <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                        {<strong>{profile.currentProgram}</strong>}   প্রোগ্রামে{" "}
                        <br />
                      </div>
                      <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                        {<strong>{profile.currentYear}</strong>}   বর্ষে <br />
                      </div>
                      <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                        {<strong>{profile.currentSemester}</strong>}  
                        সেমিস্টারে অধ্যয়নরত আছি।
                      </div>
                      <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                        আমার স্টুডেন্ট আইডি  {" "}
                        <strong>{profile.studentId}</strong>
                      </div>
                      <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                        আমার হোমটাউন   <strong>{profile.hometown}</strong>
                      </div>
                      <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                        আমার বর্তমান বাসা  {" "}
                        <strong>{profile.currentResidence}</strong>
                      </div>
                      <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                        আমি ইসলামিক ইউনিভার্সিটি অফ টেকনোলজির{" "}
                      </div>
                      <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                        <strong>{profile.currentHall}</strong>   হল অফ রেসিডেন্স
                        বিল্ডিং এ{" "}
                      </div>
                      <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                        {<strong>{profile.currentRoom}</strong>}   রুমে{" "}
                      </div>
                      <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                        {<strong>{profile.currentBed}</strong>}   বেডে থাকি।
                      </div>
                    </div>
                  )}
                </form>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                    <strong>আসসালামু আলাইকুম ভাই/আপু।</strong>
                  </div>
                  <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                    আমি <strong>{displayUser?.name || "Unknown User"}</strong>
                  </div>
                  <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                    আমি <strong>{profile.schoolName}</strong> থেকে এসএসসি পাশ
                    করেছি
                  </div>
                  <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                    এবং <strong>{profile.collegeName}</strong> থেকে এইচএসসি পাশ
                    করেছি
                  </div>
                  <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                    আমি বর্তমানে ইসলামিক ইউনিভার্সিটি অফ টেকনোলজিতে <br />
                  </div>
                  <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                    <strong>{profile.currentDepartment}</strong> ডিপার্টমেন্টে{" "}
                    <br />
                  </div>
                  <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                    <strong>{profile.currentProgram}</strong> প্রোগ্রামে <br />
                  </div>
                  <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                    <strong>{profile.currentYear}</strong> বর্ষে <br />
                  </div>
                  <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                    <strong>{profile.currentSemester}</strong> সেমিস্টারে
                    অধ্যয়নরত আছি।
                  </div>
                  <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                    আমার স্টুডেন্ট আইডি <strong>{profile.studentId}</strong>
                  </div>
                  <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                    আমার হোমটাউন <strong>{profile.hometown}</strong>
                  </div>
                  <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                    আমার বর্তমান বাসা{" "}
                    <strong>{profile.currentResidence}</strong>
                  </div>
                  <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                    আমি ইসলামিক ইউনিভার্সিটি অফ টেকনোলজির
                  </div>
                  <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                    <strong>{profile.currentHall}</strong> হল অফ রেসিডেন্স
                    বিল্ডিং এ
                  </div>
                  <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                    <strong>{profile.currentRoom}</strong> রুমে
                  </div>
                  <div className="flex items-center gap-3 text-[15px] text-gray-700 mt-[5px] mb-[5px]">
                    <strong>{profile.currentBed}</strong> বেডে থাকি।
                  </div>
                </div>
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
                    <p className="text-[13px] text-gray-500 flex items-center gap-1 ">
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
