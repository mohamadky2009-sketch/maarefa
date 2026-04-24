import { useState, useEffect } from 'react';
import { useGame } from '@/context/GameContext';
import { playSound, PLANETS, CHARACTERS } from '@/lib/gameState';
import { PLANET_IMAGES } from '@/lib/constants';
import ShopModal from './ShopModal';
import Leaderboard from './Leaderboard';

// ==========================================
// مكون صورة البطل المتحركة بجانب الاسم
// ==========================================
const CharacterAvatar = ({ charId }: { charId: string }) => {
  const [frame, setFrame] = useState(0);
  const character = CHARACTERS.find(c => c.id === charId);
  
  // الساحر (hero1) = 6 فريمات | الأسطوري (hero3) = 8 فريمات
  const totalFrames = charId === 'hero3' ? 8 : 6;

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((prev) => (prev + 1) % totalFrames);
    }, 150);
    return () => clearInterval(timer);
  }, [totalFrames]);

  if (!character) return null;

  const positionX = (frame / (totalFrames - 1)) * 100;
  const imagePath = character.folder === 'hero3' 
    ? `/combat/${character.folder}/Sprites/Idle.png` 
    : `/combat/${character.folder}/Idle.png`;

  return (
    <div className="w-14 h-14 md:w-20 md:h-20 overflow-hidden relative border-2 border-blue-500/30 rounded-2xl bg-black/40 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
       <div 
          className="w-full h-full scale-[2.2]"
          style={{
            backgroundImage: `url('${imagePath}')`, 
            backgroundSize: `${totalFrames * 100}% 100%`, 
            backgroundPosition: `${positionX}% center`, 
            backgroundRepeat: 'no-repeat',
            imageRendering: 'pixelated'
          }}
        />
    </div>
  );
};

interface Props {
  onSelectPlanet: (id: number) => void;
}

