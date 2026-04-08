import { PLANETS, CHARACTERS, playSound } from '@/lib/gameState';
import { useGame } from '@/context/GameContext';
import { useState } from 'react';
import ShopModal from './ShopModal';
import Leaderboard from './Leaderboard';

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

      {/* Planets grid */}
      <div className="relative z-10 grid grid-cols-3 md:grid-cols-5 gap-6 max-w-4xl mx-auto mt-8">
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
              className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-300 ${
                unlocked ? 'hover:scale-110 cursor-pointer' : 'opacity-50 cursor-not-allowed'
              }`}
              style={{ animation: `planet-orbit 6s ease-in-out ${delay}s infinite` }}
            >
              <span className="text-5xl md:text-6xl drop-shadow-lg" style={{ filter: unlocked ? 'none' : 'grayscale(1)' }}>
                {planet.emoji}
              </span>
              {!unlocked && <span className="absolute top-2 left-1/2 -translate-x-1/2 text-2xl">🔒</span>}
              <span className="text-sm font-bold text-foreground">{planet.name}</span>
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
