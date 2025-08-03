import React from "react";
import CatProfileCard from "../../../../components/CatComponents/CatProfiles/CatProfileCard";
import "./CatProfiles.css";
import BatmanImg from "./Batman.jpg";
import JahangirImg from "./Jahangir.jpg";
import SylvieImg from "./Sylvie.jpg";
import JerryImg from "./jerry.jpg";
import RobinImg from "./robin.jpg";

const profiles = [
  {
    name: "Batman",
    desc: "Mysterious and vigilant, often seen patrolling the corridors at night.",
    img: BatmanImg,
  },
  {
    name: "Jahangir",
    desc: "Majestic , loves to bask in the sun near the admin building.",
    img: JahangirImg,
  },
  {
    name: "Sylvie",
    desc: "Playful and friendly, always chasing butterflies in the garden.",
    img: SylvieImg,
  },
  {
    name: "Jerry",
    desc: "Quick and clever, often spotted near the cafeteria looking for snacks.",
    img: JerryImg,
  },
  {
    name: "Robin",
    desc: "Adventurous spirit, enjoys exploring every corner of the campus.",
    img: RobinImg,
  },
];

export default function CatProfiles() {
  return (
    <div className="cat-profiles-page">
      <h2 className="cat-profiles-title">🐾 Campus Cat Profiles</h2>
      <div className="cat-profiles-grid">
        {profiles.map((cat) => (
          <CatProfileCard key={cat.name} name={cat.name} desc={cat.desc} img={cat.img} />
        ))}
      </div>
    </div>
  );
}
