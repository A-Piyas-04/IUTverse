import React from "react";
import "./CatProfileCard.css";

export default function CatProfileCard({ name, desc, img }) {
  return (
    <div className="cat-profile-card">
      <div className="cat-profile-img-wrap">
        <img src={img} alt={name} className="cat-profile-img" />
      </div>
      <div className="cat-profile-info">
        <h3 className="cat-profile-name">{name}</h3>
        <p className="cat-profile-desc">{desc}</p>
      </div>
    </div>
  );
} 