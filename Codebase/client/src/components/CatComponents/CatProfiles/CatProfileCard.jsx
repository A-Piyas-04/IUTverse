import React from "react";
import "./CatProfileCard.css";

export default function CatProfileCard({ name, desc, img }) {
  return (
    <div className="cat-card">
      <div className="cat-img-wrap">
        <img src={img} alt={name} className="cat-img" />
      </div>
      <div className="cat-info">
        <h3 className="cat-name">{name}</h3>
        <p className="cat-desc">{desc}</p>
      </div>
    </div>
  );
}
