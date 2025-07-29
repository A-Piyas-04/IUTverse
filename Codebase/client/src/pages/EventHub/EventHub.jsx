import React, { useState, useMemo } from "react";
import Navbar from "../../components/Navbar/Navbar.jsx";
import EventCard from "./components/EventCard.jsx";
import AddEventModal from "./components/AddEventModal.jsx";
import "./EventHub.css";

// Sample event data
const SAMPLE_EVENTS = [
  {
    id: 1,
    title: "IUT Hackathon 2024",
    type: "Club",
    clubName: "IUT Computer Society",
    date: "2024-12-15",
    time: "10:00 AM",
    location: "Computer Lab, 3rd Floor",
    description: "Join a 24-hour coding marathon to build innovative solutions and compete for top prizes!",
    image: "https://placehold.co/400x250/3b82f6/ffffff?text=Hackathon",
    isWishlisted: false,
    category: "Competition"
  },
  {
    id: 2,
    title: "Freshman Orientation 2024",
    type: "General",
    date: "2024-12-10",
    time: "9:00 AM",
    location: "Main Auditorium",
    description: "Welcome ceremony for new students. Get to know your university, faculty, and fellow students.",
    image: "https://placehold.co/400x250/10b981/ffffff?text=Orientation",
    isWishlisted: true,
    category: "Orientation"
  },
  {
    id: 3,
    title: "Cricket Tournament Finals",
    type: "Sports",
    date: "2024-12-20",
    time: "2:00 PM",
    location: "IUT Cricket Ground",
    description: "Final match of the inter-department cricket tournament. Don't miss the exciting finale!",
    image: "https://placehold.co/400x250/f59e0b/ffffff?text=Cricket+Tournament",
    isWishlisted: false,
    category: "Sports"
  },
  {
    id: 4,
    title: "IUT Cultural Fest 2024",
    type: "Club",
    clubName: "IUT SIKS",
    date: "2024-12-25",
    time: "7:00 PM",
    location: "Open Air Theater",
    description: "A vibrant evening of music, dance, and cultural showcases from all over the country.",
    image: "https://placehold.co/400x250/8b5cf6/ffffff?text=Cultural+Fest",
    isWishlisted: true,
    category: "Celebration"
  },
  {
    id: 5,
    title: "Inter-University Debate Showdown",
    type: "Club",
    clubName: "IUT Debating Society",
    date: "2024-12-18",
    time: "3:00 PM",
    location: "Seminar Room 1",
    description: "Engage in powerful debates on hot topics with students from across universities.",
    image: "https://placehold.co/400x250/ef4444/ffffff?text=Debate+Showdown",
    isWishlisted: false,
    category: "Competition"
  },
  {
    id: 6,
    title: "Basketball Championship",
    type: "Sports",
    date: "2024-12-22",
    time: "4:00 PM",
    location: "IUT Basketball Court",
    description: "Annual basketball championship featuring the best teams from all departments.",
    image: "https://placehold.co/400x250/06b6d4/ffffff?text=Basketball+Championship",
    isWishlisted: false,
    category: "Sports"
  },
  {
    id: 7,
    title: "Eid Celebration",
    type: "General",
    date: "2024-12-30",
    time: "6:00 PM",
    location: "Campus Ground",
    description: "Community celebration of Eid with traditional food, games, and cultural activities.",
    image: "https://placehold.co/400x250/84cc16/ffffff?text=Eid+Celebration",
    isWishlisted: true,
    category: "Celebration"
  },
  {
    id: 8,
    title: "Robotics & AI Workshop",
    type: "Club",
    clubName: "IUT Robotics Society",
    date: "2024-12-12",
    time: "11:00 AM",
    location: "Engineering Lab",
    description: "Learn the fundamentals of robotics and AI through practical sessions with hands-on kits.",
    image: "https://placehold.co/400x250/6366f1/ffffff?text=Robotics+Workshop",
    isWishlisted: false,
    category: "Workshop"
  }
];


// Available clubs for filtering
const AVAILABLE_CLUBS = [
  "IUT Computer Society",
  "IUT Robotics Society",
  "IUT SIKS",
  "IUT Debating Society",
  "IUT Al-Fazari Interstellar Society",
  "IUT Automobile Society", 
  "IUT Career and Business Society",
  "IUT Photographic Society",
  "Al Biruni Society of Scientific Studies"
];

