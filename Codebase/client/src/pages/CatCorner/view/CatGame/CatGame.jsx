import React, { useState, useEffect, useRef } from 'react';
import './CatGame.css';

// Game assets and constants
const LEVELS = [
  {
    id: 1,
    name: "The Backyard",
    description: "Begin your adventure in a familiar backyard. Watch out for the neighbor's dog!",
    background: "backyard",
    obstacles: ['dog', 'fence'],
    collectibles: ['fish', 'yarn', 'milk'],
    requiredScore: 50,
    timeLimit: 60,
    enemySpeed: 1
  },
  {
    id: 2,
    name: "The Alleyway",
    description: "Navigate through the narrow alleyways. Beware of puddles and other stray cats!",
    background: "alley",
    obstacles: ['puddle', 'trash', 'stray'],
    collectibles: ['fish', 'yarn', 'milk', 'mouse'],
    requiredScore: 100,
    timeLimit: 50,
    enemySpeed: 1.2
  },
  {
    id: 3,
    name: "The Park",
    description: "Explore the vast park. Dodge frisbees and children while hunting for treats!",
    background: "park",
    obstacles: ['frisbee', 'child', 'sprinkler'],
    collectibles: ['fish', 'yarn', 'milk', 'mouse', 'bird'],
    requiredScore: 150,
    timeLimit: 45,
    enemySpeed: 1.4
  },
  {
    id: 4,
    name: "Downtown",
    description: "Brave the busy streets of downtown. Watch out for cars and street performers!",
    background: "downtown",
    obstacles: ['car', 'performer', 'bicycle'],
    collectibles: ['fish', 'yarn', 'milk', 'mouse', 'bird', 'cheese'],
    requiredScore: 200,
    timeLimit: 40,
    enemySpeed: 1.6
  },
  {
    id: 5,
    name: "The Docks",
    description: "Reach the docks for the ultimate fishing spot. But beware of water and fishermen!",
    background: "docks",
    obstacles: ['water', 'fisherman', 'net'],
    collectibles: ['fish', 'yarn', 'milk', 'mouse', 'bird', 'cheese', 'crab'],
    requiredScore: 250,
    timeLimit: 35,
    enemySpeed: 1.8
  },
  {
    id: 6,
    name: "The Fish Market",
    description: "The final challenge! Navigate the busy fish market and claim your prize!",
    background: "market",
    obstacles: ['shopper', 'cart', 'broom'],
    collectibles: ['fish', 'yarn', 'milk', 'mouse', 'bird', 'cheese', 'crab', 'tuna'],
    requiredScore: 300,
    timeLimit: 30,
    enemySpeed: 2
  }
];

const POWER_UPS = [
  {
    id: 'speed',
    name: 'Super Speed',
    emoji: '⚡',
    description: 'Move faster for 10 seconds',
    duration: 10000,
    effect: 'speedBoost',
    color: '#FFD700'
  },
  {
    id: 'invincible',
    name: 'Nine Lives',
    emoji: '🛡️',
    description: 'Become invincible for 5 seconds',
    duration: 5000,
    effect: 'invincibility',
    color: '#FF6B6B'
  },
  {
    id: 'magnet',
    name: 'Treat Magnet',
    emoji: '🧲',
    description: 'Attract nearby collectibles for 8 seconds',
    duration: 8000,
    effect: 'magnetism',
    color: '#4FC3F7'
  },
  {
    id: 'freeze',
    name: 'Time Freeze',
    emoji: '❄️',
    description: 'Freeze all obstacles for 6 seconds',
    duration: 6000,
    effect: 'freezeTime',
    color: '#81D4FA'
  },
  {
    id: 'double',
    name: 'Double Points',
    emoji: '✨',
    description: 'Double points for all collectibles for 12 seconds',
    duration: 12000,
    effect: 'doublePoints',
    color: '#AED581'
  }
];

const COLLECTIBLE_POINTS = {
  'fish': 10,
  'yarn': 15,
  'milk': 20,
  'mouse': 25,
  'bird': 30,
  'cheese': 35,
  'crab': 40,
  'tuna': 50
};

// Character selection options
const CAT_CHARACTERS = [
  { id: 'tabby', name: 'Tabby', color: '#D2B48C', specialAbility: 'speedBoost', abilityDescription: 'Starts with extra speed' },
  { id: 'siamese', name: 'Siamese', color: '#F5F5DC', specialAbility: 'extraLife', abilityDescription: 'Starts with an extra life' },
  { id: 'persian', name: 'Persian', color: '#FFFFFF', specialAbility: 'magnetism', abilityDescription: 'Larger collection radius' },
  { id: 'calico', name: 'Calico', color: '#FFD700', specialAbility: 'luckyFind', abilityDescription: 'More power-ups appear' },
  { id: 'black', name: 'Black Cat', color: '#000000', specialAbility: 'nightVision', abilityDescription: 'Can see hidden collectibles' }
];

