import { ISLANDS, playSound } from '@/lib/gameState';
import { useGame } from '@/context/GameContext';
import islandsBg from '@/assets/islands-bg.png';
import island1 from '@/assets/island1.png';
import island2 from '@/assets/island2.png';
import island3 from '@/assets/island3.png';
import island4 from '@/assets/island4.png';
import island5 from '@/assets/island5.png';

const ISLAND_IMAGES = [island1, island2, island3, island4, island5];

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
    <div className="min-h-screen relative p-4" style={{ backgroundImage: `url(${islandsBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="relative z-10">
        <button onClick={() => { playSound('click'); onBack(); }}
          className="mb-6 px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold transition-all">
          → العودة للكواكب
        </button>

        <h2 className="text-2xl font-bold text-center text-foreground mb-8">جزر الكوكب</h2>

        <div className="flex flex-wrap justify-center gap-8 max-w-5xl mx-auto pb-16">
          {ISLANDS.map((island, i) => {
            const unlocked = unlockedIslands.includes(island.id);
            return (
              <button
                key={island.id}
                onClick={() => {
                  if (unlocked) { playSound('click'); onSelectIsland(island.id); }
                  else playSound('wrong');
                }}
                className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-300 ${
                  unlocked
                    ? 'border-primary/50 bg-primary/5 hover:scale-105 cursor-pointer animate-float-slow'
                    : 'border-border bg-card/50 opacity-50 cursor-not-allowed grayscale'
                }`}
                style={{ animationDelay: `${i * 0.5}s` }}
              >
                <img
                  src={ISLAND_IMAGES[i]}
                  alt={island.name}
                  className="w-40 h-36 md:w-52 md:h-48 object-contain drop-shadow-2xl"
                />
                {!unlocked && <span className="absolute top-2 left-1/2 -translate-x-1/2 text-2xl">🔒</span>}
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
