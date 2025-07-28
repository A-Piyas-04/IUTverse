import React, { useState, useMemo, useEffect } from "react";
import Navbar from "../../components/Navbar/Navbar.jsx";
import LostFoundCard from "./components/LostFoundCard.jsx";
import AddPostModal from "./components/AddPostModal.jsx";
import { 
  getLostAndFoundPosts, 
  createLostAndFoundPost, 
  markPostAsResolved 
} from "../../services/lostAndFoundApi.js";
import "./LostAndFound.css";

// Sample data - in a real app, this would come from a database
const SAMPLE_POSTS = [
  {
    id: 1,
    type: "lost",
    title: "Lost iPhone 14 Pro",
    description:
      "Lost my iPhone 14 Pro near the cafeteria. It has a black case with a cat sticker. Please contact if found!",
    location: "Cafeteria Area",
    date: "2024-01-15",
    time: "14:30",
    contact: "alice@iut.edu",
    image: "https://placehold.co/400x300/4ade80/ffffff?text=iPhone",
    user: "Alice Johnson",
    status: "active",
  },
  {
    id: 2,
    type: "found",
    title: "Found Blue Water Bottle",
    description:
      "Found a blue water bottle with 'IUT' written on it near the library entrance. Contact me to claim it.",
    location: "Library Entrance",
    date: "2024-01-15",
    time: "16:45",
    contact: "bob@iut.edu",
    image: "https://placehold.co/400x300/60a5fa/ffffff?text=Water+Bottle",
    user: "Bob Smith",
    status: "active",
  },
  {
    id: 3,
    type: "lost",
    title: "Lost Student ID Card",
    description:
      "Lost my student ID card somewhere between the admin building and parking lot. Name: Sarah Wilson.",
    location: "Admin Building to Parking Lot",
    date: "2024-01-14",
    time: "09:15",
    contact: "sarah@iut.edu",
    image: "https://placehold.co/400x300/f59e0b/ffffff?text=ID+Card",
    user: "Sarah Wilson",
    status: "active",
  },
  {
    id: 4,
    type: "found",
    title: "Found Black Backpack",
    description:
      "Found a black backpack with laptop inside near the computer lab. Please provide details to claim.",
    location: "Computer Lab",
    date: "2024-01-14",
    time: "18:20",
    contact: "mike@iut.edu",
    image: "https://placehold.co/400x300/6b7280/ffffff?text=Backpack",
    user: "Mike Davis",
    status: "active",
  },
  {
    id: 5,
    type: "lost",
    title: "Lost AirPods Case",
    description:
      "Lost my AirPods charging case (white) in the student lounge. Has a small scratch on the front.",
    location: "Student Lounge",
    date: "2024-01-13",
    time: "12:30",
    contact: "emma@iut.edu",
    image: "https://placehold.co/400x300/e5e7eb/000000?text=AirPods",
    user: "Emma Brown",
    status: "active",
  },
];

