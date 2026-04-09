import { useState } from 'react';
import { useGame } from '@/lib/gameState';
import { playSound } from '@/lib/gameState';
import { PLANETS, PLANET_IMAGES, CHARACTERS } from '@/lib/constants';
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
  
  // حالة جديدة للتحكم بتأثير التكبير (الزوم) عند الدخول للكوكب
  const [zoomingPlanet, setZoomingPlanet] = useState<number | null>(null);

  if (!currentPlayer) return null;
  const char = CHARACTERS.find(c => c.id === currentPlayer.characterId);
  const xpPercent = Math.min((currentPlayer.xp % 100), 100);

  // دالة الدخول للكوكب مع تأثير الزوم
  const handlePlanetEnter = (planetId: number) => {
    playSound('click');
    setZoomingPlanet(planetId);
    
    // الانتظار ثانية واحدة حتى ينتهي تأثير التكبير، ثم فتح صفحة الجزر
    setTimeout(() => {
      onSelectPlanet(planetId);
      setZoomingPlanet(null); // إعادة الضبط
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

      {/* مسار الكواكب المتعرج من الأعلى (الأبعد) إلى الأسفل (الأقرب) */}
      <div className="relative z-10 flex flex-col items-center gap-28 md:gap-40 max-w-4xl mx-auto mt-20 pb-32">
        
        {PLANETS.slice().reverse().map((planet, index) => {
          const originalIndex = PLANETS.length - 1 - index;
          const unlocked = currentPlayer.unlockedPlanets.includes(planet.id);
          const isLeft = index % 2 === 0;
          const delay = index * 0.3;
          
          // هل هذا الكوكب هو الذي يتم الضغط عليه الآن لعمل الزوم؟
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
                // تأثير الزوم الخرافي عند الضغط: الكوكب يكبر 15 ضعف ويختفي تدريجياً
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
                  {/* توهج خلفي للكوكب المفتوح */}
                  <div className={`absolute inset-0 rounded-full blur-[40px] transition-all duration-500 ${
                    unlocked ? 'bg-blue-500/50' : 'bg-transparent'
                  }`}></div>

                  <img
                    src={PLANET_IMAGES[planet.id]}
                    alt={planet.name}
                    className="relative z-10 w-48 h-48 md:w-64 md:h-64 object-contain"
                    style={{ 
                      filter: unlocked ? 'drop-shadow(0 0 35px rgba(100,200,255,0.7))' : 'grayscale(1)',
                      // الكوكب يلف حول نفسه إذا كان مفتوحاً
                      animation: unlocked ? 'spin 25s linear infinite' : 'none'
                    }}
                  />
                  
                  {/* قفل على الكواكب المغلقة */}
                  {!unlocked && (
                    <span className="absolute z-20 text-5xl drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]">
                      🔒
                    </span>
                  )}
                </div>

                {/* اسم الكوكب والعبارة (تختفي أثناء الزوم لتنظيف الشاشة) */}
                <div className={`mt-6 flex flex-col items-center bg-black/60 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.6)] transition-opacity ${isZooming ? 'opacity-0' : 'opacity-100'}`}>
                  <span className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-blue-200 drop-shadow-md mb-2">
                    {planet.name}
                  </span>
                  <span className="text-xs md:text-sm font-bold text-blue-300 text-center max-w-[200px]">
                    {PHRASES[originalIndex % PHRASES.length]}
                  </span>
                </div>
              </button>
            </div>
          );
        })}

        {/* الشمس العملاقة والرسالة الختامية باسمك */}
        <div className="relative flex flex-col items-center justify-center mt-32 w-full pt-20">
          {/* توهج الشمس الخلفي */}
          <div className="absolute top-0 w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-gradient-to-r from-orange-600 via-yellow-500 to-yellow-300 rounded-full blur-[100px] animate-pulse z-0" style={{ animationDuration: '4s' }}></div>

          {/* جسم الشمس المضيء */}
          <div className="relative z-10 w-64 h-64 md:w-96 md:h-96 bg-gradient-to-br from-yellow-100 via-yellow-500 to-orange-600 rounded-full flex items-center justify-center border-4 border-yellow-300/60 shadow-[inset_0_0_80px_rgba(255,100,0,0.9),0_0_100px_rgba(255,200,0,1)]">
            <span className="text-4xl md:text-6xl font-black text-orange-900/50 drop-shadow-md">الشمس</span>
          </div>

          {/* الرسالة الختامية لمحمد الكيلاني */}
          <div className="relative z-20 mt-16 text-center bg-black/70 p-8 md:p-10 rounded-3xl border border-yellow-500/40 backdrop-blur-xl max-w-3xl drop-shadow-[0_0_40px_rgba(255,150,0,0.2)] mx-4">
            <p className="text-2xl md:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-100 to-orange-400 font-black mb-6 leading-relaxed">
              لقد كانت رحلة مليئة بالمعرفة، شكراً لكم على زيارة لعبتي المتواضعة
            </p>
            <div className="h-px w-2/3 bg-gradient-to-r from-transparent via-yellow-500 to-transparent mx-auto mb-6"></div>
            <p className="text-xl md:text-2xl text-yellow-100 font-bold">
        كان معكم <br/>
              <span className="inline-block mt-4 text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 drop-shadow-lg">
                محمد احمد الكيلاني
              </span>
            </p>
          </div>
        </div>

      </div>

      {showShop && <ShopModal onClose={() => setShowShop(false)} />}
      {showLeaderboard && <Leaderboard onClose={() => setShowLeaderboard(false)} />}
    </div>
  );
};

export default PlanetMap;
