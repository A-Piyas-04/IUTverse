import React, { useState, useEffect } from 'react';

const IUTFacts = ({ isOpen, onClose }) => {
  const [currentFact, setCurrentFact] = useState('');
  const [facts, setFacts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch facts from the txt file
  useEffect(() => {
    const fetchFacts = async () => {
      try {
        const response = await fetch('/iutFacts.txt');
        const text = await response.text();
        
        // Parse the data into individual facts
        const factsList = text.split('\n').map(line => {
          const trimmedLine = line.trim();
          if (trimmedLine) {
            // Remove the number prefix (e.g., "1. ", "2. ")
            return trimmedLine.replace(/^\d+\.\s*/, '');
          }
          return null;
        }).filter(Boolean);

        setFacts(factsList);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching IUT facts:', error);
        // Fallback to hardcoded facts if fetch fails
        const fallbackFacts = [
          "There is a person in SWE'22 named \"Abu Zafar Sheikh Mohammad Golam Musabbereen Chishti\"",
          "Your \"5-minute nap\" before an 8:00 AM class? Turns into a full-blown absence.",
          "Group study in dorms = 5 minutes of study, 2 hours of memes, snacks, and life talks.",
          "Every Club is the most Prestiguous Club in IUT."
        ];
        setFacts(fallbackFacts);
        setLoading(false);
      }
    };

    fetchFacts();
  }, []);

  // Generate a new random fact
  const generateNewFact = () => {
    if (facts.length > 0) {
      const randomIndex = Math.floor(Math.random() * facts.length);
      setCurrentFact(facts[randomIndex]);
    }
  };

  // Generate initial fact when modal opens
  useEffect(() => {
    if (isOpen && facts.length > 0) {
      generateNewFact();
    }
  }, [isOpen, facts]);

  const handleNewFact = () => {
    generateNewFact();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[rgba(255, 255, 255, 0.11)] bg-opacity-30 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-white via-blue-50 to-indigo-50 rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl border border-blue-100 transform transition-all duration-300 scale-100 hover:scale-[1.02]">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center">
            <span className="mr-3 text-3xl animate-pulse">🎓</span>
            Random IUT Fact
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold transition-all duration-200 hover:rotate-90 hover:scale-110"
          >
            ×
          </button>
        </div>

        {/* Fact Display */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-100 to-indigo-100 border-l-4 border-blue-500 p-6 rounded-xl shadow-md transform transition-all duration-300 hover:shadow-lg">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center">
              <span className="mr-2 text-blue-500">💡</span>
              Did You Know?
            </h3>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-gray-600">Loading facts...</span>
              </div>
            ) : (
              <p className="text-gray-700 text-lg leading-relaxed font-medium">{currentFact}</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleNewFact}
            disabled={loading}
            className={`flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2 ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <span>🎲</span>
            New Fact
          </button>
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

export default IUTFacts;
