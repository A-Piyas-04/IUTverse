# Cat Adventure Game

## Overview
Cat Adventure is a fully responsive, engaging game built with React JSX and vanilla CSS. The game features a cute cat navigating through multiple distinct places, collecting items, overcoming obstacles, and managing score and health.

## Features

### Multi-Space Navigation
- 6 unique places (Backyard, Alley, Park, Downtown, Docks, Market), each with distinct visuals
- Navigation between places via on-screen directional buttons
- Certain paths require items or power-ups to unlock

### Player Character
- Choose from multiple cat characters, each with unique abilities
- Animated cat with idle animations
- Smooth transitions between places

### Collectibles and Power-ups
- Various collectible items that increase score
- Food items that restore health
- Power-ups that grant temporary abilities
- Visual feedback when collecting items

### Obstacles and Challenges
- Various obstacles that decrease health or block progress
- Visual cues and animations for interactions

### Score and Health System
- Prominently displayed score and health bars
- Real-time updates
- Game-over state with restart option

### UI Components
- Navigation controls
- Inventory panel
- Scoreboard and health bar
- Notification system for pickups and events
- Fully responsive design for desktop and mobile

### Animations
- Smooth scene transitions
- Animated pickups
- Cat idle animations
- Button effects
- Health bar changes
- Obstacle interactions

## How to Run

1. Make sure you have React installed in your project
2. Place the `CatGame.jsx` and `CatGame.css` files in your project directory
3. Import the CatGame component in your application:

```jsx
import CatGame from './path/to/CatGame';

function App() {
  return (
    <div className="App">
      <CatGame />
    </div>
  );
}

export default App;
```

## How to Play

1. Start Screen: Select your cat character and click "Start Adventure"
2. Controls Guide: Learn the controls and click "Continue"
3. Level Intro: Read about the level and click "Let's Go!"
4. Gameplay:
   - Use arrow keys or WASD to move your cat
   - Collect items to increase your score
   - Avoid obstacles that decrease your health
   - Collect power-ups for temporary abilities
   - Complete the level by reaching the required score
5. Level Complete: View your performance and continue to the next level or replay
6. Game Over: If your health reaches zero, you can restart the game
7. Game Win: Complete all levels to win the game

## Game Controls

- Movement: Arrow keys or WASD
- Pause: Spacebar or P
- Use Item: E or Enter

## Technical Details

- Built with React JSX
- Styled with vanilla CSS
- No external dependencies required
- Fully responsive design
- Mobile-friendly controls

## Code Structure

- `CatGame.jsx`: Main game component with game logic
- `CatGame.css`: Styling for all game components

The game uses React hooks for state management and game loop implementation. The code is modular and well-commented for easy understanding and modification.