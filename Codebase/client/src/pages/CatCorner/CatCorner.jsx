import React, { useState } from 'react';
import Navbar from '../../components/Navbar/Navbar.jsx';
import Sidebar from "./view/Sidebar/Sidebar.jsx";
import FeedCard from '../../components/CatComponents/FeedCard/FeedCard';
import CatProfiles from './view/CatProfiles/CatProfiles.jsx';
import CatBreak from './view/CatBreak/CatBreak.jsx';
import CatFacts from './view/CatFacts/CatFacts.jsx';
import CatQA from './view/CatQA/CatQA.jsx';
import './CatCorner.css';


const DUMMY_POSTS = [
  { image: '/assets/cat1.jpg', caption: 'Lazy afternoon', user: 'Alice', time: '2h ago', type: 'image' },
  { image: '/assets/cat2.jpg', caption: 'Playful kitten', user: 'Bob', time: '4h ago', type: 'image' },
];

export default function CatCorner() {
  const [view, setView] = useState('Post');

  const renderHeader = () => {
    switch (view) {
      case 'Post': return '🐾 Cat Feed';
      case 'Cat Profiles': return '😺 Meet the Campus Cats';
      case 'Release your Stress': return '🧘‍♂️ Relax with Cats';
      case 'Random Cat Facts': return '📘 Random Cat Facts';
      case 'Cat Help Desk': return '❓ Cat Help Desk';
      default: return '';
    }
  };

  return (
    <div className="catcorner-page">
      <Navbar />
      <div className="catcorner fade-in">
        <Sidebar selectedView={view} setSelectedView={setView} />
        <main className="catcorner-main">
          <h1 className="catcorner-header">{renderHeader()}</h1>
          <div className="catcorner-content">
            {view === 'Post' && (
              <div className="feed-grid">
                {DUMMY_POSTS.map((p, i) => (
                  <div className="feed-card" key={i}>
                    <FeedCard post={p} />
                  </div>
                ))}
              </div>
            )}
            {view === 'Cat Profiles' && (
              <div className="feed-grid">
                <div className="cat-profile-card"><CatProfiles /></div>
              </div>
            )}
            {view === 'Release your Stress' && <CatBreak />}
            {view === 'Random Cat Facts' && <CatFacts />}
            {view === 'Cat Help Desk' && <CatQA />}
          </div>
        </main>
      </div>
    </div>
  );
}
