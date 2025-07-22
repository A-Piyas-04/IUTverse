import React, { useState } from 'react';
import Sidebar from "../../components/Sidebar";
import FeedCard from '../../components/FeedCard';
import CatProfiles from '../../components/CatProfiles';
import CatBreak from '../../components/CatBreak';
import CatFacts from '../../components/CatFacts';
import CatQA from '../../components/CatQA';
import './CatCorner.css';

const DUMMY_POSTS = [
  { src: '/assets/cat1.jpg', caption: 'Lazy afternoon', user: 'Alice', time: '2h ago', type: 'image' },
  { src: '/assets/cat2.mp4', caption: 'Playful kitten', user: 'Bob', time: '4h ago', type: 'video' },
  /* … */
];

export default function CatCorner() {
  const [view, setView] = useState('post');
  return (
    <div className="catcorner">
      <Sidebar selected={view} onSelect={setView} />
      <main className="catcorner-main">
        {view === 'post' && (
          <div className="feed-grid">
            {DUMMY_POSTS.map((p,i) => <FeedCard key={i} post={p} />)}
          </div>
        )}
        {view === 'profiles' && <CatProfiles />}
        {view === 'break' && <CatBreak />}
        {view === 'facts' && <CatFacts />}
        {view === 'qa' && <CatQA />}
      </main>
    </div>
  );
}
