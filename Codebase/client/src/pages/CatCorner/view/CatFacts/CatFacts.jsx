import React, { useEffect, useState } from "react";
import "./CatFacts.css";

export default function CatFacts() {
  const [fact, setFact] = useState("");
  const [facts, setFacts] = useState([]);

  // Helper to pick a new random fact (not the current one)
  const getRandomFact = (factsArr, currentFact) => {
    if (factsArr.length === 0) return "";
    if (factsArr.length === 1) return factsArr[0];
    let newFact;
    do {
      newFact = factsArr[Math.floor(Math.random() * factsArr.length)];
    } while (newFact === currentFact);
    return newFact;
  };

  useEffect(() => {
    fetch("/cat_facts.txt")
      .then((res) => res.text())
      .then((text) => {
        const loadedFacts = text.split(/\r?\n/).filter(Boolean);
        setFacts(loadedFacts);
        setFact(getRandomFact(loadedFacts, ""));
      });
  }, []);

  const handleNewFact = () => {
    setFact(getRandomFact(facts, fact));
  };

  return (
    <div className="cat-facts-outer">
      <div className="cat-paw cat-paw-1" />
      <div className="cat-paw cat-paw-2" />
      <div className="cat-fact-card animate-pop">
        <span role="img" aria-label="cat" className="cat-emoji">🐾</span>
        <div className="cat-fact-text">{fact}</div>
        <span role="img" aria-label="cat" className="cat-emoji">🐾</span>
      </div>
      <button className="cat-fact-btn" onClick={handleNewFact}>
        <span role="img" aria-label="paw">🐾</span> Did You Know? <span role="img" aria-label="paw">🐾</span>
      </button>
      <div className="cat-paw cat-paw-3" />
      <div className="cat-paw cat-paw-4" />
    </div>
  );
}