// Game UI Components
const StartScreen = ({ onStartGame, onSelectCharacter, selectedCharacter }) => {
  return (
    <div className="start-screen">
      <div className="start-content">
        <h1 className="game-title">Cat Quest: The Nine Lives</h1>
        <p className="game-subtitle">An epic adventure of a cat's journey through the city</p>
        
        <div className="character-selection">
          <h2>Choose Your Cat</h2>
          <div className="character-grid">
            {CAT_CHARACTERS.map(cat => (
              <div 
                key={cat.id}
                className={`character-option ${selectedCharacter === cat.id ? 'selected' : ''}`}
                onClick={() => onSelectCharacter(cat.id)}
                style={{ backgroundColor: cat.color }}
              >
                <div className="character-icon">😺</div>
                <h3>{cat.name}</h3>
                <p className="ability-description">{cat.abilityDescription}</p>
              </div>
            ))}
          </div>
        </div>
        
        <button className="start-button" onClick={onStartGame}>
          Start Adventure
          <span className="paw-print">🐾</span>
        </button>
      </div>
    </div>
  );
};

// Game Controls Guide Component
const ControlsGuide = ({ onContinue }) => {
  return (
    <div className="controls-guide">
      <div className="guide-content">
        <h2 className="guide-title">Game Controls</h2>
        
        <div className="controls-container">
          <div className="control-group">
            <h3>Movement Controls</h3>
            <div className="control-item">
              <div className="key-group">
                <div className="key">W</div>
                <div className="key">↑</div>
              </div>
              <span className="control-description">Move Up</span>
            </div>
            <div className="control-item">
              <div className="key-group">
                <div className="key">S</div>
                <div className="key">↓</div>
              </div>
              <span className="control-description">Move Down</span>
            </div>
            <div className="control-item">
              <div className="key-group">
                <div className="key">A</div>
                <div className="key">←</div>
              </div>
              <span className="control-description">Move Left</span>
            </div>
            <div className="control-item">
              <div className="key-group">
                <div className="key">D</div>
                <div className="key">→</div>
              </div>
              <span className="control-description">Move Right</span>
            </div>
          </div>
          
          <div className="gameplay-tips">
            <h3>Gameplay Tips</h3>
            <ul>
              <li>Collect items to earn points</li>
              <li>Avoid obstacles to keep your lives</li>
              <li>Grab power-ups for special abilities</li>
              <li>Complete each level by reaching the required score</li>
            </ul>
          </div>
        </div>
        
        <button className="continue-button" onClick={onContinue}>
          Continue
          <span className="arrow">→</span>
        </button>
      </div>
    </div>
  );
};

const LevelIntro = ({ level, onStartLevel }) => {
  return (
    <div className="level-intro">
      <div className="level-intro-content">
        <h2 className="level-name">Level {level.id}: {level.name}</h2>
        <p className="level-description">{level.description}</p>
        
        <div className="level-details">
          <div className="level-detail">
            <span className="detail-label">Goal:</span>
            <span className="detail-value">{level.requiredScore} points</span>
          </div>
          <div className="level-detail">
            <span className="detail-label">Time Limit:</span>
            <span className="detail-value">{level.timeLimit} seconds</span>
          </div>
        </div>
        
        <div className="collectibles-preview">
          <h3>Collectibles</h3>
          <div className="collectibles-grid">
            {level.collectibles.map(type => (
              <div key={type} className="collectible-preview">
                <div className="collectible-icon">
                  {type === 'fish' && '🐟'}
                  {type === 'yarn' && '🧶'}
                  {type === 'milk' && '🥛'}
                  {type === 'mouse' && '🐁'}
                  {type === 'bird' && '🐦'}
                  {type === 'cheese' && '🧀'}
                  {type === 'crab' && '🦀'}
                  {type === 'tuna' && '🐠'}
                </div>
                <span className="collectible-points">+{COLLECTIBLE_POINTS[type]}</span>
              </div>
            ))}
          </div>
        </div>
        
        <button className="start-level-button" onClick={onStartLevel}>
          Start Level
          <span className="go-icon">🏁</span>
        </button>
      </div>
    </div>
  );
};

