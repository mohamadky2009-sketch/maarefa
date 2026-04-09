import { PLANETS, CHARACTERS, playSound } from '@/lib/gameState';
import { useGame } from '@/context/GameContext';
import { useState } from 'react';
import ShopModal from './ShopModal';
import Leaderboard from './Leaderboard';

import planetNeptune from '@/assets/planet-neptune.png';
import planetUranus from '@/assets/planet-uranus.png';
import planetSaturn from '@/assets/planet-saturn.png';
import planetJupiter from '@/assets/planet-jupiter.png';
import planetMars from '@/assets/planet-mars.png';
import planetEarth from '@/assets/planet-earth.png';
import planetVenus from '@/assets/planet-venus.png';
import planetMercury from '@/assets/planet-mercury.png';
import planetSun from '@/assets/planet-sun.png';

const PLANET_IMAGES: Record<number, string> = {
  0: planetNeptune,
  1: planetUranus,
  2: planetSaturn,
  3: planetJupiter,
  4: planetMars,
  5: planetEarth,
  6: planetVenus,
  7: planetMercury,
  8: planetSun,
};

interface Props {
  onSelectPlanet: (id: number) => void;
}

const PlanetMap = ({ onSelectPlanet }: Props) => {
  const { currentPlayer, logout } = useGame();
  const [showShop, setShowShop] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  if (!currentPlayer) return null;

  const char = CHARACTERS.find(c => c.id === currentPlayer.characterId);
  const xpPercent = Math.min((currentPlayer.xp % 100), 100);

  return (
    <div className="min-h-screen relative p-4">
      {/* Top bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 bg-card/80 backdrop-blur-md border border-border rounded-2xl p-3 md:p-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{char?.emoji}</span>
          <div>
            <p className="font-bold text-foreground text-sm">{currentPlayer.name}</p>
            <p className="text-xs text-muted-foreground">{char?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-1 max-w-[200px]">
          <span className="text-xs text-muted-foreground">XP</span>
          <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${xpPercent}%` }} />
          </div>
          <span className="text-xs font-bold text-primary">{currentPlayer.xp}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-accent">🪙 {currentPlayer.gold}</span>
          <button onClick={() => { playSound('click'); setShowLeaderboard(true); }} className="text-sm px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-all">🏆</button>
          <button onClick={() => { playSound('click'); setShowShop(true); }} className="text-sm px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-all">🏪</button>
          <button onClick={() => { playSound('click'); logout(); }} className="text-sm px-3 py-1.5 rounded-lg bg-destructive/20 hover:bg-destructive/40 text-destructive transition-all">خروج</button>
        </div>
      </div>

      {/* Planets grid - large, scrollable */}
      <div className="relative z-10 grid grid-cols-2 md:grid-cols-3 gap-10 max-w-5xl mx-auto mt-8 pb-16">
        {PLANETS.map((planet, i) => {
          const unlocked = currentPlayer.unlockedPlanets.includes(planet.id);
          const delay = i * 0.3;
          return (
            <button
              key={planet.id}
              onClick={() => {
                if (unlocked) { playSound('click'); onSelectPlanet(planet.id); }
                else playSound('wrong');
              }}
              className={`relative flex flex-col items-center gap-3 p-6 rounded-2xl transition-all duration-300 ${
                unlocked ? 'hover:scale-110 cursor-pointer' : 'opacity-40 cursor-not-allowed'
              }`}
              style={{ animation: `planet-orbit 6s ease-in-out ${delay}s infinite` }}
            >
              <img
                src={PLANET_IMAGES[planet.id]}
                alt={planet.name}
                className="w-36 h-36 md:w-48 md:h-48 object-contain drop-shadow-[0_0_25px_rgba(100,150,255,0.3)]"
                style={{ filter: unlocked ? 'none' : 'grayscale(1)' }}
              />
              {!unlocked && <span className="absolute top-4 left-1/2 -translate-x-1/2 text-3xl">🔒</span>}
              <span className="text-base font-bold text-foreground">{planet.name}</span>
            </button>
          );
        })}
      </div>

      {showShop && <ShopModal onClose={() => setShowShop(false)} />}
      {showLeaderboard && <Leaderboard onClose={() => setShowLeaderboard(false)} />}
    </div>
  );
};

export default PlanetMap;
