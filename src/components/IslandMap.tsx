import { ISLANDS, playSound } from '@/lib/gameState';
import { useGame } from '@/context/GameContext';

const islandsBg = '/src/assets/islands/islands-bg.png';

const getIslandImage = (index: number) =>
  `/src/assets/islands/island${(index % 31) + 1}.png`;

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
          className="mb-6 px-4 py-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-white font-bold transition-all border border-slate-700 shadow-lg backdrop-blur-sm">
          → العودة للكواكب
        </button>

        {/* تم تكبير عنوان الصفحة وإضافة ظل له */}
        <h2 className="text-4xl md:text-5xl font-black text-center text-white mb-12 drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]">
          جزر الكوكب
        </h2>

        {/* زيادة المسافة بين الجزر لتناسب الحجم الجديد */}
        <div className="flex flex-wrap justify-center gap-12 md:gap-16 max-w-6xl mx-auto pb-16">
          {ISLANDS.map((island, i) => {
            const unlocked = unlockedIslands.includes(island.id);
            return (
              <button
                key={island.id}
                onClick={() => {
                  if (unlocked) { playSound('click'); onSelectIsland(island.id); }
                  else playSound('wrong');
                }}
                // إزالة المربعات والحدود تماماً، والاعتماد فقط على تأثير الطفو والتكبير
                className={`relative flex flex-col items-center group transition-all duration-500 ${
                  unlocked
                    ? 'hover:scale-110 cursor-pointer animate-float-slow'
                    : 'opacity-60 cursor-not-allowed grayscale'
                }`}
                style={{ animationDelay: `${i * 0.5}s` }}
              >
                {/* تكبير حجم الجزر بشكل ملحوظ هنا */}
                <img
                  src={getIslandImage(i)}
                  alt={island.name}
                  className="w-60 h-60 md:w-80 md:h-80 object-contain drop-shadow-[0_15px_25px_rgba(0,0,0,0.5)] transition-transform duration-300 group-hover:drop-shadow-[0_20px_35px_rgba(0,0,0,0.7)]"
                />
                
                {/* تعديل مكان وحجم القفل */}
                {!unlocked && <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl drop-shadow-[0_0_15px_rgba(0,0,0,0.8)] z-20">🔒</span>}
                
                {/* تجميل اسم الجزيرة وتكبيره مع إضافة ظل قوي ليبرز فوق السماء */}
                <span className="font-black text-white text-xl md:text-2xl mt-4 drop-shadow-[0_4px_6px_rgba(0,0,0,0.9)] bg-black/40 px-6 py-2 rounded-full border border-white/10 backdrop-blur-sm">
                  {island.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default IslandMap;
