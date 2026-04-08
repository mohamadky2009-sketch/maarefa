import { ISLANDS, playSound } from '@/lib/gameState';
import { useGame } from '@/context/GameContext';

interface Props {
  planetId: number;
  onSelectIsland: (id: number) => void;
  onBack: () => void;
}

const IslandMap = ({ planetId, onSelectIsland, onBack }: Props) => {
  const { currentPlayer } = useGame();
  if (!currentPlayer) return null;

  const unlockedIslands = currentPlayer.unlockedIslands[planetId] || [0];

  return (
    <div className="min-h-screen relative p-4">
      <div className="relative z-10">
        <button onClick={() => { playSound('click'); onBack(); }}
          className="mb-6 px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold transition-all">
          → العودة للكواكب
        </button>

        <h2 className="text-2xl font-bold text-center text-foreground mb-8">جزر الكوكب</h2>

        <div className="flex flex-wrap justify-center gap-6 max-w-3xl mx-auto">
          {ISLANDS.map((island, i) => {
            const unlocked = unlockedIslands.includes(island.id);
            return (
              <button
                key={island.id}
                onClick={() => {
                  if (unlocked) { playSound('click'); onSelectIsland(island.id); }
                  else playSound('wrong');
                }}
                className={`relative flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all duration-300 ${
                  unlocked
                    ? 'border-primary bg-primary/10 hover:scale-105 cursor-pointer animate-float-slow'
                    : 'border-border bg-card/50 opacity-50 cursor-not-allowed'
                }`}
                style={{ animationDelay: `${i * 0.5}s` }}
              >
                <span className="text-5xl">{island.emoji}</span>
                {!unlocked && <span className="absolute top-2 text-xl">🔒</span>}
                <span className="font-bold text-foreground text-sm">{island.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default IslandMap;
