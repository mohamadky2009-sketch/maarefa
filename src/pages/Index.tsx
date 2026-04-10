import { useState, useEffect } from 'react';
import { GameProvider, useGame } from '@/context/GameContext';
import StarField from '@/components/StarField';
import EntryScreen from '@/components/EntryScreen';
import PlanetMap from '@/components/PlanetMap';
import IslandMap from '@/components/IslandMap';
import BattleScreen from '@/components/BattleScreen';
import AdminPanel from '@/components/AdminPanel';
import { ISLANDS, PLANETS, playSound } from '@/lib/gameState';

type Screen =
  | { type: 'entry' }
  | { type: 'admin' }
  | { type: 'planets' }
  | { type: 'islands'; planetId: number }
  | { type: 'battle'; planetId: number; islandId: number };

const GameApp = () => {
  const { currentPlayer, updatePlayer, state } = useGame();
  const [screen, setScreen] = useState<Screen>({ type: 'entry' });

  // Auto-advance to planets map if player already exists
  useEffect(() => {
    if (currentPlayer && screen.type === 'entry') {
      setScreen({ type: 'planets' });
    }
  }, [currentPlayer]);

  // ----------------------------------------------------------------
  // Victory handler
  // ----------------------------------------------------------------
  const handleVictory = (planetId: number, islandId: number) => {
    if (!currentPlayer) return;

    playSound('victory');

    // Collect all islands for this planet (static + admin-added)
    const allIslands = [...ISLANDS, ...state.customIslands];
    const planetIslands = allIslands
      .filter(is => is.planetId === planetId)
      .sort((a, b) => a.id - b.id);

    const islandIndexInPlanet = planetIslands.findIndex(is => is.id === islandId);
    const isLastIsland = islandIndexInPlanet === planetIslands.length - 1;

    let updatedPlanets = [...currentPlayer.unlockedPlanets];
    let updatedIslands = { ...currentPlayer.unlockedIslands };

    if (isLastIsland) {
      // Planet completed — unlock the next planet
      const nextPlanetId = planetId + 1;

      if (nextPlanetId < PLANETS.length) {
        if (!updatedPlanets.includes(nextPlanetId)) {
          updatedPlanets.push(nextPlanetId);
          const firstOfNext = allIslands
            .filter(is => is.planetId === nextPlanetId)
            .sort((a, b) => a.id - b.id)[0];
          if (firstOfNext) {
            updatedIslands[nextPlanetId] = [firstOfNext.id];
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
      } else {
        // Final planet (Sun) completed — game won!
        alert('تهانينا! لقد أنقذتَ المجرة ووصلتَ إلى قلب الشمس! 🌟');
        updatePlayer({ ...currentPlayer, gold: currentPlayer.gold + 500, hp: currentPlayer.maxHp });
        setScreen({ type: 'planets' });
      }
    } else {
      // Unlock the next island in the same planet
      const nextIsland = planetIslands[islandIndexInPlanet + 1];
      const currentUnlocked = updatedIslands[planetId] ?? [];

      if (!currentUnlocked.includes(nextIsland.id)) {
        updatedIslands[planetId] = [...currentUnlocked, nextIsland.id];
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

  // ----------------------------------------------------------------
  // Defeat handler
  // ----------------------------------------------------------------
  const handleDefeat = (planetId: number) => {
    if (!currentPlayer) return;
    updatePlayer({ ...currentPlayer, hp: Math.max(0, currentPlayer.hp - 25) });
    setScreen({ type: 'islands', planetId });
  };

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------
  return (
    <div className="min-h-screen relative overflow-hidden bg-black text-white">
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
          onVictory={() => handleVictory(screen.planetId, screen.islandId)}
          onDefeat={() => handleDefeat(screen.planetId)}
          onBack={() => setScreen({ type: 'islands', planetId: screen.planetId })}
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
