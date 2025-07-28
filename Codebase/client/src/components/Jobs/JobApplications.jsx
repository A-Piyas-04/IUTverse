import React from "react";
import { useNavigate } from "react-router-dom";

export default function JobApplications({
  job,
  applicationCounts,
  showApplicants,
  applications,
  loadingApplications,
  handleShowApplicants,
}) {
  const navigate = useNavigate();

  return (
    <>
      {/* Application Counter and List */}
      {applicationCounts[job.id] > 0 && (
        <div className="px-4 ml-[10px] mb-2">
          <button
            onClick={() => handleShowApplicants(job.id)}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
            disabled={loadingApplications[`${job.id}-list`]}
          >
            <span>👥</span>
            <span>
              {loadingApplications[`${job.id}-list`]
                ? "Loading..."
                : `${applicationCounts[job.id]} ${
                    applicationCounts[job.id] === 1
                      ? "Application"
                      : "Applications"
                  }`}
            </span>
          </button>
        </div>
      )}

      {/* Applicants List */}
      {showApplicants[job.id] && applications[job.id] && (
        <div className="px-4 ml-[10px] mb-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <h5 className="font-semibold text-sm text-gray-700 mb-2">
              Applicants:
            </h5>
            <div className="space-y-2">
              {applications[job.id].map((application) => (
                <div
                  key={application.id}
                  className="flex items-center gap-3 p-2 bg-white rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() =>
                    navigate(`/profile/${application.applicant.id}`)
                  }
                >
                  <img
                    src={
                      application.applicant.profile?.profilePicture ||
                      "/profile_picture.jpg"
                    }
                    alt="Applicant"
                    className="w-8 h-8 rounded-full"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-900">
                      {application.applicant.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Applied on{" "}
                      {new Date(application.appliedAt).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
