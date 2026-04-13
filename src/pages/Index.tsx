import { useState, useEffect } from 'react';
import { GameProvider, useGame } from '@/context/GameContext';
import StarField from '@/components/StarField';
import EntryScreen from '@/components/EntryScreen';
import PlanetMap from '@/components/PlanetMap';
import IslandMap from '@/components/IslandMap';
import BattleScreen from '@/components/BattleScreen';
import AdminPanel from '@/components/AdminPanel';
import AdminLoginModal from '@/components/AdminLoginModal';
import { ISLANDS, PLANETS } from '@/lib/gameState';

type Screen =
  | { type: 'entry' }
  | { type: 'scroll' }
  | { type: 'admin' }
  | { type: 'planets' }
  | { type: 'islands'; planetId: number }
  | { type: 'battle'; planetId: number; islandId: number };

const GameApp = () => {
  const { currentPlayer, updatePlayer } = useGame();
  const [screen, setScreen] = useState<Screen>({ type: 'entry' });
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  // Auto-advance past entry for already-logged-in players
  useEffect(() => {
    if (currentPlayer && screen.type === 'entry') {
      setScreen({ type: 'planets' });
    }
  }, [currentPlayer, screen.type]);

  const goHome = () => setScreen({ type: 'scroll' });

  const handleVictory = (planetId: number, islandId: number) => {
    if (!currentPlayer) return;
    const currentPlanetIslands = ISLANDS.filter(is => is.planetId === planetId);
    const islandIndexInPlanet  = currentPlanetIslands.findIndex(is => is.id === islandId);
    const isLastIsland         = islandIndexInPlanet === currentPlanetIslands.length - 1;

    let updatedPlanets = [...currentPlayer.unlockedPlanets];
    let updatedIslands = { ...currentPlayer.unlockedIslands };

    if (isLastIsland) {
      const nextPlanetId = planetId + 1;
      if (nextPlanetId < PLANETS.length) {
        if (!updatedPlanets.includes(nextPlanetId)) {
          updatedPlanets.push(nextPlanetId);
          const firstIsland = ISLANDS.find(is => is.planetId === nextPlanetId);
          if (firstIsland) updatedIslands[nextPlanetId] = [firstIsland.id];
        }
        updatePlayer({ ...currentPlayer, unlockedPlanets: updatedPlanets, unlockedIslands: updatedIslands, gold: currentPlayer.gold + 100, hp: currentPlayer.maxHp });
        setScreen({ type: 'planets' });
      }
    } else {
      const nextIslandId = currentPlanetIslands[islandIndexInPlanet + 1].id;
      if (!updatedIslands[planetId].includes(nextIslandId))
        updatedIslands[planetId] = [...updatedIslands[planetId], nextIslandId];
      updatePlayer({ ...currentPlayer, unlockedIslands: updatedIslands, gold: currentPlayer.gold + 30, hp: currentPlayer.maxHp });
      setScreen({ type: 'islands', planetId });
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-black text-white">
      {(screen.type === 'entry' || screen.type === 'scroll') && <StarField />}

      {/* First-time entry (registration) */}
      {screen.type === 'entry' && (
        <EntryScreen onAdmin={() => setShowAdminLogin(true)} />
      )}

      {/* Returning player — scroll home screen */}
      {screen.type === 'scroll' && (
        <EntryScreen
          loggedIn
          onAdmin={() => setShowAdminLogin(true)}
          onPlay={() => setScreen({ type: 'planets' })}
        />
      )}

      {screen.type === 'admin' && (
        <AdminPanel onBack={() => setScreen({ type: 'entry' })} />
      )}

      {/* Admin password gate — shown over any screen */}
      {showAdminLogin && (
        <AdminLoginModal
          onClose={() => setShowAdminLogin(false)}
          onSuccess={() => { setShowAdminLogin(false); setScreen({ type: 'admin' }); }}
        />
      )}

      {screen.type === 'planets' && (
        <PlanetMap onSelectPlanet={id => setScreen({ type: 'islands', planetId: id })} />
      )}

      {screen.type === 'islands' && (
        <IslandMap
          planetId={screen.planetId}
          onSelectIsland={id => setScreen({ type: 'battle', planetId: screen.planetId, islandId: id })}
          onBack={goHome}          /* ← Island Map back → Home Scroll */
        />
      )}

      {screen.type === 'battle' && (
        <BattleScreen
          planetId={screen.planetId}
          islandId={screen.islandId}
          onBack={goHome}          /* ← Battle exit → Home Scroll */
          onVictory={() => handleVictory(screen.planetId, screen.islandId)}
          onDefeat={goHome}        /* ← Defeat → Home Scroll */
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
