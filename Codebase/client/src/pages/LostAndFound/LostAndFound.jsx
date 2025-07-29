import React, { useState, useMemo, useEffect } from "react";
import Navbar from "../../components/Navbar/Navbar.jsx";
import LostFoundCard from "./components/lostfoundcard.jsx";
import AddPostModal from "./components/addpostmodal.jsx";
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
      return posts.filter(post => {
        const matchesFilter = filter === 'all' || post.type === filter;
        const matchesSearch = !searchTerm || 
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
      console.log('Fetching posts...');
      const response = await getLostAndFoundPosts();
      console.log('Fetched posts response:', response);
      
      // Handle the response - it should be an array of posts
      if (Array.isArray(response)) {
        console.log('Setting posts from array response:', response);
        setPosts(response);
      } else if (response && Array.isArray(response.data)) {
        console.log('Setting posts from response.data:', response.data);
        setPosts(response.data);
      } else {
        console.warn('Unexpected response format:', response);
        setPosts([]);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      setPosts([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  // Add new post
  const handleAddPost = async (formData) => {
    try {
      console.log('LostAndFound - handleAddPost called');
      console.log('LostAndFound - Submitting form data:');
      for (let [key, value] of formData.entries()) {
        console.log(key, value);
      }
      
      console.log('LostAndFound - About to call createLostAndFoundPost API');
      const response = await createLostAndFoundPost(formData);
      console.log('LostAndFound - Post creation response:', response);
      
      // Handle the response - extract the created post
      let createdPost = null;
      if (response && typeof response === 'object') {
        if (response.data) {
          createdPost = response.data;
        } else if (response.id) {
          createdPost = response;
        }
      }
      
      console.log('Created post:', createdPost);
      
      if (createdPost) {
        // Add the new post to the beginning of the posts array
        setPosts(prevPosts => {
          console.log('Adding new post to existing posts. Current count:', prevPosts.length);
          const updatedPosts = [createdPost, ...prevPosts];
          console.log('Updated posts count:', updatedPosts.length);
          return updatedPosts;
        });
        
        setShowAddModal(false);
        
        // Refresh posts from server to ensure consistency
        console.log('Refreshing posts from server...');
        await fetchPosts();
      } else {
        console.warn('No valid post data received from server');
        // Still refresh to get the latest data
        await fetchPosts();
        setShowAddModal(false);
      }
    } catch (error) {
      console.error('LostAndFound - Error creating post:', error);
      console.error('LostAndFound - Error message:', error.message);
      console.error('LostAndFound - Error stack:', error.stack);
      console.error('LostAndFound - Error name:', error.name);
      
      // Show detailed error to user
      const errorMessage = error.message || 'Unknown error occurred';
      console.log('LostAndFound - Showing error to user:', errorMessage);
      alert(`Failed to create post: ${errorMessage}\n\nCheck browser console for more details.`);
    }
  };

  // Mark post as resolved
  const handleResolvePost = async (postId) => {
    try {
      const response = await markPostAsResolved(postId);
      // Handle API response structure
      const updatedPost = response.data || response;
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
