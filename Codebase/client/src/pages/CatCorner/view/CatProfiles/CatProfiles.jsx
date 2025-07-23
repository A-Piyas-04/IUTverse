import React from "react";
import CatProfileCard from "../../../../components/CatComponents/CatProfiles/CatProfileCard";

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
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '2.5rem 0' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <h2 style={{ fontSize: '2.1rem', fontWeight: 700, color: '#15803d', textAlign: 'center', marginBottom: 32, letterSpacing: '0.01em' }}>
          Campus Cat Profiles
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2.2rem', justifyContent: 'center' }}>
          {profiles.map((cat) => (
            <CatProfileCard key={cat.name} name={cat.name} desc={cat.desc} img={cat.img} />
          ))}
        </div>
      </div>
    </div>
  );
}
