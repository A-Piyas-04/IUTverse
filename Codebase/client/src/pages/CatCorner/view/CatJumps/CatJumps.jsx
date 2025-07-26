import React, { useEffect, useRef, useState } from "react";
import "./CatJumps.css";

export default function CatJumps() {
  const [isJumping, setIsJumping] = useState(false);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const catRef = useRef(null);
  const obstacleRef = useRef(null);
  const animationFrameId = useRef(null);
  const jumpHeight = 120; // max jump height in px
  const jumpDuration = 600; // total jump duration in ms

  // Position states
  const [catBottom, setCatBottom] = useState(20); // pixels from bottom of game area
  const [obstacleLeft, setObstacleLeft] = useState(600); // pixels from left of game area

  // Jump animation using requestAnimationFrame for smooth physics
  const jump = () => {
    if (isJumping) return;
    setIsJumping(true);
    const start = performance.now();

    const animateJump = (time) => {
      const elapsed = time - start;
      if (elapsed > jumpDuration) {
        setCatBottom(20);
        setIsJumping(false);
        return;
      }
      // Simple parabola: y = -4h/T² * (t - T/2)² + h
      // where h=jumpHeight, T=jumpDuration, t=elapsed
      const t = elapsed;
      const T = jumpDuration;
      const h = jumpHeight;
      const newBottom = -4 * h / (T * T) * (t - T / 2) * (t - T / 2) + h + 20;
      setCatBottom(newBottom);
      animationFrameId.current = requestAnimationFrame(animateJump);
    };

    animationFrameId.current = requestAnimationFrame(animateJump);
  };

  // Handle key press for jump
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!gameOver) jump();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameOver, isJumping]);

  // Obstacle movement & collision detection
  useEffect(() => {
    if (gameOver) return;

    let start = null;
    const speed = 4; // pixels per frame, increase for difficulty

    const moveObstacle = (timestamp) => {
      if (!start) start = timestamp;
      const progress = timestamp - start;

      setObstacleLeft((prev) => {
        let newLeft = prev - speed;
        if (newLeft < -40) {
          // Reset obstacle to right side randomly to add variation
          newLeft = 600 + Math.random() * 300;
          setScore((s) => s + 1);
        }
        return newLeft;
      });

      // Collision detection
      if (catRef.current && obstacleRef.current) {
        const catRect = catRef.current.getBoundingClientRect();
        const obstacleRect = obstacleRef.current.getBoundingClientRect();

        // Basic AABB collision detection
        if (
          catRect.right > obstacleRect.left + 5 &&
          catRect.left < obstacleRect.right - 5 &&
          catRect.bottom > obstacleRect.top + 5 &&
          catRect.top < obstacleRect.bottom - 5
        ) {
          setGameOver(true);
          return; // stop animation on game over
        }
      }

      animationFrameId.current = requestAnimationFrame(moveObstacle);
    };

    animationFrameId.current = requestAnimationFrame(moveObstacle);

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [gameOver]);

  // Restart game
  const restartGame = () => {
    setGameOver(false);
    setScore(0);
    setObstacleLeft(600);
    setCatBottom(20);
    setIsJumping(false);
  };

  return (
    <div className="catjumps-container">
      <h2 className="catjumps-title">🐱 Cat Jumps!</h2>
      <p className="catjumps-instruction">Press any key to jump!</p>
      <div className="game-area">
        <div
          ref={catRef}
          className="cat"
          style={{ bottom: `${catBottom}px` }}
          aria-label="Jumping cat"
        />
        <div
          ref={obstacleRef}
          className="obstacle"
          style={{ left: `${obstacleLeft}px` }}
          aria-label="Moving obstacle"
        />
      </div>
      <p className="score">Score: {score}</p>
      {gameOver && (
        <div className="game-over">
          <p>Game Over 😿</p>
          <button className="restart-btn" onClick={restartGame}>
            Restart
          </button>
        </div>
      )}
    </div>
  );
}
