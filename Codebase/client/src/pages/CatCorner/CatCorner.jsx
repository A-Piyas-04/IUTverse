import React, { useState } from 'react';
import Navbar from '../../components/Navbar/Navbar.jsx';
import Sidebar from "./view/Sidebar/Sidebar.jsx";
import FeedCard from '../../components/CatComponents/FeedCard/FeedCard';
import CatProfiles from './view/CatProfiles/CatProfiles.jsx';
import CatBreak from './view/CatBreak/CatBreak.jsx';
import CatFacts from './view/CatFacts/CatFacts.jsx';
import CatQA from './view/CatQA/CatQA.jsx';
import CatJumps from './view/CatJumps/CatJumps.jsx';
import './CatCorner.css';

const DUMMY_POSTS = [
  { image: '/assets/cat1.jpg', caption: 'Lazy afternoon', user: 'Alice', time: '2h ago', type: 'image' },
  { image: '/assets/cat2.jpg', caption: 'Playful kitten', user: 'Bob', time: '4h ago', type: 'image' },
];

export default function CatCorner() {
  const [view, setView] = useState('Posts');

  const renderHeader = () => {
    switch (view) {
      case 'Posts': return '🐾 Cat Feed';
      case 'Cat Profiles': return '😺 Meet the Campus Cats';
      case 'Release your Stress': return '🧘‍♂️ Relax with Cats';
      case 'Random Cat Facts': return '📘 Random Cat Facts';
      // case 'Cat Jumps!!': return '🎮 Cat Jumps';
      case 'Cat Help Desk': return '❓ Cat Help Desk';
      default: return '';
    }
  };

  return (
    <div className="catcorner-page">
      <Navbar />
      <div className="catcorner fade-in">
        {/* ✅ Sidebar already styled with CSS — no wrapper or inline styles needed */}
        <Sidebar selectedView={view} setSelectedView={setView} />

        <main className="catcorner-main">
          <h1 className="catcorner-header">{renderHeader()}</h1>

          <div className="catcorner-content">
            {view === 'Posts' && (
              <div className="feed-grid">
                {DUMMY_POSTS.map((p, i) => (
                  <div className="feed-card" key={i}>
                    <FeedCard post={p} />
                  </div>
                ))}
              </div>
            )}

            {view === 'Cat Profiles' && (
              <CatProfiles /> // ✅ New grid layout + softer animations are handled inside the component
            )}

            {view === 'Release your Stress' && <CatBreak />}
            {view === 'Random Cat Facts' && <CatFacts />}
            {/* {view === 'Cat Jumps!!' && <CatJumps />} */}
            {view === 'Cat Help Desk' && <CatQA />}
          </div>
        </main>
      </div>
    </div>
  );
}