const GameHUD = ({ score, lives, timeLeft, activePowerUps }) => {
  return (
    <div className="game-hud">
      <div className="hud-item score">
        <span className="hud-label">Score:</span>
        <span className="hud-value">{score}</span>
      </div>
      
      <div className="hud-item lives">
        <span className="hud-label">Lives:</span>
        <div className="lives-container">
          {[...Array(9)].map((_, i) => (
            <span key={i} className={`life-icon ${i < lives ? 'active' : ''}`}>😺</span>
          ))}
        </div>
      </div>
      
      <div className="hud-item time">
        <span className="hud-label">Time:</span>
        <div className="time-bar-container">
          <div 
            className="time-bar" 
            style={{ width: `${(timeLeft / LEVELS[0].timeLimit) * 100}%` }}
          ></div>
        </div>
        <span className="time-value">{Math.ceil(timeLeft)}s</span>
      </div>
      
      <div className="hud-item power-ups">
        {activePowerUps.map(powerUp => (
          <div 
            key={powerUp.id} 
            className="active-power-up"
            style={{ backgroundColor: powerUp.color }}
          >
            <span className="power-up-icon">{powerUp.emoji}</span>
            <span className="power-up-timer">{Math.ceil(powerUp.timeLeft / 1000)}s</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const GameCharacter = ({ position, direction, isMoving, hasShield }) => {
  return (
    <div 
      className={`game-character ${direction} ${isMoving ? 'moving' : ''} ${hasShield ? 'shielded' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`
      }}
    >
      <div className="character-emoji">😺</div>
      {hasShield && <div className="shield-effect"></div>}
    </div>
  );
};

const Collectible = ({ type, position, isAttracted }) => {
  return (
    <div 
      className={`collectible ${isAttracted ? 'attracted' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`
      }}
    >
      {type === 'fish' && '🐟'}
      {type === 'yarn' && '🧶'}
      {type === 'milk' && '🥛'}
      {type === 'mouse' && '🐁'}
      {type === 'bird' && '🐦'}
      {type === 'cheese' && '🧀'}
      {type === 'crab' && '🦀'}
      {type === 'tuna' && '🐠'}
    </div>
  );
};

const Obstacle = ({ type, position, isFrozen }) => {
  return (
    <div 
      className={`obstacle ${type} ${isFrozen ? 'frozen' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`
      }}
    >
      {type === 'dog' && '🐕'}
      {type === 'fence' && '🧱'}
      {type === 'puddle' && '💧'}
      {type === 'trash' && '🗑️'}
      {type === 'stray' && '🐈'}
      {type === 'frisbee' && '🥏'}
      {type === 'child' && '👶'}
      {type === 'sprinkler' && '💦'}
      {type === 'car' && '🚗'}
      {type === 'performer' && '🎭'}
      {type === 'bicycle' && '🚲'}
      {type === 'water' && '🌊'}
      {type === 'fisherman' && '🎣'}
      {type === 'net' && '🕸️'}
      {type === 'shopper' && '🛒'}
      {type === 'cart' && '🛒'}
      {type === 'broom' && '🧹'}
    </div>
  );
};

const PowerUp = ({ type, position }) => {
  const powerUpData = POWER_UPS.find(p => p.id === type);
  
  return (
    <div 
      className="power-up"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        backgroundColor: powerUpData.color
      }}
    >
      <span className="power-up-icon">{powerUpData.emoji}</span>
    </div>
  );
};

const CollectiblePopup = ({ text, position, points, timeLeft }) => {
  return (
    <div 
      className={`collectible-popup ${points >= 30 ? 'high-value' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y - 30}px`,
        opacity: timeLeft / 1000
      }}
    >
      {text}
    </div>
  );
};

const LevelComplete = ({ score, requiredScore, stars, onContinue, onReplay }) => {
  return (
    <div className="level-complete">
      <div className="level-complete-content">
        <h2 className="complete-title">Level Complete!</h2>
        
        <div className="score-display">
          <span className="score-label">Score:</span>
          <span className="score-value">{score}/{requiredScore}</span>
        </div>
        
        <div className="stars-container">
          {[...Array(3)].map((_, i) => (
            <div key={i} className={`star ${i < stars ? 'earned' : ''}`}>⭐</div>
          ))}
        </div>
        
        <div className="level-complete-buttons">
          <button className="replay-button" onClick={onReplay}>
            Replay Level
          </button>
          <button className="continue-button" onClick={onContinue}>
            Continue
            <span className="arrow">→</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const GameOver = ({ score, onRestart }) => {
  return (
    <div className="game-over">
      <div className="game-over-content">
        <h2 className="game-over-title">Game Over</h2>
        <p className="game-over-message">Oh no! You've lost all your nine lives!</p>
        
        <div className="final-score">
          <span className="score-label">Final Score:</span>
          <span className="score-value">{score}</span>
        </div>
        
        <button className="restart-button" onClick={onRestart}>
          Try Again
          <span className="restart-icon">🔄</span>
        </button>
      </div>
    </div>
  );
};

const GameWin = ({ totalScore, onRestart }) => {
  return (
    <div className="game-win">
      <div className="game-win-content">
        <h2 className="win-title">Congratulations!</h2>
        <p className="win-message">You've completed all levels and become the ultimate cat adventurer!</p>
        
        <div className="confetti-container">
          {[...Array(50)].map((_, i) => (
            <div key={i} className="confetti" style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              backgroundColor: `hsl(${Math.random() * 360}, 100%, 50%)`
            }}></div>
          ))}
        </div>
        
        <div className="game-stats">
          <div className="game-stat">
            <span className="stat-label">Total Score:</span>
            <span className="stat-value">{totalScore}</span>
          </div>
        </div>
        
        <button className="restart-button" onClick={onRestart}>
          Play Again
          <span className="trophy">🏆</span>
        </button>
      </div>
    </div>
  );
};

