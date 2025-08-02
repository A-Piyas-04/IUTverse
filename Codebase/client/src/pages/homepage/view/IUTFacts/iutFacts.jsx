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
    <div className="fixed inset-0 bg-[rgba(255, 255, 255, 0.11)] bg-opacity-30 flex items-center justify-center z-50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-gradient-to-br from-white via-blue-50 to-indigo-50 rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl border border-blue-100 transform transition-all duration-300 scale-100 hover:scale-[1.02] animate-slideUpScale">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 animate-slideDown">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center animate-fadeInUp">
            <span className="mr-3 text-3xl animate-bounceIn">🎓</span>
            Random IUT Fact
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold transition-all duration-300 hover:rotate-90 hover:scale-110 animate-fadeInScale"
          >
            ×
          </button>
        </div>

        {/* Fact Display */}
        <div className="mb-8 animate-slideInLeft">
          <div className="bg-gradient-to-r from-blue-100 to-indigo-100 border-l-4 border-blue-500 p-6 rounded-xl shadow-md transform transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center animate-fadeInUp">
              <span className="mr-2 text-blue-500 animate-pulse">💡</span>
              Did You Know?
            </h3>
            {loading ? (
              <div className="flex items-center justify-center py-4 animate-fadeIn">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-gray-600">Loading facts...</span>
              </div>
            ) : (
              <p className="text-gray-700 text-lg leading-relaxed font-medium animate-fadeInUp">{currentFact}</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 animate-slideInRight">
          <button
            onClick={handleNewFact}
            disabled={loading}
            className={`flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2 animate-fadeInScale ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <span className="animate-bounceIn">🎲</span>
            New Fact
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2 animate-fadeInScale"
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
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes slideUpScale {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.5);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes bounceIn {
          from {
            opacity: 0;
            transform: scale(0.3);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .animate-slideUpScale {
          animation: slideUpScale 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .animate-slideDown {
          animation: slideDown 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.1s both;
        }
        
        .animate-fadeInUp {
          animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.2s both;
        }
        
        .animate-slideInLeft {
          animation: slideInLeft 0.7s cubic-bezier(0.4, 0, 0.2, 1) 0.3s both;
        }
        
        .animate-slideInRight {
          animation: slideInRight 0.7s cubic-bezier(0.4, 0, 0.2, 1) 0.4s both;
        }
        
        .animate-fadeInScale {
          animation: fadeInScale 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.5s both;
        }
        
        .animate-bounceIn {
          animation: bounceIn 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) 0.6s both;
        }
      `}</style>
    </div>
  );
};

export default IUTFacts;
