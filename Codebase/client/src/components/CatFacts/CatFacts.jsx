import React from "react";

const facts = [
  "Cats sleep 70% of their lives.",
  "A group of cats is called a clowder.",
  "They can make over 100 vocal sounds.",
];

export default function CatFacts() {
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-bold text-green-700">Random Cat Facts 🐱</h2>
      <ul className="list-disc pl-6 text-gray-700">
        {facts.map((fact, i) => (
          <li key={i}>{fact}</li>
        ))}
      </ul>
    </div>
  );
}