// Main Game Component
const CatGame = () => {
  // Game state
  const [gameState, setGameState] = useState('start'); // start, controls, intro, playing, complete, over, win
  const [selectedCharacter, setSelectedCharacter] = useState('tabby');
  const [currentLevel, setCurrentLevel] = useState(0);
  const [score, setScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [lives, setLives] = useState(9);
  const [timeLeft, setTimeLeft] = useState(0);
  const [levelStars, setLevelStars] = useState(0);
  
  // Game objects
  const [characterPosition, setCharacterPosition] = useState({ x: 0, y: 0 });
  const [characterDirection, setCharacterDirection] = useState('right');
  const [isMoving, setIsMoving] = useState(false);
  const [collectibles, setCollectibles] = useState([]);
  const [obstacles, setObstacles] = useState([]);
  const [powerUps, setPowerUps] = useState([]);
  const [activePowerUps, setActivePowerUps] = useState([]);
  const [popups, setPopups] = useState([]);
  
  // Game mechanics
  const [keys, setKeys] = useState({
    up: false,
    down: false,
    left: false,
    right: false
  });
  
  // Refs for animation frame and game loop
  const gameLoopRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);
  const gameContainerRef = useRef(null);
  
  // Initialize the game
  const startGame = () => {
    setGameState('controls'); // Show controls guide first
    setCurrentLevel(0);
    setTotalScore(0);
    setLives(9);
    
    // Apply character special abilities
    if (selectedCharacter === 'siamese') {
      setLives(10); // Extra life for Siamese
    }
  };
  
  // Continue to level intro after controls guide
  const continueToGame = () => {
    setGameState('intro');
  };
  
  // Start a specific level
  const startLevel = () => {
    const level = LEVELS[currentLevel];
    setGameState('playing');
    setScore(0);
    setTimeLeft(level.timeLimit);
    setCharacterPosition({ x: 100, y: 300 });
    setCharacterDirection('right');
    setIsMoving(false);
    setCollectibles([]);
    setObstacles([]);
    setPowerUps([]);
    setActivePowerUps([]);
    setPopups([]);
    
    // Generate initial collectibles and obstacles
    generateCollectibles(level);
    generateObstacles(level);
    
    // Start game loop
    lastUpdateTimeRef.current = performance.now();
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  };
  
  // Generate collectibles for the level
  const generateCollectibles = (level) => {
    const containerRect = gameContainerRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    
    const newCollectibles = [];
    const count = Math.floor(Math.random() * 3) + 5; // 5-7 collectibles
    
    // Define a safe zone around the character's starting position
    const safeZone = {
      x: 100, // Character starting x position
      y: 300, // Character starting y position
      radius: 100 // Safe distance from character
    };
    
    for (let i = 0; i < count; i++) {
      const type = level.collectibles[Math.floor(Math.random() * level.collectibles.length)];
      
      // Generate a position for the collectible
      let posX, posY;
      let isTooClose;
      
      // Keep generating positions until we find one that's not too close to the character
      do {
        posX = Math.random() * (containerRect.width - 50);
        posY = Math.random() * (containerRect.height - 50);
        
        // Check if this position is too close to the character's starting position
        const distance = Math.sqrt(
          Math.pow(posX - safeZone.x, 2) + 
          Math.pow(posY - safeZone.y, 2)
        );
        
        isTooClose = distance < safeZone.radius;
      } while (isTooClose);
      
      newCollectibles.push({
        id: `collectible-${Date.now()}-${i}`,
        type,
        position: {
          x: posX,
          y: posY
        },
        isAttracted: false
      });
    }
    
    setCollectibles(prev => [...prev, ...newCollectibles]);
    
    // Maybe spawn a power-up (more likely with Calico cat)
    const powerUpChance = selectedCharacter === 'calico' ? 0.4 : 0.2;
    if (Math.random() < powerUpChance) {
      const powerUpType = POWER_UPS[Math.floor(Math.random() * POWER_UPS.length)].id;
      
      // Define a safe zone around the character's starting position (same as for collectibles)
      const safeZone = {
        x: 100, // Character starting x position
        y: 300, // Character starting y position
        radius: 100 // Safe distance from character
      };
      
      // Generate a position for the power-up
      let posX, posY;
      let isTooClose;
      
      // Keep generating positions until we find one that's not too close to the character
      do {
        posX = Math.random() * (containerRect.width - 50);
        posY = Math.random() * (containerRect.height - 50);
        
        // Check if this position is too close to the character's starting position
        const distance = Math.sqrt(
          Math.pow(posX - safeZone.x, 2) + 
          Math.pow(posY - safeZone.y, 2)
        );
        
        isTooClose = distance < safeZone.radius;
      } while (isTooClose);
      
      setPowerUps(prev => [
        ...prev,
        {
          id: `powerup-${Date.now()}`,
          type: powerUpType,
          position: {
            x: posX,
            y: posY
          }
        }
      ]);
    }
  };
  
  // Generate obstacles for the level
  const generateObstacles = (level) => {
    const containerRect = gameContainerRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    
    const newObstacles = [];
    const count = Math.floor(Math.random() * 3) + 3; // 3-5 obstacles
    
    // Define a safe zone around the character's starting position
    const safeZone = {
      x: 100, // Character starting x position
      y: 300, // Character starting y position
      radius: 150 // Safe distance from character (larger than for collectibles)
    };
    
    for (let i = 0; i < count; i++) {
      const type = level.obstacles[Math.floor(Math.random() * level.obstacles.length)];
      
      // Generate a position for the obstacle
      let posX, posY;
      let isTooClose;
      
      // Keep generating positions until we find one that's not too close to the character
      do {
        posX = Math.random() * (containerRect.width - 50);
        posY = Math.random() * (containerRect.height - 50);
        
        // Check if this position is too close to the character's starting position
        const distance = Math.sqrt(
          Math.pow(posX - safeZone.x, 2) + 
          Math.pow(posY - safeZone.y, 2)
        );
        
        isTooClose = distance < safeZone.radius;
      } while (isTooClose);
      
      newObstacles.push({
        id: `obstacle-${Date.now()}-${i}`,
        type,
        position: {
          x: posX,
          y: posY
        },
        velocity: {
          x: (Math.random() - 0.5) * 2 * level.enemySpeed,
          y: (Math.random() - 0.5) * 2 * level.enemySpeed
        },
        isFrozen: false
      });
    }
    
    setObstacles(prev => [...prev, ...newObstacles]);
  };
  
  // Main game loop
  const gameLoop = (timestamp) => {
    const deltaTime = timestamp - lastUpdateTimeRef.current;
    lastUpdateTimeRef.current = timestamp;
    
    // Update game state
    updateCharacterPosition(deltaTime);
    updateObstacles(deltaTime);
    updatePowerUps(deltaTime);
    updateActivePowerUps(deltaTime);
    updatePopups(deltaTime);
    updateTime(deltaTime);
    
    // Check collisions
    checkCollectibleCollisions();
    checkObstacleCollisions();
    checkPowerUpCollisions();
    
    // Check if we need more collectibles
    if (collectibles.length < 3) {
      generateCollectibles(LEVELS[currentLevel]);
    }
    
    // Continue the game loop
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  };
  
  // Update character position based on keyboard input
  const updateCharacterPosition = (deltaTime) => {
    if (!keys.up && !keys.down && !keys.left && !keys.right) {
      setIsMoving(false);
      return;
    }
    
    setIsMoving(true);
    
    // Calculate base speed and apply power-up effects
    let speed = 0.3; // Base speed in pixels per millisecond
    
    // Apply speed boost from power-up
    if (activePowerUps.some(p => p.effect === 'speedBoost')) {
      speed *= 1.5;
    }
    
    // Apply character special ability (Tabby has speed boost)
    if (selectedCharacter === 'tabby') {
      speed *= 1.2;
    }
    
    // Calculate movement distance
    const distance = speed * deltaTime;
    
    // Update position based on keys pressed
    setCharacterPosition(prev => {
      let newX = prev.x;
      let newY = prev.y;
      
      if (keys.up) newY -= distance;
      if (keys.down) newY += distance;
      if (keys.left) {
        newX -= distance;
        setCharacterDirection('left');
      }
      if (keys.right) {
        newX += distance;
        setCharacterDirection('right');
      }
      
      // Get container boundaries
      const containerRect = gameContainerRef.current?.getBoundingClientRect();
      if (containerRect) {
        // Apply boundary checks
        newX = Math.max(0, Math.min(containerRect.width - 50, newX));
        newY = Math.max(0, Math.min(containerRect.height - 50, newY));
      }
      
      return { x: newX, y: newY };
    });
  };
  
  // Update obstacle positions
  const updateObstacles = (deltaTime) => {
    setObstacles(prev => {
      return prev.map(obstacle => {
        if (obstacle.isFrozen) return obstacle;
        
        const containerRect = gameContainerRef.current?.getBoundingClientRect();
        if (!containerRect) return obstacle;
        
        // Calculate new position
        let newX = obstacle.position.x + obstacle.velocity.x * deltaTime / 16;
        let newY = obstacle.position.y + obstacle.velocity.y * deltaTime / 16;
        
        // Bounce off walls
        if (newX <= 0 || newX >= containerRect.width - 40) {
          obstacle.velocity.x *= -1;
          newX = Math.max(0, Math.min(containerRect.width - 40, newX));
        }
        
        if (newY <= 0 || newY >= containerRect.height - 40) {
          obstacle.velocity.y *= -1;
          newY = Math.max(0, Math.min(containerRect.height - 40, newY));
        }
        
        return {
          ...obstacle,
          position: { x: newX, y: newY }
        };
      });
    });
  };
  
  // Update active power-ups (decrease time left)
  const updateActivePowerUps = (deltaTime) => {
    setActivePowerUps(prev => {
      return prev
        .map(powerUp => ({
          ...powerUp,
          timeLeft: powerUp.timeLeft - deltaTime
        }))
        .filter(powerUp => powerUp.timeLeft > 0);
    });
  };
  
  // Update collectibles (for magnetism effect)
  const updatePowerUps = (deltaTime) => {
    // Check if magnetism is active
    const hasMagnetism = activePowerUps.some(p => p.effect === 'magnetism') || 
                        selectedCharacter === 'persian';
    
    if (!hasMagnetism) return;
    
    // Get magnetism radius (larger for Persian cat)
    const magnetRadius = selectedCharacter === 'persian' ? 150 : 100;
    
    // Update collectibles to be attracted to the character
    setCollectibles(prev => {
      return prev.map(collectible => {
        const dx = characterPosition.x - collectible.position.x;
        const dy = characterPosition.y - collectible.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < magnetRadius) {
          // Calculate attraction force
          const speed = 0.1 * deltaTime;
          const newX = collectible.position.x + (dx / distance) * speed;
          const newY = collectible.position.y + (dy / distance) * speed;
          
          return {
            ...collectible,
            position: { x: newX, y: newY },
            isAttracted: true
          };
        }
        
        return {
          ...collectible,
          isAttracted: false
        };
      });
    });
  };
  
  // Update popups (decrease time left)
  const updatePopups = (deltaTime) => {
    setPopups(prev => {
      return prev
        .map(popup => ({
          ...popup,
          timeLeft: popup.timeLeft - deltaTime,
          position: { 
            ...popup.position, 
            y: popup.position.y - 0.05 * deltaTime 
          }
        }))
        .filter(popup => popup.timeLeft > 0);
    });
  };
  
  // Update game timer
  const updateTime = (deltaTime) => {
    setTimeLeft(prev => {
      const newTime = prev - deltaTime / 1000;
      
      if (newTime <= 0) {
        // Time's up - lose a life
        loseLife();
        return LEVELS[currentLevel].timeLimit;
      }
      
      return newTime;
    });
  };
  
  // Check for collisions with collectibles
  const checkCollectibleCollisions = () => {
    const charRect = {
      x: characterPosition.x,
      y: characterPosition.y,
      width: 50,
      height: 50
    };
    
    setCollectibles(prev => {
      const remaining = [];
      let scoreGained = 0;
      
      prev.forEach(collectible => {
        const collectRect = {
          x: collectible.position.x,
          y: collectible.position.y,
          width: 40,
          height: 40
        };
        
        if (
          charRect.x < collectRect.x + collectRect.width &&
          charRect.x + charRect.width > collectRect.x &&
          charRect.y < collectRect.y + collectRect.height &&
          charRect.y + charRect.height > collectRect.y
        ) {
          // Collision detected!
          const basePoints = COLLECTIBLE_POINTS[collectible.type];
          const doublePoints = activePowerUps.some(p => p.effect === 'doublePoints');
          const points = doublePoints ? basePoints * 2 : basePoints;
          
          scoreGained += points;
          
          // Add popup
          setPopups(popups => [
            ...popups,
            {
              id: `popup-${Date.now()}`,
              text: `+${points}`,
              position: { ...collectible.position },
              points,
              timeLeft: 1000
            }
          ]);
        } else {
          remaining.push(collectible);
        }
      });
      
      if (scoreGained > 0) {
        // Update scores using functional updates to ensure we have the latest state
        setScore(prevScore => {
          const newScore = prevScore + scoreGained;
          // Check for level completion with the updated score value inside the callback
          // to ensure we're using the latest score value
          if (newScore >= LEVELS[currentLevel].requiredScore) {
            // Use setTimeout to avoid state update during another state update
            setTimeout(() => completeLevel(), 0);
          }
          return newScore;
        });
        setTotalScore(s => s + scoreGained);
      }
      
      return remaining;
    });
  };
  
  // Check for collisions with obstacles
  const checkObstacleCollisions = () => {
    if (activePowerUps.some(p => p.effect === 'invincibility')) return;
    
    const charRect = {
      x: characterPosition.x,
      y: characterPosition.y,
      width: 50,
      height: 50
    };
    
    let collision = false;
    
    obstacles.forEach(obstacle => {
      const obstacleRect = {
        x: obstacle.position.x,
        y: obstacle.position.y,
        width: 40,
        height: 40
      };
      
      if (
        charRect.x < obstacleRect.x + obstacleRect.width &&
        charRect.x + charRect.width > obstacleRect.x &&
        charRect.y < obstacleRect.y + obstacleRect.height &&
        charRect.y + charRect.height > obstacleRect.y
      ) {
        collision = true;
      }
    });
    
    if (collision) {
      loseLife();
    }
  };
  
  // Check for collisions with power-ups
  const checkPowerUpCollisions = () => {
    const charRect = {
      x: characterPosition.x,
      y: characterPosition.y,
      width: 50,
      height: 50
    };
    
    setPowerUps(prev => {
      const remaining = [];
      
      prev.forEach(powerUp => {
        const powerUpRect = {
          x: powerUp.position.x,
          y: powerUp.position.y,
          width: 40,
          height: 40
        };
        
        if (
          charRect.x < powerUpRect.x + powerUpRect.width &&
          charRect.x + charRect.width > powerUpRect.x &&
          charRect.y < powerUpRect.y + powerUpRect.height &&
          charRect.y + charRect.height > powerUpRect.y
        ) {
          // Collision detected!
          const powerUpData = POWER_UPS.find(p => p.id === powerUp.type);
          
          // Add to active power-ups
          setActivePowerUps(active => {
            // If already active, refresh duration
            const existing = active.findIndex(p => p.effect === powerUpData.effect);
            
            if (existing >= 0) {
              const updated = [...active];
              updated[existing] = {
                ...updated[existing],
                timeLeft: powerUpData.duration
              };
              return updated;
            }
            
            // Otherwise add new
            return [
              ...active,
              {
                ...powerUpData,
                timeLeft: powerUpData.duration
              }
            ];
          });
          
          // Apply immediate effects
          if (powerUp.type === 'freeze') {
            setObstacles(obstacles => obstacles.map(o => ({ ...o, isFrozen: true })));
            
            // Unfreeze after duration
            setTimeout(() => {
              setObstacles(obstacles => obstacles.map(o => ({ ...o, isFrozen: false })));
            }, powerUpData.duration);
          }
        } else {
          remaining.push(powerUp);
        }
      });
      
      return remaining;
    });
  };
  
  // Lose a life and check game over
  const loseLife = () => {
    setLives(prev => {
      const newLives = prev - 1;
      
      if (newLives <= 0) {
        // Game over
        setGameState('over');
        if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
        return 0;
      }
      
      return newLives;
    });
    
    // Reset character position
    setCharacterPosition({ x: 100, y: 300 });
    
    // Clear active power-ups
    setActivePowerUps([]);
  };
  
  // Complete the current level
  const completeLevel = () => {
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    
    // Calculate stars based on score vs required
    const level = LEVELS[currentLevel];
    const ratio = score / level.requiredScore;
    let stars = 1; // At least 1 star for completing
    
    if (ratio >= 1.5) stars = 3;
    else if (ratio >= 1.2) stars = 2;
    
    setLevelStars(stars);
    setGameState('complete');
  };
  
  // Continue to next level
  const continueToNextLevel = () => {
    const nextLevel = currentLevel + 1;
    
    if (nextLevel >= LEVELS.length) {
      // Game completed!
      setGameState('win');
    } else {
      setCurrentLevel(nextLevel);
      setGameState('intro');
    }
  };
  
  // Keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Prevent default behavior for arrow keys to avoid page scrolling
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key)) {
        e.preventDefault();
      }
      
      // Only process movement keys when the game is in playing state
      if (gameState === 'playing') {
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
          setKeys(prev => ({ ...prev, up: true }));
        }
        if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
          setKeys(prev => ({ ...prev, down: true }));
        }
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          setKeys(prev => ({ ...prev, left: true }));
        }
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          setKeys(prev => ({ ...prev, right: true }));
        }
      }
    };
    
    const handleKeyUp = (e) => {
      // Always process key up events to prevent keys getting stuck
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        setKeys(prev => ({ ...prev, up: false }));
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        setKeys(prev => ({ ...prev, down: false }));
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        setKeys(prev => ({ ...prev, left: false }));
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        setKeys(prev => ({ ...prev, right: false }));
      }
    };
    
    // Add focus to the game container to ensure it receives keyboard events
    if (gameContainerRef.current) {
      gameContainerRef.current.focus();
    }
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);
  
  // Cleanup game loop on unmount
  useEffect(() => {
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, []);
  
  // Handle navigation button clicks
  const handleDirectionClick = (direction) => {
    if (gameState !== 'playing') return;
    
    // Calculate movement based on direction
    const moveDistance = 20; // Pixels to move per click
    
    setCharacterPosition(prev => {
      let newX = prev.x;
      let newY = prev.y;
      
      if (direction === 'up') newY -= moveDistance;
      if (direction === 'down') newY += moveDistance;
      if (direction === 'left') {
        newX -= moveDistance;
        setCharacterDirection('left');
      }
      if (direction === 'right') {
        newX += moveDistance;
        setCharacterDirection('right');
      }
      
      // Get container boundaries
      const containerRect = gameContainerRef.current?.getBoundingClientRect();
      if (containerRect) {
        // Apply boundary checks
        newX = Math.max(0, Math.min(containerRect.width - 50, newX));
        newY = Math.max(0, Math.min(containerRect.height - 50, newY));
      }
      
      return { x: newX, y: newY };
    });
  };
  
  return (
    <div 
      className="cat-game-container" 
      ref={gameContainerRef} 
      tabIndex="0" // Make the container focusable
    >
      {/* Background based on current level */}
      {gameState !== 'start' && (
        <div className={`game-background ${LEVELS[currentLevel].background}`}></div>
      )}
      
      {/* Game screens */}
      {gameState === 'start' && (
        <StartScreen 
          onStartGame={startGame} 
          onSelectCharacter={setSelectedCharacter}
          selectedCharacter={selectedCharacter}
        />
      )}
      
      {gameState === 'controls' && (
        <ControlsGuide onContinue={continueToGame} />
      )}
      
      {gameState === 'intro' && (
        <LevelIntro 
          level={LEVELS[currentLevel]} 
          onStartLevel={startLevel} 
        />
      )}
      
      {gameState === 'playing' && (
        <>
          <GameHUD 
            score={score} 
            lives={lives} 
            timeLeft={timeLeft} 
            activePowerUps={activePowerUps} 
          />
          
          <GameCharacter 
            position={characterPosition} 
            direction={characterDirection} 
            isMoving={isMoving} 
            hasShield={activePowerUps.some(p => p.effect === 'invincibility')} 
          />
          
          {collectibles.map(collectible => (
            <Collectible 
              key={collectible.id} 
              type={collectible.type} 
              position={collectible.position} 
              isAttracted={collectible.isAttracted} 
            />
          ))}
          
          {obstacles.map(obstacle => (
            <Obstacle 
              key={obstacle.id} 
              type={obstacle.type} 
              position={obstacle.position} 
              isFrozen={obstacle.isFrozen} 
            />
          ))}
          
          {powerUps.map(powerUp => (
            <PowerUp 
              key={powerUp.id} 
              type={powerUp.type} 
              position={powerUp.position} 
            />
          ))}
          
          {popups.map(popup => (
            <CollectiblePopup 
              key={popup.id} 
              text={popup.text} 
              position={popup.position} 
              points={popup.points} 
              timeLeft={popup.timeLeft} 
            />
          ))}
          
          {/* Navigation Buttons */}
          <div className="navigation-controls">
            <button 
              className="nav-button up" 
              onClick={() => handleDirectionClick('up')}
              aria-label="Move Up"
            >
              ⬆️
            </button>
            <div className="horizontal-controls">
              <button 
                className="nav-button left" 
                onClick={() => handleDirectionClick('left')}
                aria-label="Move Left"
              >
                ⬅️
              </button>
              <button 
                className="nav-button right" 
                onClick={() => handleDirectionClick('right')}
                aria-label="Move Right"
              >
                ➡️
              </button>
            </div>
            <button 
              className="nav-button down" 
              onClick={() => handleDirectionClick('down')}
              aria-label="Move Down"
            >
              ⬇️
            </button>
          </div>
        </>
      )}
      
      {gameState === 'complete' && (
        <LevelComplete 
          score={score} 
          requiredScore={LEVELS[currentLevel].requiredScore} 
          stars={levelStars} 
          onContinue={continueToNextLevel} 
          onReplay={() => {
            setCurrentLevel(currentLevel);
            setGameState('intro');
          }} 
        />
      )}
      
      {gameState === 'over' && (
        <GameOver 
          score={totalScore} 
          onRestart={() => {
            setSelectedCharacter('tabby');
            setGameState('start');
          }} 
        />
      )}
      
      {gameState === 'win' && (
        <GameWin 
          totalScore={totalScore} 
          onRestart={() => {
            setSelectedCharacter('tabby');
            setGameState('start');
          }} 
        />
      )}
    </div>
  );
};

export default CatGame;