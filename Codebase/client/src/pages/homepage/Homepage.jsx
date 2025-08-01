import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar/Navbar.jsx";
import PostModal from "../../components/PostModal.jsx";
import PlayerTime from "./view/PlayerTime.jsx";
import BrainTeaser from "./view/Brainteaser.jsx";
import IUTFacts from "./view/iutFacts.jsx";
import { authUtils } from "../../utils/auth.js";
import { postService } from "../../services/postService";
import "./Homepage.css";

export default function HomePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showPrayerTimes, setShowPrayerTimes] = useState(false);
  const [showBrainTeaser, setShowBrainTeaser] = useState(false);
  const [showIUTFacts, setShowIUTFacts] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Fetch user data and posts on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = authUtils.getUserData();
        setUser(userData);
      } catch (error) {
        console.error("Failed to fetch user data:", error);
      }
    };

    const fetchPosts = async () => {
      setIsLoading(true);
      try {
        const postsData = await postService.getPosts();
        console.log("API Response:", postsData);
        console.log("Type of postsData:", typeof postsData);
        console.log("Is Array:", Array.isArray(postsData));

        // Ensure postsData is an array or extract the posts array from the response
        if (postsData && Array.isArray(postsData)) {
          console.log("Setting posts from direct array response");
          setPosts(postsData);
        } else if (
          postsData &&
          postsData.posts &&
          Array.isArray(postsData.posts)
        ) {
          // If the API returns an object with a posts property that's an array
          console.log("Setting posts from postsData.posts");
          setPosts(postsData.posts);
        } else if (
          postsData &&
          postsData.data &&
          Array.isArray(postsData.data)
        ) {
          // If the API returns an object with a data property that's an array
          console.log("Setting posts from postsData.data");
          setPosts(postsData.data);
        } else {
          // Default to empty array if no valid posts data found
          console.error("Invalid posts data format:", postsData);
          setPosts([]);
        }
      } catch (error) {
        console.error("Failed to fetch posts:", error);
        setPosts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
    fetchPosts();
  }, []);

  // Handle image selection for new post
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle creating a new post
  const handleCreatePost = async () => {
    if (!newPostContent.trim() && !selectedImage) return;

    setIsPosting(true);
    try {
      const postData = {
        content: newPostContent,
        image: selectedImage,
        category: "general",
        isAnonymous: false,
      };

      await postService.createPost(postData);

      // Reset form
      setNewPostContent("");
      setSelectedImage(null);
      setImagePreview(null);

      // Refresh posts
      const postsData = await postService.getPosts();
      console.log("Posts after creation:", postsData);

      // Handle different response formats
      if (postsData && Array.isArray(postsData)) {
        setPosts(postsData);
      } else if (
        postsData &&
        postsData.posts &&
        Array.isArray(postsData.posts)
      ) {
        setPosts(postsData.posts);
      } else if (postsData && postsData.data && Array.isArray(postsData.data)) {
        setPosts(postsData.data);
      } else {
        console.error("Invalid posts data format after creation:", postsData);
        // Force a full refresh
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to create post:", error);
    } finally {
      setIsPosting(false);
    }
  };

  // Refresh posts after interactions
  const refreshPosts = useCallback(async () => {
    try {
      const postsData = await postService.getPosts();
      console.log("Refreshed posts data:", postsData);

      // Use the same logic as in fetchPosts to handle different response formats
      if (postsData && Array.isArray(postsData)) {
        setPosts(postsData);
      } else if (
        postsData &&
        postsData.posts &&
        Array.isArray(postsData.posts)
      ) {
        setPosts(postsData.posts);
      } else if (postsData && postsData.data && Array.isArray(postsData.data)) {
        setPosts(postsData.data);
      } else {
        console.error("Invalid posts data format during refresh:", postsData);
        // Don't reset posts array here to avoid losing current data
      }
    } catch (error) {
      console.error("Failed to refresh posts:", error);
    }
  }, []);

  // Handle logout
  const handleLogout = () => {
    authUtils.clearAuthData();
    navigate("/login");
  };

  // Handle menu item clicks
  const handleMenuClick = (label) => {
    switch (label) {
      case "Prayer Times":
        setShowPrayerTimes(true);
        break;
      case "IUT Academic Calendar":
        // TODO: Implement academic calendar popup
        console.log("Academic Calendar clicked");
        break;
      case "Random IUT Fact":
        setShowIUTFacts(true);
        break;
      case "Brain Teaser":
        setShowBrainTeaser(true);
        break;
      case "Today's Weather":
        // TODO: Implement weather popup
        console.log("Today's Weather clicked");
        break;
      default:
        break;
    }
  };

  // Format date function
  const formatDate = (dateString) => {
    if (!dateString) return "";

    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 60) {
        return diffMins <= 1 ? "just now" : `${diffMins} minutes ago`;
      } else if (diffHours < 24) {
        return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
      } else if (diffDays < 7) {
        return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      console.error("Date formatting error:", error);
      return "Invalid date";
    }
  };

  // Get user profile picture
  const getProfilePic = (userData) => {
    return (
      userData?.profilePicture ||
      "https://www.wondercide.com/cdn/shop/articles/Upside_down_gray_cat.png?v=1685551065&width=1500"
    );
  };

  // Process image URLs to ensure they're properly formatted
  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return "";

    // Check if it's already a full URL
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      return imageUrl;
    }

    // Check if it's a relative URL starting with a slash
    if (imageUrl.startsWith("/")) {
      // Get the base part of the API URL (without /api)
      const baseUrl =
        import.meta.env.VITE_API_URL || "http://localhost:3000/api";
      const baseServerUrl = baseUrl.replace(/\/api$/, ""); // Remove /api if present
      return `${baseServerUrl}${imageUrl}`;
    }

    // If it's just a filename, prepend the full API URL path to uploads
    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
    const baseServerUrl = baseUrl.replace(/\/api$/, ""); // Remove /api if present
    return `${baseServerUrl}/uploads/${imageUrl}`;
  };

  return (
    <div className="homepage">
      <Navbar />

      {/* MAIN CONTENT AREA */}
      <main className="main-content animate-fade-in-up">
        {/* LEFT SIDEBAR */}
        <aside className="left-sidebar animate-fade-in-left">
          <h3 className="menu-title">Menu</h3>
          <ul className="menu-list">
            {/* Profile Button */}
            <li className="menu-item">
              <img
                src={getProfilePic(user)}
                alt="Profile"
                className="h-[30px] w-[30px] mr-[12px] rounded-full shadow-md border-2 border-green-400 hover:scale-105 transition-transform duration-200"
                onClick={() => navigate("/profile")}
              />
              <span
                className="menu-label font-bold cursor-pointer"
                onClick={() => navigate("/profile")}
              >
                {user?.name || "Loading..."}
              </span>
            </li>

            {/* New Functional Buttons */}
            {[
              { label: "Prayer Times", icon: "🕌", bg: "bg-green-100" },
              { label: "IUT Academic Calendar", icon: "📅", bg: "bg-blue-100" },
              { label: "Random IUT Fact", icon: "🎓", bg: "bg-yellow-100" },
              { label: "Brain Teaser", icon: "🧠", bg: "bg-pink-100" },
              { label: "Today's Weather", icon: "🌤️", bg: "bg-blue-200" },
            ].map((item, i) => (
              <li
                key={i}
                className="menu-item cursor-pointer"
                onClick={() => handleMenuClick(item.label)}
              >
                <div className={`menu-icon ${item.bg}`}>
                  <span className="menu-icon-text">{item.icon}</span>
                </div>
                <span className="menu-label">{item.label}</span>
              </li>
            ))}
          </ul>
        </aside>

        {/* CENTER FEED */}
        <section className="center-feed">
          {/* Post box */}
          <div className="post-box">
            <div className="post-input-container">
              <img
                src={getProfilePic(user)}
                alt="Profile"
                className="profile-img"
              />
              <input
                type="text"
                placeholder="What's on your mind?"
                className="post-input"
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                disabled={isPosting}
              />
            </div>

            {imagePreview && (
              <div className="relative mx-4 mt-2 mb-3">
                <img
                  src={imagePreview}
                  alt="Selected"
                  className="w-full h-auto max-h-[200px] object-contain rounded-lg border border-gray-300"
                />
                <button
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full w-6 h-6 flex items-center justify-center text-xs"
                  onClick={() => {
                    setSelectedImage(null);
                    setImagePreview(null);
                  }}
                >
                  ×
                </button>
              </div>
            )}

            <div className="post-actions">
              <label className="action-btn photo-video cursor-pointer">
                🖼️ Photo/video
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                  disabled={isPosting}
                />
              </label>
              <button
                className={`action-btn feeling ${
                  !newPostContent.trim() && !selectedImage
                    ? "opacity-50"
                    : "hover:bg-green-100"
                }`}
                onClick={handleCreatePost}
                disabled={
                  (!newPostContent.trim() && !selectedImage) || isPosting
                }
              >
                {isPosting ? "⏳ Posting..." : "📝 Post"}
              </button>
            </div>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
            </div>
          )}

          {/* No posts message */}
          {!isLoading &&
            (!posts || !Array.isArray(posts) || posts.length === 0) && (
              <div className="post p-6 text-center">
                <p className="text-gray-500">
                  No posts yet. Be the first to share!
                </p>
              </div>
            )}

          {/* Posts */}
          {!isLoading &&
            posts &&
            Array.isArray(posts) &&
            posts.length > 0 &&
            posts.map((post) => (
              <div
                key={post.id}
                className="post"
                onClick={() => setSelectedPost(post)}
              >
                {/* Post Header */}
                <div className="post-header">
                  <img
                    src={getProfilePic(post.user)}
                    alt="Profile"
                    className="profile-img mt-[30px]"
                  />
                  <div className="post-user-info">
                    <h4
                      className="post-username cursor-pointer hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (post.user?.id) {
                          navigate(`/profile/${post.user.id}`);
                        }
                      }}
                    >
                      {post.user?.name || "Anonymous"}
                    </h4>
                    <p className="post-meta">
                      {formatDate(post.createdAt)} •{" "}
                      <span className="text-blue-500">🌐</span>
                    </p>
                  </div>
                  <button className="post-options-btn">
                    <span className="text-xl">⋯</span>
                  </button>
                </div>

                {/* Post Content */}
                <div className="post-content">
                  <div className="post-text">{post.content}</div>
                  {post.image && (
                    <>
                      {console.log(
                        "Image URL for post",
                        post.id,
                        ":",
                        post.image
                      )}
                      <img
                        src={getImageUrl(post.image)}
                        alt="Post"
                        className="post-image"
                        onError={(e) => {
                          console.error("Image failed to load:", post.image);
                          // Set a placeholder image on error
                          e.target.src =
                            "https://via.placeholder.com/400x300?text=Image+Not+Available";
                          e.target.onerror = null; // Prevent infinite error loop
                        }}
                      />
                    </>
                  )}
                </div>

                {/* Reactions and Comments Count */}
                <div className="post-stats">
                  <div className="post-reactions">
                    <div className="reaction-icons">
                      <span className="text-blue-500">👍</span>
                      <span className="text-red-500">❤️</span>
                    </div>
                    <span>{post._count?.reactions || 0}</span>
                  </div>
                  <div className="flex gap-4">
                    <span>{post._count?.comments || 0} comments</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="post-actions-buttons">
                  <button
                    className="post-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      postService
                        .reactToPost(post.id, "LIKE")
                        .then(refreshPosts)
                        .catch((err) =>
                          console.error("Failed to like post:", err)
                        );
                    }}
                  >
                    <span>👍</span>
                    <span>Like</span>
                  </button>
                  <button className="flex items-center justify-center gap-2 py-2 px-4 mr-[5px] hover:bg-gray-100 rounded transition-colors text-gray-600 text-[15px] font-medium flex-1">
                    <span>💬</span>
                    <span>Comment</span>
                  </button>
                </div>
              </div>
            ))}
          {/* Post Detail Modal */}
          {selectedPost && (
            <PostModal
              post={selectedPost}
              onClose={() => setSelectedPost(null)}
              refreshPosts={refreshPosts}
            />
          )}
        </section>

        {/* RIGHT SIDEBAR */}
        <aside className="right-sidebar animate-fade-in-right">
          <h3 className="contacts-title">Contacts</h3>
          <ul className="contacts-list">
            {[
              "Abu Zafar Sheikh Mohammad Golam Musabbereen Chishti",
              "Irfan Shafee",
              "Samiur Rahman Nafiz",
              "Faiyaz Awsaf",
              "Mashrur Faiyaz",
            ].map((name, i) => (
              <li key={i} className="contact-item">
                <img
                  src="https://www.wondercide.com/cdn/shop/articles/Upside_down_gray_cat.png?v=1685551065&width=1500"
                  alt="User"
                  className="contact-img"
                />
                <span className="contact-name">{name}</span>
              </li>
            ))}
          </ul>
        </aside>
      </main>

      {/* Prayer Times Modal */}
      <PlayerTime
        isOpen={showPrayerTimes}
        onClose={() => setShowPrayerTimes(false)}
      />

      {/* Brain Teaser Modal */}
      <BrainTeaser
        isOpen={showBrainTeaser}
        onClose={() => setShowBrainTeaser(false)}
      />

      {/* IUT Facts Modal */}
      <IUTFacts isOpen={showIUTFacts} onClose={() => setShowIUTFacts(false)} />

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