export default function EventHub() {
  const [events, setEvents] = useState(SAMPLE_EVENTS);
  const [filters, setFilters] = useState({
    type: "All",
    club: "All",
    wishlisted: false
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter events based on selected filters
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // Type filter
      if (filters.type !== "All" && event.type !== filters.type) {
        return false;
      }
      
      // Club filter
      if (filters.club !== "All" && event.clubName !== filters.club) {
        return false;
      }
      
      // Wishlisted filter
      if (filters.wishlisted && !event.isWishlisted) {
        return false;
      }
      
      return true;
    });
  }, [events, filters]);

  // Toggle wishlist status
  const toggleWishlist = (eventId) => {
    setEvents(events.map(event => 
      event.id === eventId 
        ? { ...event, isWishlisted: !event.isWishlisted }
        : event
    ));
  };

  // Get unique event types for filter
  const eventTypes = ["All", "General", "Club", "Sports"];

  return (
    <div className="event-hub-page">
      <Navbar />
      
      <main className="event-hub-main">
        {/* Header Section */}
        <div className="event-hub-header animate-slide-in-top">
          <div className="header-content">
            <h1 className="main-title">
              <span className="icon">🎉</span>
              Event Hub
              <span className="icon">🎉</span>
            </h1>
            <p className="subtitle">Discover and join exciting events happening at IUT</p>
            <button 
              className="add-event-btn"
              onClick={() => setIsModalOpen(true)}
            >
              <span className="btn-icon">➕</span>
              Add Your Event
            </button>
          </div>
        </div>

        <div className="event-hub-content">
          {/* Filter Sidebar */}
          <div className="filter-sidebar animate-slide-in-left">
            <div className="filter-section">
              <h3 className="filter-title">Event Type</h3>
              <div className="filter-options">
                {eventTypes.map(type => (
                  <label key={type} className="filter-option">
                    <input
                      type="radio"
                      name="type"
                      value={type}
                      checked={filters.type === type}
                      onChange={(e) => setFilters({...filters, type: e.target.value})}
                    />
                    <span className="filter-label">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            {filters.type === "Club" && (
              <div className="filter-section">
                <h3 className="filter-title">Club Name</h3>
                <div className="filter-options">
                  <label className="filter-option">
                    <input
                      type="radio"
                      name="club"
                      value="All"
                      checked={filters.club === "All"}
                      onChange={(e) => setFilters({...filters, club: e.target.value})}
                    />
                    <span className="filter-label">All Clubs</span>
                  </label>
                  {AVAILABLE_CLUBS.map(club => (
                    <label key={club} className="filter-option">
                      <input
                        type="radio"
                        name="club"
                        value={club}
                        checked={filters.club === club}
                        onChange={(e) => setFilters({...filters, club: e.target.value})}
                      />
                      <span className="filter-label">{club}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="filter-section">
              <h3 className="filter-title">Wishlist</h3>
              <label className="filter-option">
                <input
                  type="checkbox"
                  checked={filters.wishlisted}
                  onChange={(e) => setFilters({...filters, wishlisted: e.target.checked})}
                />
                <span className="filter-label">Show Wishlisted Only</span>
              </label>
            </div>

            <div className="filter-section">
              <button 
                className="clear-filters-btn"
                onClick={() => setFilters({type: "All", club: "All", wishlisted: false})}
              >
                Clear All Filters
              </button>
            </div>
          </div>

          {/* Events Grid */}
          <div className="events-section">
            <div className="events-header animate-slide-in-right">
              <h2 className="events-title">
                {filteredEvents.length} Event{filteredEvents.length !== 1 ? 's' : ''} Found
              </h2>
              <div className="events-count">
                {filters.type !== "All" && <span className="filter-tag">{filters.type}</span>}
                {filters.club !== "All" && <span className="filter-tag">{filters.club}</span>}
                {filters.wishlisted && <span className="filter-tag">Wishlisted</span>}
              </div>
            </div>

            <div className="events-grid">
              {filteredEvents.length === 0 ? (
                <div className="no-events animate-fade-in-scale">
                  <div className="no-events-icon">🎭</div>
                  <h3>No events found</h3>
                  <p>Try adjusting your filters or check back later for new events</p>
                </div>
              ) : (
                filteredEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onToggleWishlist={toggleWishlist}
                    className="animate-stagger"
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Add Event Modal */}
      <AddEventModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
} 