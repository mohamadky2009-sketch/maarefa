import { useState } from 'react';
import { GameProvider, useGame } from '@/context/GameContext';
import StarField from '@/components/StarField';
import EntryScreen from '@/components/EntryScreen';
import PlanetMap from '@/components/PlanetMap';
import IslandMap from '@/components/IslandMap';
import BattleScreen from '@/components/BattleScreen';
import AdminPanel from '@/components/AdminPanel';
import { ISLANDS } from '@/lib/gameState';

type Screen = 
  | { type: 'entry' }
  | { type: 'admin' }
  | { type: 'planets' }
  | { type: 'islands'; planetId: number }
  | { type: 'battle'; planetId: number; islandId: number };

const GameApp = () => {
  const { currentPlayer, updatePlayer } = useGame();
  const [screen, setScreen] = useState<Screen>({ type: 'entry' });

  // Auto-navigate if player is logged in
  if (currentPlayer && screen.type === 'entry') {
    setScreen({ type: 'planets' });
  }

  const handleVictory = (planetId: number, islandId: number) => {
    if (!currentPlayer) return;
    const nextIsland = islandId + 1;
    const updatedIslands = { ...currentPlayer.unlockedIslands };
    
    if (nextIsland < ISLANDS.length) {
      updatedIslands[planetId] = [...(updatedIslands[planetId] || []), nextIsland];
    }

    let updatedPlanets = [...currentPlayer.unlockedPlanets];
    if (nextIsland >= ISLANDS.length && !updatedPlanets.includes(planetId + 1) && planetId + 1 < 9) {
      updatedPlanets = [...updatedPlanets, planetId + 1];
      updatedIslands[planetId + 1] = [0];
    }

    updatePlayer({
      ...currentPlayer,
      unlockedIslands: updatedIslands,
      unlockedPlanets: updatedPlanets,
      hp: currentPlayer.maxHp,
    });

    if (nextIsland < ISLANDS.length) {
      setScreen({ type: 'islands', planetId });
    } else {
      setScreen({ type: 'planets' });
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <StarField />
      
      {screen.type === 'entry' && (
        <EntryScreen onAdmin={() => setScreen({ type: 'admin' })} />
      )}

      {screen.type === 'admin' && (
        <AdminPanel onBack={() => setScreen({ type: 'entry' })} />
      )}

      {screen.type === 'planets' && (
        <PlanetMap onSelectPlanet={(id) => setScreen({ type: 'islands', planetId: id })} />
      )}

      {screen.type === 'islands' && (
        <IslandMap
          planetId={screen.planetId}
          onSelectIsland={(id) => setScreen({ type: 'battle', planetId: screen.planetId, islandId: id })}
          onBack={() => setScreen({ type: 'planets' })}
        />
      )}

      {screen.type === 'battle' && (
        <BattleScreen
          planetId={screen.planetId}
          islandId={screen.islandId}
          onBack={() => setScreen({ type: 'islands', planetId: screen.planetId })}
          onVictory={() => handleVictory(screen.planetId, screen.islandId)}
        />
      )}
    </div>
  );
};

const Index = () => (
  <GameProvider>
    <GameApp />
  </GameProvider>
);

export default Index;
