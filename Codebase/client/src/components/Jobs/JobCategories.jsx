import React from "react";

export default function JobCategories({
  jobs,
  selectedCategory,
  setSelectedCategory,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
}) {
  const categories = [
    { label: "All Jobs", icon: "📋", count: jobs.length },
    {
      label: "Internship",
      icon: "🎓",
      count: jobs.filter((job) => job.type === "Internship").length,
    },
    {
      label: "Freelance",
      icon: "💼",
      count: jobs.filter((job) => job.type === "Freelance").length,
    },
    {
      label: "Part-time",
      icon: "⏰",
      count: jobs.filter((job) => job.type === "Part-time").length,
    },
    {
      label: "Volunteer",
      icon: "🤝",
      count: jobs.filter((job) => job.type === "Volunteer").length,
    },
  ];

  return (
    <aside className={`flex flex-col w-[320px] max-w-xs p-4 text-gray-800 space-y-4 backdrop-blur-md bg-green-50/60 rounded-2xl shadow-xl mt-6 animate-fade-in-left md:relative md:translate-x-0 md:left-auto ${
      isMobileMenuOpen 
        ? 'fixed top-[80px] left-0 z-45 h-[calc(100vh-80px)] overflow-y-auto transform translate-x-0' 
        : 'fixed top-[80px] left-[-100%] z-45 h-[calc(100vh-80px)] overflow-y-auto transform -translate-x-full md:translate-x-0'
    } transition-all duration-300 ease-in-out`}>
      <h3 className="font-semibold text-xl border-b border-green-200 pb-2 ml-[10px] mb-2 tracking-wide">
        Job Categories
      </h3>
      <ul className="space-y-4 text-base">
        {categories.map((item, i) => (
          <li
            key={i}
            onClick={() => {
              setSelectedCategory(item.label);
              setIsMobileMenuOpen(false);
            }}
            className={`flex items-center justify-between gap-3 mb-[12px] transition group cursor-pointer ${
              selectedCategory === item.label
                ? "text-green-700 font-semibold bg-green-100 px-3 py-2 rounded-lg"
                : "hover:text-green-700"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center shadow transition-transform duration-200 ${
                  selectedCategory === item.label
                    ? "bg-green-400 group-hover:scale-110"
                    : "bg-green-200 group-hover:scale-110"
                }`}
              >
                <span className="text-xl">{item.icon}</span>
              </div>
              <span
                className={`transition-all duration-200 ${
                  selectedCategory === item.label
                    ? "font-semibold"
                    : "group-hover:font-semibold"
                }`}
              >
                {item.label}
              </span>
            </div>
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {item.count}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
