import React from "react";

export default function JobForm({
  showJobForm,
  setShowJobForm,
  newJob,
  setNewJob,
  handleSubmitJob,
  clearForm,
}) {
  if (!showJobForm) return null;

  return (
    <div className="w-full bg-[#f9fafb] backdrop-blur-md rounded-[12px] mb-[12px] shadow-2xl p-6 animate-fade-in-up">
      <h3 className="text-xl font-semibold ml-[15px] mb-4 text-gray-900">
        Post a New Job
      </h3>
      <form onSubmit={handleSubmitJob} className="space-y-4 p-[15px]">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Job Title *
          </label>
          <input
            type="text"
            required
            value={newJob.title}
            onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
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
            onChange={(e) => setNewJob({ ...newJob, type: e.target.value })}
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
  );
}
