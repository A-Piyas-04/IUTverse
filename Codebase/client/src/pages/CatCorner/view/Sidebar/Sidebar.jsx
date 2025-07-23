import React from "react";

const optionData = [
  { label: "Post", emoji: "📝" },
  { label: "Cat Profiles", emoji: "🐾" },
  { label: "Release your Stress", emoji: "😺" },
  { label: "Random Cat Facts", emoji: "📚" },
  { label: "Cat Help Desk", emoji: "🆘" },
];

export default function Sidebar({ selectedView, setSelectedView }) {
  return (
    <aside className="bg-green-50 min-h-full w-60 p-5 border-r border-green-200 shadow-md flex flex-col items-start" style={{ minHeight: '100vh', borderTopRightRadius: 18, borderBottomRightRadius: 18 }}>
      <div style={{ width: '100%' }}>
        <h2 className="text-xl font-extrabold text-green-800 mb-2 flex items-center gap-2" style={{ letterSpacing: '0.01em' }}>
          <span role="img" aria-label="cat">🐱</span> CatCorner
        </h2>
        <hr style={{ border: 'none', borderTop: '2px solid #bbf7d0', margin: '0 0 1.2rem 0' }} />
      </div>
      <ul className="space-y-2 w-full">
        {optionData.map((opt) => (
          <li key={opt.label} className="w-full">
            <button
              onClick={() => setSelectedView(opt.label)}
              className={`w-full flex items-center gap-3 text-left px-4 py-2 rounded-lg transition-all duration-200 shadow-sm font-medium text-base ${
                selectedView === opt.label
                  ? "bg-green-300/30 text-green-900 font-semibold border-l-4 border-green-500"
                  : "hover:bg-green-200/40 text-green-700"
              }`}
              style={{ outline: 'none' }}
            >
              <span style={{ fontSize: '1.35em', lineHeight: 1 }}>{opt.emoji}</span>
              <span>{opt.label}</span>
            </button>
          </li>
        ))}
      </ul>
      <div style={{ marginTop: 'auto', width: '100%' }}>
        <hr style={{ border: 'none', borderTop: '1.5px dashed #bbf7d0', margin: '1.5rem 0 0.5rem 0' }} />
        <div className="text-xs text-green-400 text-center w-full pt-2" style={{ letterSpacing: '0.03em' }}>
          <span role="img" aria-label="paw">🐾</span> Enjoy your time with campus cats!
        </div>
      </div>
    </aside>
  );
}
