import { ISLANDS, PLANETS, playSound } from '@/lib/gameState';
import { useGame } from '@/context/GameContext';

const islandsBg = '/src/assets/islands/islands-bg.png';

interface Props {
  planetId: number;
  onSelectIsland: (islandId: number) => void;
  onBack: () => void;
}

const IslandMap = ({ planetId, onSelectIsland, onBack }: Props) => {
  const { currentPlayer, state } = useGame();
  if (!currentPlayer) return null;

  const planet = PLANETS.find(p => p.id === planetId);

  // Merge static islands with admin-added custom islands, filter by planet
  const allIslands = [...ISLANDS, ...state.customIslands]
    .filter(is => is.planetId === planetId)
    .sort((a, b) => a.id - b.id);

  const unlockedIslandIds: number[] = currentPlayer.unlockedIslands[planetId] ?? [allIslands[0]?.id ?? 0];

  return (
    <div
      className="min-h-screen relative p-4"
      style={{ backgroundImage: `url(${islandsBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/30 pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => { playSound('click'); onBack(); }}
            className="px-4 py-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-white font-bold transition-all border border-slate-700 shadow-lg backdrop-blur-sm"
          >
            ← الكواكب
          </button>
          <h2
            className="text-3xl md:text-4xl font-black text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]"
            style={{ color: planet?.color ?? '#fff', textShadow: `0 0 20px ${planet?.color ?? '#fff'}66` }}
          >
            جزر {planet?.name ?? ''}
          </h2>
        </div>

        {/* Islands grid */}
        {allIslands.length === 0 ? (
          <div className="text-center text-white/60 mt-24 text-xl">
            لا توجد جزر في هذا الكوكب بعد
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-10 md:gap-14 max-w-6xl mx-auto pb-16">
            {allIslands.map((island, i) => {
              const unlocked = unlockedIslandIds.includes(island.id);
              return (
                <button
                  key={island.id}
                  onClick={() => {
                    if (unlocked) { playSound('click'); onSelectIsland(island.id); }
                    else playSound('wrong');
                  }}
                  className={`relative flex flex-col items-center group transition-all duration-500 ${
                    unlocked
                      ? 'hover:scale-110 cursor-pointer'
                      : 'opacity-50 cursor-not-allowed grayscale'
                  }`}
                  style={{ animationDelay: `${i * 0.4}s` }}
                  title={unlocked ? island.name : 'مقفلة — أكمل الجزيرة السابقة أولاً'}
                >
                  <div className="relative">
                    <img
                      src={island.image}
                      alt={island.name}
                      className="w-48 h-48 md:w-64 md:h-64 object-contain drop-shadow-[0_15px_25px_rgba(0,0,0,0.6)] transition-all duration-300 group-hover:drop-shadow-[0_20px_35px_rgba(0,0,0,0.8)]"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    {/* Lock overlay */}
                    {!unlocked && (
                      <span className="absolute inset-0 flex items-center justify-center text-5xl">
                        🔒
                      </span>
                    )}
                    {/* Completed indicator */}
                    {unlocked && i < unlockedIslandIds.length - 1 && (
                      <span className="absolute -top-2 -right-2 text-2xl">✅</span>
                    )}
                  </div>

                  <span className="font-black text-white text-lg md:text-xl mt-3 drop-shadow-[0_4px_6px_rgba(0,0,0,0.9)] bg-black/50 px-5 py-1.5 rounded-full border border-white/10 backdrop-blur-sm">
                    {island.name}
                  </span>

                  {/* Island question preview */}
                  {unlocked && (
                    <span className="mt-1 text-[10px] text-white/50 max-w-[160px] text-center leading-tight line-clamp-2">
                      {island.question.text}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default IslandMap;
