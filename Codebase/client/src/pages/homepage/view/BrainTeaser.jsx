import React, { useState, useEffect } from 'react';

const BrainTeaser = ({ isOpen, onClose }) => {
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [questions, setQuestions] = useState([]);

  // Parse the brain teaser data
  useEffect(() => {
    const brainTeaserData = `Q: What has keys but can't open locks?
A: A piano

Q: The more you take, the more you leave behind. What am I?
A: Footsteps

Q: What comes once in a minute, twice in a moment, but never in a thousand years?
A: The letter M

Q: I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?
A: An echo

Q: What can travel around the world while staying in the same corner?
A: A stamp

Q: I'm tall when I'm young, and I'm short when I'm old. What am I?
A: A candle

Q: What gets wetter the more it dries?
A: A towel

Q: You see me once in June, twice in November, but not at all in May. What am I?
A: The letter E

Q: What has hands but can't clap?
A: A clock

Q: What can be broken but never held?
A: A promise

Q: A man dies of old age on his 25th birthday. How?
A: He was born on February 29 (leap year)

Q: What begins with T, ends with T, and has T in it?
A: A teapot

Q: What word is spelled incorrectly in every dictionary?
A: Incorrectly

Q: What goes up but never comes down?
A: Your age

Q: What invention lets you look right through a wall?
A: A window

Q: If you drop me I'm sure to crack, but give me a smile and I'll always smile back. What am I?
A: A mirror

Q: You're running in a race and pass the person in second place. What place are you in now?
A: Second

Q: What can fill a room but takes up no space?
A: Light

Q: If two's company and three's a crowd, what are four and five?
A: Nine

Q: A cowboy rode into town on Friday. He stayed three days and rode out on Friday. How?
A: His horse's name is Friday

Q: What has a head, a tail, but no body?
A: A coin

Q: What gets bigger the more you take away from it?
A: A hole

Q: How many months have 28 days?
A: All 12

Q: What can you hold without ever touching it?
A: A conversation

Q: Which is heavier: a kilogram of feathers or a kilogram of bricks?
A: Neither, they weigh the same

Q: What has to be broken before you can use it?
A: An egg

Q: What begins and has no end, and is the key to everything?
A: Knowledge

Q: If you have one, you want to share it. But once you share it, you don't have it. What is it?
A: A secret

Q: What has one eye but cannot see?
A: A needle

Q: What kind of room has no doors or windows?
A: A mushroom

Q: What's full of holes but still holds water?
A: A sponge

Q: What comes down but never goes up?
A: Rain

Q: If there are 3 apples and you take away 2, how many do you have?
A: 2

Q: What five-letter word becomes shorter when you add two letters to it?
A: Short

Q: What can you catch but not throw?
A: A cold

Q: I have branches, but no fruit, trunk or leaves. What am I?
A: A bank

Q: What is always in front of you but can't be seen?
A: The future

Q: What begins with an E but only contains one letter?
A: An envelope

Q: A plane crashes on the border of the US and Canada. Where do they bury the survivors?
A: Nowhere, survivors are alive

Q: What is black when it's clean and white when it's dirty?
A: A chalkboard

Q: What comes at the end of everything?
A: The letter G

Q: Forward I'm heavy, but backward I'm not. What am I?
A: The word "ton"

Q: What's always moving but never actually moves?
A: Time

Q: A girl has as many brothers as sisters, but each brother has only half as many brothers as sisters. How many siblings are there?
A: Four sisters and three brothers

Q: What is so fragile that saying its name breaks it?
A: Silence

Q: What do you throw out when you want to use it, but take in when you don't?
A: An anchor

Q: If I have it, I don't share it. If I share it, I don't have it. What is it?
A: A secret

Q: You see a boat filled with people, but there isn't a single person on board. How?
A: All the people are married

Q: Which is faster, hot or cold?
A: Hot—because you can catch cold

Q: A man shaves several times a day but still has a beard. Who is he?
A: A barber

Q: What kind of band never plays music?
A: A rubber band

Q: What comes once in a year, twice in a week, and never in a day?
A: The letter E

Q: What can't be used until it's broken?
A: An egg

Q: What has a neck but no head?
A: A bottle

Q: What's orange and sounds like a parrot?
A: A carrot

Q: I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?
A: A map

Q: The more of me you take, the more you leave behind. What am I?
A: Footsteps

Q: What kind of coat is always wet when you put it on?
A: A coat of paint

Q: Where does today come before yesterday?
A: In a dictionary

Q: What is always coming, but never arrives?
A: Tomorrow

Q: What has four wheels and flies?
A: A garbage truck

Q: What can you never eat for breakfast?
A: Lunch and dinner

Q: What has many teeth, but cannot bite?
A: A comb

Q: How do you make the number one disappear?
A: Add a "G" and it's gone

Q: What word has three consecutive double letters?
A: Bookkeeper

Q: What's always in front of you but invisible?
A: The future

Q: If there are four apples and you take away three, how many do you have?
A: Three

Q: What goes up and down but doesn't move?
A: A staircase

Q: What has one head, one foot, and four legs?
A: A bed

Q: If you have me, you want to share me. If you share me, you haven't got me. What am I?
A: A secret

Q: What begins with P, ends with E, and has thousands of letters?
A: The post office

Q: What can you break, even if you never pick it up or touch it?
A: A promise

Q: Where can you find cities, towns, shops, and streets but no people?
A: A map

Q: What has four legs in the morning, two in the afternoon, and three at night?
A: A human (crawl, walk, cane)

Q: What has many keys but no locks?
A: A piano

Q: What is easy to lift but hard to throw?
A: A feather

Q: What can run but never walks?
A: A river

Q: What starts with a P, ends with an E, and has a million letters in it?
A: Post office

Q: What comes before thunder?
A: Lightning

Q: If a red house is made of red bricks and a blue house is made of blue bricks, what is a greenhouse made of?
A: Glass

Q: What flies without wings?
A: Time

Q: What goes up but never comes down?
A: Age

Q: What comes in a minute, twice in a moment, but never in a thousand years?
A: The letter M

Q: What can't talk but will reply when spoken to?
A: An echo

Q: What has many rings but no fingers?
A: A telephone

Q: What can be cracked, made, told, and played?
A: A joke

Q: What has a bottom at the top?
A: Your legs

Q: What can run, but never walks; has a bed, but never sleeps; has a mouth, but never talks?
A: A river

Q: What is made of water but if you put it into water it dies?
A: An ice cube

Q: What kind of tree can you carry in your hand?
A: A palm

Q: If you throw a blue stone into the Red Sea, what will it become?
A: Wet

Q: What is so light even the strongest person can't hold it for long?
A: Breath

Q: What has four eyes but can't see?
A: Mississippi

Q: What has an end but no beginning, a home but no family, and is a place but not a location?
A: A grave

Q: What has words but never speaks?
A: A book

Q: What goes through cities and fields but never moves?
A: A road

Q: What's long and hard and full of... knowledge?
A: A textbook

Q: What building has the most stories?
A: The library

Q: What room can no one enter?
A: A mushroom

Q: The more you take from me, the bigger I get. What am I?
A: A hole`;

    // Parse the data into question-answer pairs
    const pairs = brainTeaserData.split('\n\n').map(pair => {
      const lines = pair.trim().split('\n');
      if (lines.length >= 2) {
        const question = lines[0].replace('Q: ', '');
        const answer = lines[1].replace('A: ', '');
        return { question, answer };
      }
      return null;
    }).filter(Boolean);

    setQuestions(pairs);
  }, []);

  // Generate a new random question
  const generateNewQuestion = () => {
    if (questions.length > 0) {
      const randomIndex = Math.floor(Math.random() * questions.length);
      const selectedPair = questions[randomIndex];
      setCurrentQuestion(selectedPair.question);
      setCurrentAnswer(selectedPair.answer);
      setShowAnswer(false);
    }
  };

  // Generate initial question when modal opens
  useEffect(() => {
    if (isOpen && questions.length > 0) {
      generateNewQuestion();
    }
  }, [isOpen, questions]);

  const handleRevealAnswer = () => {
    setShowAnswer(true);
  };

  const handleNewQuestion = () => {
    generateNewQuestion();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[rgba(255, 255, 255, 0.11)] bg-opacity-30 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-white via-purple-50 to-pink-50 rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl border border-purple-100 transform transition-all duration-300 scale-100 hover:scale-[1.02]">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center">
            <span className="mr-3 text-3xl animate-pulse">🧠</span>
            Brain Teaser Challenge
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold transition-all duration-200 hover:rotate-90 hover:scale-110"
          >
            ×
          </button>
        </div>

        {/* Question */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-pink-100 to-purple-100 border-l-4 border-pink-500 p-6 rounded-xl shadow-md transform transition-all duration-300 hover:shadow-lg">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center">
              <span className="mr-2 text-pink-500">❓</span>
              Question:
            </h3>
            <p className="text-gray-700 text-lg leading-relaxed font-medium">{currentQuestion}</p>
          </div>
        </div>

        {/* Answer (conditionally shown) */}
        {showAnswer && (
          <div className="mb-8 animate-fadeIn">
            <div className="bg-gradient-to-r from-green-100 to-emerald-100 border-l-4 border-green-500 p-6 rounded-xl shadow-md transform transition-all duration-300 hover:shadow-lg">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center">
                <span className="mr-2 text-green-500">💡</span>
                Answer:
              </h3>
              <p className="text-gray-700 text-lg leading-relaxed font-medium">{currentAnswer}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          {!showAnswer ? (
            <button
              onClick={handleRevealAnswer}
              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
            >
              <span>🔍</span>
              Reveal Answer
            </button>
          ) : (
            <button
              onClick={handleNewQuestion}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
            >
              <span>🎲</span>
              New Question
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
          >
            <span>✖️</span>
            Close
          </button>
        </div>
      </div>
      
      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default BrainTeaser;