const PlanetMap = ({ onSelectPlanet }: Props) => {
  const { currentPlayer, logout } = useGame();
  const [showShop, setShowShop] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [zoomingPlanet, setZoomingPlanet] = useState<number | null>(null);

  if (!currentPlayer) return null;
  const char = CHARACTERS.find(c => c.id === currentPlayer.characterId);
  const xpPercent = Math.min((currentPlayer.xp % 100), 100);

  const handlePlanetEnter = (planetId: number) => {
    playSound('click');
    setZoomingPlanet(planetId);
    
    setTimeout(() => {
      onSelectPlanet(planetId);
      setZoomingPlanet(null);
    }, 800);
  };

  const PHRASES = [
    "بداية الرحلة.. خطوتك الأولى نحو المعرفة",
    "استكشف أسرار هذا الكوكب الغامض",
    "تحديات شيقة بانتظارك هنا",
    "أنت تقترب من قمة المعرفة",
    "واصل تقدمك، المجد بانتظارك",
    "الكوكب الأخير.. أثبت جدارتك!",
    "أسرار الكون تتكشف أمامك",
    "مغامرة جديدة في أفق الفضاء"
  ];

  return (
    <div className="min-h-screen relative p-4 overflow-x-hidden bg-[#050812] z-40">
      
      {/* الشريط العلوي المحدث مع صورة الشخصية */}
      <div className="relative z-50 flex flex-wrap items-center gap-20 justify-between gap-3 bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-3xl p-3 md:p-4 mb-6 shadow-2xl">
        <div className="flex items-center gap-20 gap-4">
          {/* تم استبدال الإيموجي بالشخصية المتحركة */}
          <CharacterAvatar charId={currentPlayer.characterId} />
          <div>
            <p className="font-black text-white text-lg md:text-xl drop-shadow-lg">{currentPlayer.name}</p>
            <p className="text-xs md:text-sm text-blue-400 font-bold uppercase tracking-widest">{char?.name}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-20 gap-2 flex-1 max-w-[200px]">
          <span className="text-xs font-bold text-blue-200">XP</span>
          <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500" style={{ width: `${xpPercent}%` }} />
          </div>
          <span className="text-xs font-bold text-purple-300">{currentPlayer.xp}</span>
        </div>

        <div className="flex items-center gap-20 gap-2 md:gap-4">
          <span className="text-sm font-black text-yellow-400 flex items-center gap-20 gap-1 bg-black/30 px-3 py-1.5 rounded-lg border border-yellow-500/30">
            {currentPlayer.gold} 💰
          </span>
          <button onClick={() => { playSound('click'); setShowLeaderboard(true); }} className="text-base px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-300 transition-all hover:scale-105">🏆</button>
          <button onClick={() => { playSound('click'); setShowShop(true); }} className="text-base px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 text-purple-300 transition-all hover:scale-105">🏪</button>
          <button onClick={() => { playSound('click'); logout(); }} className="text-sm font-bold px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 text-red-400 transition-all hover:scale-105">خروج</button>
        </div>
      </div>

      {/* مسار الكواكب */}
      <div className="relative z-10 flex flex-col gap-6 items-center gap-20 gap-28 md:gap-40 max-w-4xl mx-auto mt-20 pb-10">
        
        {PLANETS.map((planet, index) => {
          const unlocked = currentPlayer.unlockedPlanets.includes(planet.id);
          const isLeft = index % 2 === 0;
          const delay = index * 0.3;
          const isZooming = zoomingPlanet === planet.id;
          const isSun = planet.name === 'الشمس';

          return (
            <div 
              key={planet.id} 
              className={`flex flex-col gap-6 items-center gap-20 w-full transition-all duration-700 ${
                isLeft ? 'pr-[30%] md:pr-[40%]' : 'pl-[30%] md:pl-[40%]'
              }`}
            >
              <button
                onClick={() => {
                  if (unlocked && !isZooming) handlePlanetEnter(planet.id);
                  else if (!unlocked) playSound('wrong');
                }}
                className={`relative flex flex-col gap-6 items-center gap-20 group transition-all ${
                  isZooming 
                    ? 'scale-[15] opacity-0 z-[100] pointer-events-none' 
                    : 'duration-500'
                } ${
                  unlocked && !isZooming ? 'hover:scale-110 cursor-pointer' : (!isZooming ? 'opacity-80 cursor-not-allowed' : '')
                }`}
                style={{
                  transitionDuration: isZooming ? '800ms' : undefined,
                  ...(!isZooming ? { animation: `planet-orbit 6s ease-in-out ${delay}s infinite` } : {}),
                }}
              >
                <div className="relative flex justify-between w-full max-w-4xl mx-auto px-10 items-center gap-20">
                  <div className={`absolute inset-0 rounded-full blur-[40px] transition-all duration-500 ${
                    unlocked ? 'bg-blue-500/30' : 'bg-transparent'
                  }`}></div>

                  <img
                    src={PLANET_IMAGES[planet.id]}
                    alt={planet.name}
                    className={`relative z-10 object-contain ${
                      isSun ? 'w-72 h-72 md:w-[350px] md:h-[350px]' : 'w-48 h-48 md:w-64 md:h-64'
                    } ${
                      unlocked ? 'animate-spin [animation-duration:30s]' : ''
                    }`}
                    style={{ 
                      filter: unlocked ? 'drop-shadow(0 0 25px rgba(100,200,255,0.5))' : 'grayscale(1)'
                    }}
                  />
                  
                  {!unlocked && (
                    <span className={`absolute z-20 drop-shadow-[0_0_15px_rgba(0,0,0,0.8)] ${isSun ? 'text-7xl' : 'text-5xl'}`}>
                      🔒
                    </span>
                  )}
                </div>

                <div className={`mt-4 flex flex-col gap-6 items-center gap-20 transition-opacity ${isZooming ? 'opacity-0' : 'opacity-100'}`}>
                  <span className={`font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] mb-1 ${
                    isSun ? 'text-4xl md:text-5xl text-yellow-400' : 'text-2xl md:text-3xl text-white'
                  }`}>
                    {planet.name}
                  </span>
                  <span className="text-xs md:text-sm font-bold text-blue-200 text-center max-w-[200px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                    {PHRASES[index % PHRASES.length]}
                  </span>
                </div>
              </button>
            </div>
          );
        })}

        {/* الرسالة الختامية */}
        <div className="relative z-20 mt-10 text-center p-8 md:p-10 max-w-3xl mx-4 mb-20 bg-slate-900/40 rounded-3xl backdrop-blur-sm border border-white/5">
          <p className="text-2xl md:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-100 to-orange-400 font-black mb-6 leading-relaxed drop-shadow-lg">
            لقد كانت رحلة مليئة بالمعرفة، شكراً لكم على زيارة لعبتي المتواضعة
          </p>
          <div className="h-px w-2/3 bg-gradient-to-r from-transparent via-yellow-500 to-transparent mx-auto mb-6"></div>
          <p className="text-xl md:text-2xl text-yellow-100 font-bold drop-shadow-md">
            كان معكم <br/>
            <span className="inline-block mt-4 text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 drop-shadow-lg">
              محمد احمد الكيلاني
            </span>
          </p>
        </div>

      </div>

      {showShop && <ShopModal onClose={() => setShowShop(false)} />}
      {showLeaderboard && <Leaderboard onClose={() => setShowLeaderboard(false)} />}
    </div>
  );
};

export default PlanetMap;
