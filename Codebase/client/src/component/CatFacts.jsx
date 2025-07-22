import React, { useState } from 'react';
const FACTS = [
  'Cats sleep 12–16 hours a day.',
  'A group of cats is called a “clowder.”',
  'Cats have over 20 muscles that control their ears.',
];
export default function CatFacts() {
  const [i, setI] = useState(0);
  return (
    <div>
      <p>{FACTS[i]}</p>
      <button onClick={() => setI((i + 1) % FACTS.length)}>Next Fact</button>
    </div>
  );
}
