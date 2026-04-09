import { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { playSound, PLANETS, CHARACTERS } from '@/lib/gameState';
import { PLANET_IMAGES } from '@/lib/constants';
import ShopModal from './ShopModal';
import Leaderboard from './Leaderboard';
import goldBagsImg from '@/assets/gold-bags.png';

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
    <div className="min-h-screen relative p-4 overflow-x-hidden">
      {/* الشريط العلوي */}
      <div className="relative z-40 flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-2xl p-3 md:p-4 mb-6 shadow-xl">
        <div className="flex items-center gap-3">
          <span className="text-3xl drop-shadow-md">{char?.emoji}</span>
          <div>
            <p className="font-black text-white text-base md:text-lg">{currentPlayer.name}</p>
            <p className="text-xs md:text-sm text-blue-300 font-bold">{char?.name}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-1 max-w-[200px]">
          <span className="text-xs font-bold text-blue-200">XP</span>
          <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500" style={{ width: `${xpPercent}%` }} />
          </div>
          <span className="text-xs font-bold text-purple-300">{currentPlayer.xp}</span>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <span className="text-sm font-black text-yellow-400 flex items-center gap-1 bg-black/30 px-3 py-1.5 rounded-lg border border-yellow-500/30">
            {currentPlayer.gold} 💰
          </span>
          <button onClick={() => { playSound('click'); setShowLeaderboard(true); }} className="text-base px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-300 transition-all hover:scale-105">🏆</button>
          <button onClick={() => { playSound('click'); setShowShop(true); }} className="text-base px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 text-purple-300 transition-all hover:scale-105">🏪</button>
          <button onClick={() => { playSound('click'); logout(); }} className="text-sm font-bold px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 text-red-400 transition-all hover:scale-105">خروج</button>
        </div>
      </div>

      {/* مسار الكواكب المتعرج (نبتون في الأعلى) */}
      <div className="relative z-10 flex flex-col items-center gap-28 md:gap-40 max-w-4xl mx-auto mt-20 pb-10">
        
        {PLANETS.map((planet, index) => {
          const unlocked = currentPlayer.unlockedPlanets.includes(planet.id);
          const isLeft = index % 2 === 0;
          const delay = index * 0.3;
          const isZooming = zoomingPlanet === planet.id;

          return (
            <div 
              key={planet.id} 
              className={`flex flex-col items-center w-full transition-all duration-700 ${
                isLeft ? 'pr-[30%] md:pr-[40%]' : 'pl-[30%] md:pl-[40%]'
              }`}
            >
              <button
                onClick={() => {
                  if (unlocked && !isZooming) handlePlanetEnter(planet.id);
                  else if (!unlocked) playSound('wrong');
                }}
                className={`relative flex flex-col items-center group transition-all ${
                  isZooming 
                    ? 'duration-[800ms] scale-[15] opacity-0 z-[100] pointer-events-none' 
                    : 'duration-500'
                } ${
                  unlocked && !isZooming ? 'hover:scale-110 cursor-pointer' : (!isZooming ? 'opacity-70 cursor-not-allowed' : '')
                }`}
                style={!isZooming ? { animation: `planet-orbit 6s ease-in-out ${delay}s infinite` } : {}}
              >
                {/* الكوكب مع التوهج والدوران */}
                <div className="relative flex justify-center items-center">
                  <div className={`absolute inset-0 rounded-full blur-[40px] transition-all duration-500 ${
                    unlocked ? 'bg-blue-500/30' : 'bg-transparent'
                  }`}></div>

                  {/* تفعيل الدوران البطيء (animate-spin) للكوكب المفتوح */}
                  <img
                    src={PLANET_IMAGES[planet.id]}
                    alt={planet.name}
                    className={`relative z-10 w-48 h-48 md:w-64 md:h-64 object-contain ${
                      unlocked ? 'animate-spin [animation-duration:30s]' : ''
                    }`}
                    style={{ 
                      filter: unlocked ? 'drop-shadow(0 0 25px rgba(100,200,255,0.5))' : 'grayscale(1)'
                    }}
                  />
                  
                  {!unlocked && (
                    <span className="absolute z-20 text-5xl drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]">
                      🔒
                    </span>
                  )}
                </div>

                {/* اسم الكوكب والعبارة (بدون خلفية مربعة مزعجة) */}
                <div className={`mt-4 flex flex-col items-center transition-opacity ${isZooming ? 'opacity-0' : 'opacity-100'}`}>
                  <span className="text-2xl md:text-3xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] mb-1">
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

        {/* الرسالة الختامية باسمك (تظهر في أسفل الصفحة بعد آخر كوكب مباشرة) */}
        <div className="relative z-20 mt-10 text-center p-8 md:p-10 max-w-3xl mx-4 mb-20">
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
