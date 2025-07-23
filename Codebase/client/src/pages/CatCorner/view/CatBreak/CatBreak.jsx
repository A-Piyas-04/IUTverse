import React from "react";
import "./CatBreak.css";

const videos = [
  {
    id: "J---aiyznGQ",
    title: "Funny Cats Compilation",
  },
  {
    id: "5dsGWM5XGdg",
    title: "Cat Relaxing Music 🐱",
  },
  {
    id: "z3U0udLH974",
    title: "Cute Kittens Doing Funny Things",
  },
];

export default function CatBreak() {
  return (
    <section className="cat-break-container">
      <h2 className="cat-break-heading">Take a Cat Break 🐾</h2>
      <p className="cat-break-subtext">
        Sit back, relax, and enjoy some cat therapy. 😸
      </p>

      <div className="cat-break-grid">
        {videos.map((video, index) => (
          <div key={index} className="cat-break-video-wrapper">
            <iframe
              className="cat-break-video"
              src={`https://www.youtube.com/embed/${video.id}`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
            <p className="video-title">{video.title}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
