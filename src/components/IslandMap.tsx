import { ISLANDS, PLANETS, playSound } from '@/lib/gameState';
import { useGame } from '@/context/GameContext';

interface Props {
  planetId: number;
  onSelectIsland: (islandId: number) => void;
  onBack: () => void;
}

const IslandMap = ({ planetId, onSelectIsland, onBack }: Props) => {
  const { currentPlayer, state } = useGame();
  if (!currentPlayer) return null;

  const planet = PLANETS.find(p => p.id === planetId);

  const allIslands = [...ISLANDS, ...(state.customIslands ?? [])]
    .filter(is => is.planetId === planetId)
    .sort((a, b) => a.id - b.id);

  const unlockedIslandIds: number[] = currentPlayer.unlockedIslands[planetId] ?? [allIslands[0]?.id ?? 0];

  const pColor = planet?.color ?? '#1e40af';

  return (
    <div
      className="min-h-screen relative overflow-x-hidden"
      style={{
        backgroundImage: planet ? `url(${planet.image})` : undefined,
        backgroundColor: '#060612',
        backgroundSize: '30%',
        backgroundPosition: 'center 20%',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Starry dark overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, rgba(3,3,18,0.92) 100%)',
        }}
      />

      {/* Glowing planet-color ambient light */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 20%, ${pColor}18 0%, transparent 60%)`,
        }}
      />

      <div className="relative z-10 pb-16">
        {/* ── Header ── */}
        <div className="flex items-center gap-4 p-4 md:p-6">
          <button
            onClick={() => { playSound('click'); onBack(); }}
            className="px-4 py-2.5 rounded-xl bg-black/60 hover:bg-black/80 text-white font-bold transition-all border border-white/10 shadow-lg backdrop-blur-sm text-sm"
          >
            ← الكواكب
          </button>
          <h2
            className="text-2xl md:text-4xl font-black text-white drop-shadow-lg"
            style={{ color: pColor, textShadow: `0 0 30px ${pColor}bb` }}
          >
            جزر {planet?.name ?? ''}
          </h2>
        </div>

        {allIslands.length === 0 ? (
          <div className="text-center text-white/50 mt-32 text-xl">
            لا توجد جزر في هذا الكوكب بعد
          </div>
        ) : (
          <div className="flex flex-col items-center gap-0 px-4 mt-4">
            {allIslands.map((island, i) => {
              const unlocked  = unlockedIslandIds.includes(island.id);
              const completed = unlocked && i < unlockedIslandIds.length - 1;

              // Zig-zag: alternate right / center / left
              const zigzagOffsets = ['translateX(35%)', 'translateX(0%)', 'translateX(-35%)'];
              const offset = zigzagOffsets[i % 3];

              // island images are 1-indexed
              const imgUrl = `/src/assets/combat/monster4/islands/island${island.id + 1}.png`;

              return (
                <div
                  key={island.id}
                  className="relative flex flex-col items-center"
                  style={{ transform: offset, marginBottom: '-16px' }}
                >
                  {/* Connecting path dot (not on first) */}
                  {i > 0 && (
                    <div
                      className="w-1.5 h-10 rounded-full mb-1 opacity-40"
                      style={{ background: pColor }}
                    />
                  )}

                  <button
                    onClick={() => {
                      if (unlocked) { playSound('click'); onSelectIsland(island.id); }
                      else playSound('wrong');
                    }}
                    className={`relative group transition-all duration-300 ${
                      unlocked
                        ? 'hover:scale-110 cursor-pointer active:scale-95'
                        : 'opacity-45 cursor-not-allowed grayscale'
                    }`}
                    title={unlocked ? island.name : 'مقفلة — أكمل الجزيرة السابقة أولاً'}
                  >
                    {/* Glow ring for unlocked */}
                    {unlocked && (
                      <div
                        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md"
                        style={{ background: `${pColor}55` }}
                      />
                    )}

                    {/* Island image */}
                    <div className="relative w-36 h-36 md:w-44 md:h-44 rounded-2xl overflow-hidden border-2 shadow-2xl"
                      style={{ borderColor: unlocked ? `${pColor}99` : '#ffffff22' }}
                    >
                      <img
                        src={imgUrl}
                        alt={island.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const el = e.currentTarget as HTMLImageElement;
                          el.style.display = 'none';
                          const parent = el.parentElement;
                          if (parent) {
                            parent.style.background = `radial-gradient(135deg, ${pColor}44, #0a0a1a)`;
                          }
                        }}
                      />

                      {/* Dark overlay on image */}
                      <div className="absolute inset-0 bg-black/20" />

                      {/* Lock icon */}
                      {!unlocked && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <span className="text-4xl">🔒</span>
                        </div>
                      )}

                      {/* Completed checkmark */}
                      {completed && (
                        <div className="absolute top-2 right-2 text-2xl drop-shadow-lg">✅</div>
                      )}

                      {/* Number badge */}
                      <div
                        className="absolute bottom-2 left-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shadow-lg border"
                        style={{
                          background: unlocked ? pColor : '#444',
                          borderColor: '#ffffff44',
                          color: '#fff',
                        }}
                      >
                        {i + 1}
                      </div>
                    </div>

                    {/* Island name label */}
                    <div
                      className="mt-2 px-3 py-1 rounded-full text-center text-xs md:text-sm font-black text-white shadow-lg border backdrop-blur-sm"
                      style={{
                        background: 'rgba(0,0,0,0.75)',
                        borderColor: unlocked ? `${pColor}55` : '#ffffff11',
                        maxWidth: '160px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {island.name}
                    </div>

                    {/* Question preview (unlocked only) */}
                    {unlocked && (
                      <p className="mt-0.5 text-[9px] text-white/40 max-w-[150px] text-center line-clamp-2 leading-tight">
                        {island.question.text}
                      </p>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default IslandMap;
