import React, { useState } from "react";
import Navbar from "../../components/Navbar/Navbar.jsx";
import "./JobsPage.css";

export default function JobsPage() {
  const [showJobForm, setShowJobForm] = useState(false);
  const [jobs, setJobs] = useState([
    {
      id: 1,
      title: "Need a graphic designer for club event poster",
      type: "Freelance",
      description:
        "Design a digital poster for our upcoming tech seminar. Should be catchy and clean.",
      requirements: ["Knows Canva or Illustrator", "Delivers within 2 days"],
      compensation: "BDT 500",
      deadline: "July 30, 2025",
      postedBy: {
        name: "Tanvir Hasan",
        profileImg: "/profile_picture.jpg",
      },
      date: "July 25, 2025",
    },
    {
      id: 2,
      title: "Web Development Intern",
      type: "Internship",
      description:
        "Looking for a passionate web developer intern to join our startup. You'll work on real projects and learn modern technologies.",
      requirements: [
        "Basic knowledge of HTML, CSS, JavaScript",
        "Currently enrolled in CSE or related field",
        "Available 20 hours per week",
      ],
      compensation: "BDT 8000/month",
      deadline: "August 15, 2025",
      postedBy: {
        name: "Ahnaf Shahriar Pias",
        profileImg: "/profile_picture.jpg",
      },
      date: "July 20, 2025",
    },
    {
      id: 3,
      title: "Volunteer for Campus Cleanup",
      type: "Volunteer",
      description:
        "Join our campus cleanup initiative this weekend. Help make IUT a cleaner place for everyone.",
      requirements: [
        "Available on Saturday morning",
        "Bring your own gloves",
        "Positive attitude",
      ],
      compensation: "Free lunch provided",
      deadline: "July 28, 2025",
      postedBy: {
        name: "Samiur Rahman Nafiz",
        profileImg: "/profile_picture.jpg",
      },
      date: "July 18, 2025",
    },
  ]);

  const [newJob, setNewJob] = useState({
    title: "",
    type: "Freelance",
    description: "",
    requirements: "",
    compensation: "",
    deadline: "",
  });

  const getTypeColor = (type) => {
    switch (type) {
      case "Internship":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Freelance":
        return "bg-green-100 text-green-800 border-green-200";
      case "Part-time":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "Volunteer":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleSubmitJob = (e) => {
    e.preventDefault();
    const jobToAdd = {
      id: Date.now(),
      ...newJob,
      requirements: newJob.requirements.split("\n").filter((req) => req.trim()),
      postedBy: {
        name: "You (Current User)",
        profileImg: "/profile_picture.jpg",
      },
      date: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    };
    setJobs([jobToAdd, ...jobs]);
    setNewJob({
      title: "",
      type: "Freelance",
      description: "",
      requirements: "",
      compensation: "",
      deadline: "",
    });
    setShowJobForm(false);
  };

  const clearForm = () => {
    setNewJob({
      title: "",
      type: "Freelance",
      description: "",
      requirements: "",
      compensation: "",
      deadline: "",
    });
  };

  return (
    <div className="w-screen h-screen min-h-screen min-w-full bg-white text-gray-900 font-sans overflow-hidden flex flex-col">
      {/* TOP NAVBAR */}
      <Navbar />

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex w-full h-full min-h-0 overflow-hidden justify-between px-4 animate-fade-in-up bg-white mt-[80px]">
        {/* LEFT SIDEBAR */}
        <aside className="flex flex-col w-[320px] max-w-xs p-4 text-gray-800 space-y-4 backdrop-blur-md bg-green-50/60 rounded-2xl shadow-xl mt-6 animate-fade-in-left">
          <h3 className="font-semibold text-xl border-b border-green-200 pb-2 ml-[10px] mb-2 tracking-wide">
            Job Categories
          </h3>
          <ul className="space-y-4 text-base">
            {[
              { label: "All Jobs", icon: "📋", count: jobs.length },
              {
                label: "Internships",
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
            ].map((item, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 mb-[12px] hover:text-green-700 transition group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center bg-green-200 shadow group-hover:scale-110 transition-transform duration-200">
                    <span className="text-xl">{item.icon}</span>
                  </div>
                  <span className="group-hover:font-semibold transition-all duration-200">
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

        {/* CENTER FEED */}
        <section className="flex-1 flex flex-col items-center px-2 py-6 overflow-y-auto min-h-0 max-w-[700px] mx-auto space-y-8">
          {/* Page Header */}
          <div className="w-full bg-[#f9fafb] backdrop-blur-md rounded-[12px] mb-[12px] mt-[8px] shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                📢 Job Board
              </h1>
              <button
                onClick={() => setShowJobForm(!showJobForm)}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-full font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                {showJobForm ? "Cancel" : "Post a Job"}
              </button>
            </div>
            <p className="text-gray-600">
              Find opportunities or post job listings for the IUT community
            </p>
          </div>

          {/* Job Post Form */}
          {showJobForm && (
            <div className="w-full bg-[#f9fafb] backdrop-blur-md rounded-[12px] mb-[12px] shadow-2xl p-6 animate-fade-in-up">
              <h3 className="text-xl font-semibold mb-4 text-gray-900">
                Post a New Job
              </h3>
              <form onSubmit={handleSubmitJob} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newJob.title}
                    onChange={(e) =>
                      setNewJob({ ...newJob, title: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent"
                    placeholder="Enter job title..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job Type *
                  </label>
                  <select
                    value={newJob.type}
                    onChange={(e) =>
                      setNewJob({ ...newJob, type: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent"
                  >
                    <option value="Internship">Internship</option>
                    <option value="Freelance">Freelance</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Volunteer">Volunteer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    required
                    value={newJob.description}
                    onChange={(e) =>
                      setNewJob({ ...newJob, description: e.target.value })
                    }
                    rows="4"
                    className="w-full px-4 py-2 rounded-lg bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent"
                    placeholder="Describe the job responsibilities and details..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Requirements
                  </label>
                  <textarea
                    value={newJob.requirements}
                    onChange={(e) =>
                      setNewJob({ ...newJob, requirements: e.target.value })
                    }
                    rows="3"
                    className="w-full px-4 py-2 rounded-lg bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent"
                    placeholder="Enter requirements (one per line)..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Compensation
                    </label>
                    <input
                      type="text"
                      value={newJob.compensation}
                      onChange={(e) =>
                        setNewJob({ ...newJob, compensation: e.target.value })
                      }
                      className="w-full px-4 py-2 rounded-lg bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent"
                      placeholder="e.g., BDT 5000/month"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Application Deadline
                    </label>
                    <input
                      type="date"
                      value={newJob.deadline}
                      onChange={(e) =>
                        setNewJob({ ...newJob, deadline: e.target.value })
                      }
                      className="w-full px-4 py-2 rounded-lg bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    Post Job
                  </button>
                  <button
                    type="button"
                    onClick={() => clearForm()}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-3 rounded-lg font-medium transition-all duration-200"
                  >
                    Clear
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Job Posts */}
          {jobs.map((job) => (
            <div
              key={job.id}
              className="bg-[#f9fafb] rounded-[25px] mt-4 shadow-sm mb-[20px] min-w-full"
            >
              {/* Post Header */}
              <div className="flex items-start gap-3 p-4 pb-3">
                <img
                  src={job.postedBy.profileImg}
                  alt="Profile"
                  className="w-[35px] h-[35px] mr-[12px] rounded-full mt-[30px]"
                />
                <div className="flex-1">
                  <h4 className="font-semibold text-[15px] text-gray-900 mt-[30px]">
                    {job.postedBy.name}
                  </h4>
                  <p className="text-[13px] text-gray-500 flex items-center gap-1 mt-[-20px]">
                    {job.date} • <span className="text-blue-500">🌐</span>
                  </p>
                </div>
                <button className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full">
                  <span className="text-xl">⋯</span>
                </button>
              </div>
              {/* Post Content */}
              <div className="px-4 pb-3">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h3 className="text-lg font-bold text-gray-900">
                    {job.title}
                  </h3>
                  <span
                    className={`px-3 py-1 mr-[5px] rounded-[15px] text-xs font-medium border ${getTypeColor(
                      job.type
                    )}`}
                  >
                    {job.type}
                  </span>
                </div>

                <div className="text-[15px] mb-[12px] text-gray-900 leading-relaxed whitespace-pre-line">
                  {job.description}
                </div>

                {job.requirements && job.requirements.length > 0 && (
                  <div className="mb-3">
                    <h4 className="font-semibold text-sm text-gray-700 mb-2">
                      Requirements:
                    </h4>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                      {job.requirements.map((req, index) => (
                        <li key={index}>{req}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center gap-4 text-sm text-gray-500 mt-3">
                  {job.compensation && (
                    <span className="flex items-center gap-1">
                      💰 {job.compensation}
                    </span>
                  )}
                  {job.deadline && (
                    <span className="flex items-center gap-1">
                      📅 Deadline: {job.deadline}
                    </span>
                  )}
                </div>
              </div>
              {/* Action Buttons */}
              <div className="flex justify-between py-1 mt-[12px] mb-[12px]">
                <button className="flex items-center justify-center gap-2 py-2 px-4 ml-[10px] mr-[35px] hover:bg-gray-100 rounded transition-colors text-gray-600 text-[15px] font-medium flex-1">
                  <span>💬</span>
                  <span>Comment</span>
                </button>
                <button className="flex items-center justify-center gap-2 py-2 px-4 mr-[10px] hover:bg-gray-100 rounded transition-colors text-gray-600 text-[15px] font-medium flex-1">
                  <span>📩</span>
                  <span>Apply</span>
                </button>
              </div>
              {/* Comment Input */}
              <div className="flex items-center gap-2 p-4 pt-2 ">
                <img
                  src="/profile_picture.jpg"
                  alt="Me"
                  className="w-[30px] h-[30px] mr-[12px] rounded-full"
                />
                <input
                  type="text"
                  placeholder="Write a comment..."
                  className="flex-1 px-3 py-2 rounded-full bg-gray-100 text-[13px] outline-none"
                />
              </div>
            </div>
          ))}
        </section>

        {/* RIGHT SIDEBAR */}
        <aside className="flex flex-col w-[320px] max-w-xs p-4 backdrop-blur-md bg-green-50/60 rounded-2xl shadow-xl mt-6 animate-fade-in-right text-gray-800">
          <h3 className="font-semibold text-xl border-b border-green-200 pb-2 mb-4 tracking-wide">
            Recent Posters
          </h3>
          <ul className="space-y-4 text-base mb-[15px]">
            {[
              "Tanvir Hasan ",
              "Ahnaf Shahriar Pias ",
              "Samiur Rahman Nafiz ",
            ].map((name, i) => (
              <li
                key={i}
                className="flex items-center gap-3 hover:text-green-700 mb-[5px] transition group cursor-pointer"
              >
                <img
                  src="/profile_picture.jpg"
                  alt="User"
                  className="h-[30px] w-[30px] mr-[8px] rounded-full bg-gray-300 border-2 border-green-400 shadow group-hover:scale-110 transition-transform duration-200"
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
