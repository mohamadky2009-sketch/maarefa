import { useState, useEffect } from 'react';
import { GameProvider, useGame } from '@/context/GameContext';
import StarField from '@/components/StarField';
import EntryScreen from '@/components/EntryScreen';
import PlanetMap from '@/components/PlanetMap';
import IslandMap from '@/components/IslandMap';
import BattleScreen from '@/components/BattleScreen';
import AdminPanel from '@/components/AdminPanel';
import { ISLANDS, PLANETS } from '@/lib/gameState';

type Screen = 
  | { type: 'entry' }
  | { type: 'admin' }
  | { type: 'planets' }
  | { type: 'islands'; planetId: number }
  | { type: 'battle'; planetId: number; islandId: number };

const GameApp = () => {
  const { currentPlayer, updatePlayer } = useGame();
  const [screen, setScreen] = useState<Screen>({ type: 'entry' });

  useEffect(() => {
    if (currentPlayer && screen.type === 'entry') {
      setScreen({ type: 'planets' });
    }
  }, [currentPlayer, screen.type]);

  const handleVictory = (planetId: number, islandId: number) => {
    if (!currentPlayer) return;

    const currentPlanetIslands = ISLANDS.filter(is => is.planetId === planetId);
    const islandIndexInPlanet = currentPlanetIslands.findIndex(is => is.id === islandId);
    const isLastIslandInPlanet = islandIndexInPlanet === currentPlanetIslands.length - 1;

    let updatedPlanets = [...currentPlayer.unlockedPlanets];
    let updatedIslands = { ...currentPlayer.unlockedIslands };

    if (isLastIslandInPlanet) {
      const nextPlanetId = planetId + 1;
      if (nextPlanetId < PLANETS.length) {
        if (!updatedPlanets.includes(nextPlanetId)) {
          updatedPlanets.push(nextPlanetId);
          const firstIslandOfNextPlanet = ISLANDS.find(is => is.planetId === nextPlanetId);
          if (firstIslandOfNextPlanet) {
            updatedIslands[nextPlanetId] = [firstIslandOfNextPlanet.id];
          }
        }
        updatePlayer({
          ...currentPlayer,
          unlockedPlanets: updatedPlanets,
          unlockedIslands: updatedIslands,
          gold: currentPlayer.gold + 100,
          hp: currentPlayer.maxHp,
        });
        setScreen({ type: 'planets' });
      }
    } else {
      const nextIslandGlobalId = currentPlanetIslands[islandIndexInPlanet + 1].id;
      if (!updatedIslands[planetId].includes(nextIslandGlobalId)) {
        updatedIslands[planetId] = [...updatedIslands[planetId], nextIslandGlobalId];
      }
      updatePlayer({
        ...currentPlayer,
        unlockedIslands: updatedIslands,
        gold: currentPlayer.gold + 30,
        hp: currentPlayer.maxHp,
      });
      setScreen({ type: 'islands', planetId });
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-black text-white">
      {/* النجوم تظهر فقط في شاشة الدخول */}
      {screen.type === 'entry' && <StarField />}
      
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
          // إضافة onDefeat لحل المشكلة (يرجع اللاعب للخريطة عند الخسارة)
          onDefeat={() => {
            setScreen({ type: 'islands', planetId: screen.planetId });
          }}
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
