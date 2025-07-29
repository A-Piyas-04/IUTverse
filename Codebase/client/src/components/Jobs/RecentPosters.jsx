import React from "react";
import { useNavigate } from "react-router-dom";

export default function RecentPosters({ jobs }) {
  const navigate = useNavigate();

  return (
    <aside className="flex flex-col w-[320px] max-w-xs p-4 backdrop-blur-md bg-green-50/60 rounded-2xl shadow-xl mt-6 animate-fade-in-right text-gray-800">
      <h3 className="font-semibold text-xl border-b border-green-200 pb-2 mb-4 tracking-wide">
        Recent Posters
      </h3>
      <ul className="space-y-4 text-base mb-[15px]">
        {jobs.slice(0, 3).map((job, i) => (
          <li
            key={i}
            className="flex items-center gap-3 hover:text-green-700 mb-[5px] transition group cursor-pointer"
            onClick={() =>
              job.postedBy?.id && navigate(`/profile/${job.postedBy.id}`)
            }
          >
            <img
              src={
                job.postedBy?.profile?.profilePicture ||
                job.postedBy?.profileImg ||
                "/profile_picture.jpg"
              }
              alt="User"
              className="h-[30px] w-[30px] mr-[8px] rounded-full bg-gray-300 border-2 border-green-400 shadow group-hover:scale-110 transition-transform duration-200"
            />
            <span className="group-hover:font-semibold transition-all duration-200">
              {job.postedBy?.name || "Unknown"}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
