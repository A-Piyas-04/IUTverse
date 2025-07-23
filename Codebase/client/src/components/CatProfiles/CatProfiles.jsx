import React from "react";

const profiles = [
  {
    name: "Tommy",
    desc: "Loves sleeping under sun near CDS.",
    img: "https://placekitten.com/220/220",
  },
  {
    name: "Luna",
    desc: "Seen near female dorm, very friendly.",
    img: "https://placekitten.com/221/221",
  },
];

export default function CatProfiles() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {profiles.map((cat) => (
        <div
          key={cat.name}
          className="bg-white border border-green-200 rounded-lg p-4 flex items-center gap-4"
        >
          <img
            src={cat.img}
            alt={cat.name}
            className="h-20 w-20 rounded-full object-cover border-2 border-green-300"
          />
          <div>
            <h3 className="text-green-800 font-semibold">{cat.name}</h3>
            <p className="text-sm text-gray-600">{cat.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
