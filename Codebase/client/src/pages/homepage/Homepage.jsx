import React from "react";
import { useNavigate, NavLink } from "react-router-dom";

export default function HomePage() {
  const navigate = useNavigate();
  const navItems = ["Home", "CatCorner", "Wholesome", "Marketplace"];

  const getPath = (label) => {
    switch (label) {
      case "Home": return "/home";
      case "CatCorner": return "/catcorner";
      default: return `/${label.toLowerCase()}`;
    }
  };

  return (
    <div className="w-screen h-screen min-h-screen min-w-full bg-white text-gray-900 font-sans overflow-hidden flex flex-col">
      {/* TOP NAVBAR */}
      <header className="flex items-center justify-between px-6 py-3 bg-white/90 backdrop-blur-lg shadow-2xl w-full border-b border-green-200 animate-fade-in-down">
        {/* Logo + Search */}
        <div className="flex items-center gap-4 w-1/3 min-w-[200px]">
          <img
            src="/logo.png"
            alt="Logo"
            className="h-10 w-10 rounded-full shadow-lg border-2 border-green-500 hover:scale-105 transition-transform duration-200"
          />
          <input
            type="text"
            placeholder="Search IUTVerse..."
            className="w-100 px-4 py-2 rounded-full bg-gray-100 text-sm text-gray-800 placeholder-gray-400 border border-green-200 focus:outline-none focus:ring-2 focus:ring-green-400 transition shadow-inner hover:shadow-green-200/30"
          />
        </div>

        {/* Middle nav with routing */}
        <nav className="flex gap-8 w-1/3 justify-between text-base font-medium text-green-700">
          {navItems.map((label, i) => (
            <NavLink
              key={i}
              to={getPath(label)}
              className={({ isActive }) =>
                `relative px-3 py-1 rounded-lg transition-all duration-200 ${isActive
                  ? "bg-green-100 text-green-900"
                  : "hover:bg-green-100 hover:text-green-900"
                } group`
              }
            >
              <span className="group-hover:scale-105 group-hover:font-bold transition-transform duration-200">
                {label}
              </span>
              <span className="absolute left-1/2 -bottom-1 w-0 h-0.5 bg-green-400 rounded-full group-hover:w-3/4 transition-all duration-300 group-hover:h-1"></span>
            </NavLink>
          ))}
        </nav>

        {/* Right: Profile */}
        <div className="flex items-center gap-4 w-1/3 justify-end min-w-[200px]">
          <img
            src="/profile.jpg"
            alt="Profile"
            className="h-10 w-10 rounded-full shadow border-2 border-green-500 hover:scale-105 transition-transform duration-200"
          />
          <button
            className="text-sm px-4 py-1.5 rounded-full bg-gradient-to-r from-green-500 to-green-400 hover:from-green-400 hover:to-green-300 hover:scale-105 active:scale-95 transition-all duration-200 text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-green-400"
            onClick={() => navigate("/login")}
          >
            Logout
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex w-full h-full min-h-0 overflow-hidden justify-between px-4 animate-fade-in-up bg-white">
        {/* LEFT SIDEBAR */}
        <aside className="flex flex-col w-[320px] max-w-xs p-4 text-gray-800 space-y-4 backdrop-blur-md bg-green-50/60 rounded-2xl shadow-xl mt-6 animate-fade-in-left ">
          <h3 className="font-semibold text-xl border-b border-green-200 pb-2 mb-2 tracking-wide">
            Menu
          </h3>
          <ul className="space-y-4 text-base">
            {[
              {
                label: "Nuren Fahmid",
                icon: (
                  <div className="h-10 w-10 rounded-full bg-gray-300 shadow-md" />
                ),
              },
              { label: "Friends", icon: "👥", bg: "bg-blue-200" },
              { label: "Saved", icon: "🔖", bg: "bg-pink-200" },
              { label: "Memories", icon: "⏰", bg: "bg-blue-100" },
              { label: "Groups", icon: "🧑‍🤝‍🧑", bg: "bg-blue-300" },
              { label: "Video", icon: "🎥", bg: "bg-blue-200" },
              { label: "Marketplace", icon: "🏪", bg: "bg-blue-100" },
              { label: "Feeds", icon: "📰", bg: "bg-blue-200" },
            ].map((item, i) => (
              <li
                key={i}
                className="flex items-center gap-3 hover:text-green-700 transition group cursor-pointer"
              >
                {typeof item.icon === "string" ? (
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center ${item.bg} shadow group-hover:scale-110 transition-transform duration-200`}
                  >
                    <span className="text-xl">{item.icon}</span>
                  </div>
                ) : (
                  item.icon
                )}
                <span className="group-hover:font-semibold transition-all duration-200">
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </aside>

        {/* CENTER FEED */}
        <section className="flex-1 flex flex-col items-center px-2 py-6 overflow-y-auto min-h-0 max-w-[600px] mx-auto space-y-8">
          {/* Post box */}
          <div className="w-full bg-green-50/80 backdrop-blur-md rounded-2xl shadow-2xl border border-green-100 p-4">
            <div className="flex items-center gap-3 mb-3">
              <img
                src="/profile.jpg"
                alt="Profile"
                className="h-10 w-10 rounded-full shadow-md border-2 border-green-400 hover:scale-105 transition-transform duration-200"
              />
              <input
                type="text"
                placeholder="What's on your mind?"
                className="w-full px-4 py-2 rounded-full bg-white text-gray-800 placeholder-gray-400 border border-green-100 focus:outline-none focus:ring-2 focus:ring-green-300 transition shadow-inner hover:shadow-green-200/30"
              />
            </div>
            <div className="flex gap-6 text-sm font-semibold justify-around">
              <button className="flex items-center gap-1 text-red-500 hover:underline active:scale-95 transition-transform duration-200">
                📹 Live video
              </button>
              <button className="flex items-center gap-1 text-green-600 hover:underline active:scale-95 transition-transform duration-200">
                🖼️ Photo/video
              </button>
              <button className="flex items-center gap-1 text-yellow-500 hover:underline active:scale-95 transition-transform duration-200">
                😊 Feeling/activity
              </button>
            </div>
          </div>

          {/* Posts */}
          <div className="w-full space-y-8">
            {[
              {
                title: "IUTVerse",
                time: "just now",
                text: "Welcome to the beta version of the IUT-exclusive social feed. Stay wholesome!",
              },
              {
                title: "Cat of the Week 🐾",
                time: "1h ago",
                text: "Spotty seen chilling near Fountain Zone. 🐱",
              },
              {
                title: "Marketplace: Casio FX-991EX",
                time: "2h ago",
                text: "Slightly used, great condition. Batch 20. DM to buy.",
              },
              {
                title: "Lost & Found 📦",
                time: "3h ago",
                text: "Lost my water bottle near the FC Footpath. It's green with a Pokémon sticker.",
              },
              {
                title: "IUT Rover Team",
                time: "5h ago",
                text: "We’re recruiting! If you’re passionate about robotics and space, apply now!",
              },
              {
                title: "Wholesome Wall 💚",
                time: "6h ago",
                text: "Shoutout to the campus cleaners — thank you for keeping our home clean!",
              },
              {
                title: "Event Update 🎤",
                time: "8h ago",
                text: "Drama Club’s open mic night happening this Thursday in the OAT. Everyone’s welcome!",
              },
              {
                title: "Academic Help 🧠",
                time: "9h ago",
                text: "Can anyone help me understand Normalization in DBMS? Finals coming 😭",
              },
              {
                title: "Confession 🤫",
                time: "10h ago",
                text: "Sometimes I sit near the lake just to breathe. IUT has its quiet magic.",
              },
              {
                title: "Cats of IUT 😺",
                time: "12h ago",
                text: "Three new kittens near El Dorado! Please don’t scare them, they’re very shy.",
              },
              {
                title: "Marketplace: Lab Coat 🧪",
                time: "13h ago",
                text: "Selling a clean white lab coat (size M). Used for only one semester.",
              },
              {
                title: "Good Deed 🌱",
                time: "15h ago",
                text: "Left some extra food in front of Hall 1 tree. Feel free to take if hungry.",
              },
              {
                title: "Study Pod: Calculus 2 📚",
                time: "16h ago",
                text: "Revision session tonight at 9PM. Join the pod and bring your doubts!",
              },
              {
                title: "FiqhBot 🤖",
                time: "17h ago",
                text: "Q: Can I pray wearing socks? A: Yes, but ensure they’re clean and cover ankles.",
              },
              {
                title: "Marketplace: USB Drive",
                time: "19h ago",
                text: "32GB USB for sale. Used, but works fine. Asking 200 taka.",
              },
              {
                title: "Prayer Time Reminder 🕌",
                time: "20h ago",
                text: "Asr begins in 15 minutes. Make wudu and pray on time!",
              },
              {
                title: "Thank You, Seniors 🙏",
                time: "21h ago",
                text: "To all the 4th years who helped juniors with notes and guidance, thank you!",
              },
              {
                title: "Wholesome Post 🌸",
                time: "22h ago",
                text: "I saw someone leave chocolate in the library with a sticky note: “You got this!” ❤️",
              },
              {
                title: "CSE Dept Meme 😂",
                time: "Yesterday",
                text: "Every time we touch the server: *'Why you do this?'* – CSE 21 meme gang",
              },
              {
                title: "Found Item 🧢",
                time: "Yesterday",
                text: "Found a black cap near the prayer space in FC. DM with details to claim.",
              },
            ].map((post, i) => (
              <div
                key={i}
                className="w-full bg-white/90 backdrop-blur-lg border border-gray-200 rounded-3xl p-5 shadow-md hover:shadow-lg transition-shadow duration-300"
              >
                {/* User Info */}
                <div className="flex items-start gap-3 mb-3">
                  <img
                    src="/profile.jpg"
                    alt="User"
                    className="h-10 w-10 rounded-full border-2 border-green-400 shadow-md"
                  />
                  <div>
                    <div className="text-sm font-semibold text-gray-800">
                      {post.title}
                    </div>
                    <div className="text-[11px] text-gray-500">{post.time}</div>
                  </div>
                </div>

                {/* Post Text */}
                <div className="text-gray-800 text-[15px] leading-relaxed">
                  {post.text}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* RIGHT SIDEBAR */}
        <aside className="flex flex-col w-[320px] max-w-xs p-4 backdrop-blur-md bg-green-50/60 rounded-2xl shadow-xl mt-6 animate-fade-in-right text-gray-800">
          <h3 className="font-semibold text-xl border-b border-green-200 pb-2 mb-4 tracking-wide">
            Contacts
          </h3>
          <ul className="space-y-4 text-base">
            {[
              "Abu Zafar Sheikh Mohammad Golam Musabbereen Chishti",
              "Irfan Shafee",
              "Samiur Rahman Nafiz",
              "Faiyaz Awsaf",
              "Mashrur Faiyaz",
            ].map((name, i) => (
              <li
                key={i}
                className="flex items-center gap-3 hover:text-green-700 transition group cursor-pointer"
              >
                <img
                  src="/profile.jpg"
                  alt="User"
                  className="h-8 w-8 rounded-full bg-gray-300 border-2 border-green-400 shadow group-hover:scale-110 transition-transform duration-200"
                />
                <span className="group-hover:font-semibold transition-all duration-200">
                  {name}
                </span>
              </li>
            ))}
          </ul>
        </aside>
      </main>
      {/* Animations */}
      <style>{`
        @keyframes fade-in-down {
          0% { opacity: 0; transform: translateY(-30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-left {
          0% { opacity: 0; transform: translateX(-30px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes fade-in-right {
          0% { opacity: 0; transform: translateX(30px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        .animate-fade-in-down { animation: fade-in-down 0.7s cubic-bezier(.4,0,.2,1) both; }
        .animate-fade-in-up { animation: fade-in-up 0.7s cubic-bezier(.4,0,.2,1) both; }
        .animate-fade-in-left { animation: fade-in-left 0.7s cubic-bezier(.4,0,.2,1) both; }
        .animate-fade-in-right { animation: fade-in-right 0.7s cubic-bezier(.4,0,.2,1) both; }
      `}</style>
    </div>
  );
}
