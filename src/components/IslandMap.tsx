import { ISLANDS, PLANETS, playSound } from '@/lib/gameState';
import { useGame } from '@/context/GameContext';

interface Props {
  planetId: number;
  onSelectIsland: (islandId: number) => void;
  onBack: () => void;
}

const ISLAND_ICONS = ['🏝️','⚔️','🌋','🏔️','🌊','🌙','🌟','🔥','🌿','💎','🗡️','🛡️','🧿','⚡','🌈','🎯','🦅','🌀','🏰','🌺','🦋','🔮','🌙','🌊','🎪','🦁','🌸','🎭','🏺','🌠','🎆'];

const IslandMap = ({ planetId, onSelectIsland, onBack }: Props) => {
  const { currentPlayer, state } = useGame();
  if (!currentPlayer) return null;

  const planet = PLANETS.find(p => p.id === planetId);

  const allIslands = [...ISLANDS, ...state.customIslands]
    .filter(is => is.planetId === planetId)
    .sort((a, b) => a.id - b.id);

  const unlockedIslandIds: number[] = currentPlayer.unlockedIslands[planetId] ?? [allIslands[0]?.id ?? 0];

  const pColor = planet?.color ?? '#1e40af';

  return (
    <div
      className="min-h-screen relative p-4"
      style={{
        backgroundImage: planet ? `url(${planet.image})` : undefined,
        backgroundColor: '#0a0a1a',
        backgroundSize: '35%',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* dark overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at center, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.85) 100%)` }}
      />

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
            style={{ color: pColor, textShadow: `0 0 30px ${pColor}99` }}
          >
            جزر {planet?.name ?? ''}
          </h2>
        </div>

        {allIslands.length === 0 ? (
          <div className="text-center text-white/60 mt-24 text-xl">
            لا توجد جزر في هذا الكوكب بعد
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-8 md:gap-12 max-w-6xl mx-auto pb-16">
            {allIslands.map((island, i) => {
              const unlocked = unlockedIslandIds.includes(island.id);
              const completed  = unlocked && i < unlockedIslandIds.length - 1;
              const icon = ISLAND_ICONS[i % ISLAND_ICONS.length];

              return (
                <button
                  key={island.id}
                  onClick={() => {
                    if (unlocked) { playSound('click'); onSelectIsland(island.id); }
                    else playSound('wrong');
                  }}
                  className={`relative flex flex-col items-center group transition-all duration-500 ${
                    unlocked ? 'hover:scale-110 cursor-pointer' : 'opacity-50 cursor-not-allowed'
                  }`}
                  style={{ animationDelay: `${i * 0.15}s` }}
                  title={unlocked ? island.name : 'مقفلة — أكمل الجزيرة السابقة أولاً'}
                >
                  {/* Island card body */}
                  <div
                    className="relative w-36 h-36 md:w-44 md:h-44 rounded-3xl flex flex-col items-center justify-center shadow-2xl border-2 transition-all duration-300"
                    style={{
                      background: unlocked
                        ? `radial-gradient(135deg at 30% 30%, ${pColor}44 0%, ${pColor}22 60%, #0a0a1a 100%)`
                        : 'radial-gradient(135deg at 30% 30%, #33333366 0%, #1a1a1a 100%)',
                      borderColor: unlocked ? `${pColor}88` : '#ffffff22',
                      boxShadow: unlocked
                        ? `0 0 30px ${pColor}44, inset 0 0 20px ${pColor}11`
                        : 'none',
                    }}
                  >
                    {/* number badge */}
                    <span
                      className="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 shadow-lg"
                      style={{
                        background: unlocked ? pColor : '#444',
                        borderColor: unlocked ? `${pColor}cc` : '#666',
                        color: '#fff',
                      }}
                    >
                      {i + 1}
                    </span>

                    {/* completed badge */}
                    {completed && (
                      <span className="absolute -top-3 -left-3 text-2xl drop-shadow-lg">✅</span>
                    )}

                    {/* lock overlay */}
                    {!unlocked ? (
                      <span className="text-5xl">🔒</span>
                    ) : (
                      <>
                        <span className="text-5xl md:text-6xl mb-1 drop-shadow-lg">{icon}</span>
                        {/* mini terrain bumps */}
                        <div className="flex gap-1 mt-1">
                          {[...Array(3)].map((_, k) => (
                            <div
                              key={k}
                              className="rounded-full"
                              style={{
                                width: 8 + k * 4,
                                height: 6 + k * 2,
                                background: `${pColor}66`,
                              }}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Island name */}
                  <span
                    className="font-black text-white text-sm md:text-base mt-3 drop-shadow-[0_4px_6px_rgba(0,0,0,0.9)] px-4 py-1.5 rounded-full border backdrop-blur-sm text-center max-w-[170px]"
                    style={{
                      background: 'rgba(0,0,0,0.65)',
                      borderColor: unlocked ? `${pColor}55` : '#ffffff11',
                    }}
                  >
                    {island.name}
                  </span>

                  {/* Question preview */}
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
