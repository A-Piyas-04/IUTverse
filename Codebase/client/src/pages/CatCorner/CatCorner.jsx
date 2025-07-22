import React, { useState } from 'react';
import Sidebar from "../../components/Sidebar/Sidebar";
import FeedCard from '../../components/FeedCard/FeedCard';
import CatProfiles from '../../components/CatProfiles/CatProfiles';
import CatBreak from '../../components/CatBreak/CatBreak';
import CatFacts from '../../components/CatFacts/CatFacts';
import CatQA from '../../components/CatQA/CatQA';
import './CatCorner.css';

const DUMMY_POSTS = [
  { image: '/assets/cat1.jpg', caption: 'Lazy afternoon', user: 'Alice', time: '2h ago', type: 'image' },
  { image: '/assets/cat2.jpg', caption: 'Playful kitten', user: 'Bob', time: '4h ago', type: 'image' },
  // ...
];

export default function CatCorner() {
  const [view, setView] = useState('Post');
  function renderHeader() {
    switch (view) {
      case 'Post': return 'Cat Feed';
      case 'Cat Profiles': return 'Meet the Campus Cats';
      case 'Release your Stress': return 'Relax with Cats';
      case 'Random Cat Facts': return 'Cat Facts';
      case 'Cat Help Desk': return 'Cat Help Desk';
      default: return '';
    }
  }
  return (
    <div className="catcorner">
      <Sidebar selectedView={view} setSelectedView={setView} />
      <main className="catcorner-main">
        <div className="catcorner-header">{renderHeader()}</div>
        {view === 'Post' && (
          <div className="feed-grid">
            {DUMMY_POSTS.map((p,i) => <div className="feed-card" key={i}><FeedCard post={p} /></div>)}
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
      </main>
    </div>
  );
}