export default function LostAndFound() {
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Filter posts based on type and search term
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesFilter = filter === "all" || post.type === filter;
      const matchesSearch =
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.location.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [posts, filter, searchTerm]);

  // Fetch posts from API
  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedPosts = await getLostAndFoundPosts({
        type: filter,
        search: searchTerm
      });
      setPosts(fetchedPosts);
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('Failed to load posts. Please try again.');
      // Fallback to sample data if API fails
      setPosts(SAMPLE_POSTS);
    } finally {
      setLoading(false);
    }
  };

  // Add new post
  const handleAddPost = async (newPost) => {
    try {
      setSubmitting(true);
      const createdPost = await createLostAndFoundPost(newPost);
      setPosts([createdPost, ...posts]);
      setShowAddModal(false);
    } catch (err) {
      console.error('Error creating post:', err);
      setError('Failed to create post. Please try again.');
      // Fallback: add to local state with temporary ID
      const post = {
        ...newPost,
        id: Date.now(),
        date: new Date().toISOString().split("T")[0],
        time: new Date().toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
        }),
        status: "active",
        user: "Current User"
      };
      setPosts([post, ...posts]);
      setShowAddModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  // Mark post as resolved
  const handleResolvePost = async (postId) => {
    try {
      await markPostAsResolved(postId);
      setPosts(
        posts.map((post) =>
          post.id === postId ? { ...post, status: "resolved" } : post
        )
      );
    } catch (err) {
      console.error('Error resolving post:', err);
      setError('Failed to resolve post. Please try again.');
      // Fallback: update local state anyway
      setPosts(
        posts.map((post) =>
          post.id === postId ? { ...post, status: "resolved" } : post
        )
      );
    }
  };

  // Load posts on component mount and when filter/search changes
  useEffect(() => {
    fetchPosts();
  }, [filter, searchTerm]);

  // Refresh posts function
  const handleRefresh = () => {
    fetchPosts();
  };

  return (
    <div className="lost-found-page">
      <Navbar />
      
      <main className="lost-found-main">
        {/* Header Section */}
        <div className="lost-found-header animate-slide-in-top">
          <div className="header-content">
            <h1 className="main-title">
              <span className="icon">🔍</span>
              Lost & Found
              <span className="icon">🔍</span>
            </h1>
            <p className="subtitle">
              Help each other find lost items and return found belongings
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message animate-slide-in-top">
            <span className="error-icon">⚠️</span>
            {error}
            <button className="error-dismiss" onClick={() => setError(null)}>×</button>
          </div>
        )}

        {/* Controls Section */}
        <div className="controls-section animate-slide-in-bottom">
          <div className="search-filter-container">
            {/* Search */}
            <div className="search-container">
              <div className="search-box">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search items, locations, descriptions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Filter Toggle */}
            <div className="filter-container">
              <div className="filter-toggle">
                <button
                  className={`filter-btn ${filter === "all" ? "active" : ""}`}
                  onClick={() => setFilter("all")}
                  disabled={loading}
                >
                  All Posts
                </button>
                <button
                  className={`filter-btn ${filter === "lost" ? "active" : ""}`}
                  onClick={() => setFilter("lost")}
                  disabled={loading}
                >
                  <span className="lost-icon">❌</span> Lost
                </button>
                <button
                  className={`filter-btn ${filter === "found" ? "active" : ""}`}
                  onClick={() => setFilter("found")}
                  disabled={loading}
                >
                  <span className="found-icon">✅</span> Found
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="action-buttons-container">
            <button
              className="refresh-btn"
              onClick={handleRefresh}
              disabled={loading}
              title="Refresh posts"
            >
              <span className={`refresh-icon ${loading ? 'spinning' : ''}`}>🔄</span>
              Refresh
            </button>
            <button
              className="add-post-btn"
              onClick={() => setShowAddModal(true)}
              disabled={loading}
            >
              <span className="add-icon">+</span>
              Add Post
            </button>
          </div>
        </div>

        {/* Results Info */}
        <div className="results-info animate-slide-in-left">
          <span className="results-count">
            {filteredPosts.length} post{filteredPosts.length !== 1 ? "s" : ""}{" "}
            found
          </span>
        </div>

        {/* Posts Grid */}
        <div className="posts-grid">
          {loading ? (
            <div className="loading-container animate-fade-in-scale">
              <div className="loading-spinner"></div>
              <h3>Loading posts...</h3>
              <p>Please wait while we fetch the latest posts</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="no-posts animate-fade-in-scale">
              <div className="no-posts-icon">🔍</div>
              <h3>No posts found</h3>
              <p>Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            filteredPosts.map((post) => (
              <LostFoundCard
                key={post.id}
                post={post}
                onResolve={handleResolvePost}
                className="animate-stagger"
              />
            ))
          )}
        </div>
      </main>

      {/* Add Post Modal */}
      {showAddModal && (
        <AddPostModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddPost}
          isSubmitting={submitting}
        />
      )}
    </div>
  );
}
