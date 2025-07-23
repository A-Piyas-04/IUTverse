import React, { useState } from 'react';

export default function CatQA() {
  const [q, setQ] = useState('');
  const [list, setList] = useState([]);
  const ask = () => {
    if (q.trim()) setList([...list, { q, time: new Date().toLocaleTimeString() }]);
    setQ('');
  };
  
  return (
    <div>
      <h3>Ask a Cat-Care Question</h3>
      <textarea
        rows="3"
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="e.g. How often should I feed stray cats?"
      />
      <button onClick={ask}>Submit</button>
      <ul>
        {list.map((item,i) => (
          <li key={i}>
            <strong>{item.time}</strong> – {item.q}
          </li>
        ))}
      </ul>
    </div>
  );
}
