import React from 'react';
import './Sidebar.css';

export default function Sidebar({ selected, onSelect }) {
  const items = [
    { key: 'post', label: '🐾 Post' },
    { key: 'profiles', label: '🐱 Profiles' },
    { key: 'break', label: '😌 Cat Break' },
    { key: 'facts', label: '🐈 Facts' },
    { key: 'qa', label: '❓ Cat Care Q&A' },
  ];

  return (
    <nav className="sidebar">
      {items.map(({ key, label }) => (
        <div
          key={key}
          className={`sidebar-item ${selected === key ? 'active' : ''}`}
          onClick={() => onSelect(key)}
        >
          {label}
        </div>
      ))}
    </nav>
  );
}
