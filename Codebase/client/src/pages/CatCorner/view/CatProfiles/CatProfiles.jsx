import React from "react";
import CatProfileCard from "../../../../components/CatComponents/CatProfiles/CatProfileCard";
import "./CatProfiles.css";

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
  {
    name: "Oreo",
    desc: "Frequently hangs around cafeteria.",
    img: "https://placekitten.com/222/222",
  },
  {
    name: "Mimi",
    desc: "Softest fur, always near admin block.",
    img: "https://placekitten.com/223/223",
  },
  {
    name: "Simba",
    desc: "King of the parking lot, loves head scratches.",
    img: "https://placekitten.com/224/224",
  },
  {
    name: "Shadow",
    desc: "Mysterious and only comes out at dusk.",
    img: "https://placekitten.com/225/225",
  },
  {
    name: "Pumpkin",
    desc: "Orange tabby, loves to chase leaves.",
    img: "https://placekitten.com/226/226",
  },
  {
    name: "Snowball",
    desc: "White fur, often seen near the library steps.",
    img: "https://placekitten.com/227/227",
  },
  {
    name: "Cleo",
    desc: "Elegant and calm, favorite spot is the garden bench.",
    img: "https://placekitten.com/228/228",
  },
  {
    name: "Tiger",
    desc: "Striped and energetic, always playing with students.",
    img: "https://placekitten.com/229/229",
  },
  {
    name: "Mocha",
    desc: "Brown and white, loves to nap on warm cars.",
    img: "https://placekitten.com/230/230",
  },
  {
    name: "Socks",
    desc: "Black cat with white paws, very curious.",
    img: "https://placekitten.com/231/231",
  },
  {
    name: "Whiskers",
    desc: "Oldest campus cat, wise and gentle.",
    img: "https://placekitten.com/232/232",
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
