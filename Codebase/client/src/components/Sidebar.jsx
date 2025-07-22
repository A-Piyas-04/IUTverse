import React from "react";

export default function Sidebar({ selectedView, setSelectedView }) {
  const options = [
    "Post",
    "Cat Profiles",
    "Release your Stress",
    "Random Cat Facts",
    "Cat Help Desk", // renamed from "Cat Inquiry"
  ];

  return (
    <div className="bg-green-50 min-h-full w-56 p-4 border-r border-green-200 shadow-sm">
      <h2 className="text-lg font-bold text-green-700 mb-4">CatCorner</h2>
      <ul className="space-y-2">
        {options.map((opt) => (
          <li key={opt}>
            <button
              onClick={() => setSelectedView(opt)}
              className={`w-full text-left px-3 py-2 rounded-md transition-all duration-200 ${
                selectedView === opt
                  ? "bg-green-300/20 text-green-900 font-semibold"
                  : "hover:bg-green-200/30 text-green-700"
              }`}
            >
              {opt}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
