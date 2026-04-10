import { useState, useEffect } from 'react';
import { useGame } from '@/context/GameContext';
import { CHARACTERS, createPlayer, playSound } from '@/lib/gameState';
import StarField from './StarField';
import FloatingAstronaut from './FloatingAstronaut';
import FloatingRocket from './FloatingRocket';
import parchmentImg from '@/assets/ui/parchment.png';

// ==========================================
// 1. مكون الحارس العظيم (وحش الجزيرة الأولى monster1)
// ==========================================
const MonsterGuard = () => {
  const [frame, setFrame] = useState(0);
  const totalFrames = 8; // فريمات وحش نبتون

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((prev) => (prev + 1) % totalFrames);
    }, 150);
    return () => clearInterval(timer);
  }, []);

  const positionX = (frame / (totalFrames - 1)) * 100;

  return (
    <div className="absolute right-[-10px] md:right-[-70px] top-1/2 -translate-y-1/2 z-20 animate-float opacity-95">
      <div 
        className="w-[220px] h-[220px] md:w-[320px] md:h-[320px] drop-shadow-[0_0_30px_rgba(30,64,175,0.4)] scale-x-[-1]"
        style={{
          backgroundImage: `url('/src/assets/combat/monster1/Sprites/Idle.png')`,
          backgroundSize: `${totalFrames * 100}% 100%`,
          backgroundPosition: `${positionX}% center`,
          backgroundRepeat: 'no-repeat',
          imageRendering: 'pixelated'
        }}
      />
    </div>
  );
};

// ==========================================
// 2. مكون البطل (تم ضبط الفريمات والأحجام بدقة)
// ==========================================
const HeroCard = ({ character, isSelected, onClick }: any) => {
  const [frame, setFrame] = useState(0);
  
  // الساحر (hero1) = 6 فريمات | الأسطوري (hero3) = 8 فريمات
  const totalFrames = character.folder === 'hero3' ? 8 : 6; 

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((prev) => (prev + 1) % totalFrames);
    }, 150);
    return () => clearInterval(timer);
  }, [totalFrames]);

  const positionX = (frame / (totalFrames - 1)) * 100;
  
  const imagePath = character.folder === 'hero3' 
    ? `/src/assets/combat/${character.folder}/Sprites/Idle.png` 
    : `/src/assets/combat/${character.folder}/Idle.png`;

  return (
    <div 
      onClick={onClick}
      className={`relative cursor-pointer transition-all duration-300 rounded-3xl border-4 p-4 animate-idle ${
        isSelected ? 'border-blue-500 bg-blue-900/40 scale-110 shadow-[0_0_30px_rgba(59,130,246,0.6)]' : 'border-white/10 bg-black/40 hover:bg-white/5 hover:scale-105'
      }`}
    >
      <div className="w-24 h-24 md:w-32 md:h-32 flex items-center justify-center overflow-hidden mx-auto">
        <div 
          className={`w-full h-full ${character.folder === 'hero3' ? 'scale-[2.4]' : 'scale-[1.8]'}`}
          style={{
            backgroundImage: `url('${imagePath}')`, 
            backgroundSize: `${totalFrames * 100}% 100%`, 
            backgroundPosition: `${positionX}% center`, 
            backgroundRepeat: 'no-repeat',
            imageRendering: 'pixelated'
          }}
        />
      </div>
      <p className={`text-center text-xs md:text-sm font-black mt-4 uppercase ${isSelected ? 'text-blue-400' : 'text-gray-400'}`}>
        {character.name}
      </p>
    </div>
  );
};

// ==========================================
// 3. الشاشة الرئيسية مع منطق الانتقال للكواكب
// ==========================================
const EntryScreen = ({ onAdmin }: { onAdmin: () => void }) => {
  const { updatePlayer } = useGame();
  
  const [phase, setPhase] = useState<'intro' | 'setup'>('intro');
  const [step, setStep] = useState<'hero' | 'name' | 'email'>('hero');
  const [formData, setFormData] = useState({ name: '', email: '', heroId: CHARACTERS[0].id });

  // دالة المعالجة والربط
  const handleNext = () => {
    playSound('click');
    if (step === 'hero') {
      setStep('name');
    } else if (step === 'name') {
      if (!formData.name.trim()) return alert("يا بطل، سجل اسمك أولاً!");
      setStep('email');
    } else {
      // الخطوة النهائية: التحقق من البريد والانطلاق
      if (!formData.email.trim() || !formData.email.includes('@')) {
        return alert("تأكد من كتابة البريد الإلكتروني بشكل صحيح!");
      }

      playSound('victory');

      // الربط السحري: نقوم بإنشاء اللاعب وتحديث الحالة العامة
      // هذا السطر سيجعل App.tsx يفهم أن اللاعب سجل دخوله ويفتح شاشة الكواكب فوراً
      const newPlayer = createPlayer(formData.name, formData.email, formData.heroId);
      updatePlayer(newPlayer);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#050505] overflow-hidden text-white font-sans">
      <StarField />
      <FloatingRocket />

      {/* رائد الفضاء يظهر فقط في البداية عند الصحيفة */}
      {phase === 'intro' && <FloatingAstronaut />}

      {/* ----------------- واجهة الصحيفة ----------------- */}
      {phase === 'intro' && (
        <div className="relative flex items-center z-10 w-full max-w-4xl justify-center px-4">
          <MonsterGuard />
          
          <div className="animate-float z-30">
            <div className="relative w-[85vw] max-w-[420px] aspect-[4/5.5] animate-in fade-in zoom-in duration-700 mx-auto">
              <img src={parchmentImg} className="absolute inset-0 w-full h-full object-fill drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-2xl" />
              
              <div className="absolute inset-0 flex flex-col items-center justify-center px-12 py-16 text-amber-950 text-center">
                <h1 className="text-6xl md:text-7xl font-black mb-3 drop-shadow-md">مَعرِفة</h1>
                <p className="text-[10px] md:text-xs font-bold mb-12 opacity-80 tracking-[0.3em] uppercase">Neptune to the Sun</p>

                <div className="w-full space-y-4">
                  <button 
                    onClick={() => { playSound('click'); setPhase('setup'); }}
                    className="w-full py-4 bg-amber-950 text-amber-50 font-black text-lg md:text-xl rounded-xl shadow-[0_5px_15px_rgba(0,0,0,0.4)] hover:bg-black transition-all active:scale-95 border-2 border-amber-900"
                  >
                    ابدأ المغامرة 🚀
                  </button>
                  
                  <button 
                    onClick={onAdmin}
                    className="w-full py-3 bg-transparent border-2 border-amber-950/40 text-amber-950 font-bold text-xs md:text-sm rounded-xl hover:bg-amber-950/10 transition-all active:scale-95"
                  >
                    لوحة التحكم 🔐
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- واجهة اختيار الأبطال والإعداد ----------------- */}
      {phase === 'setup' && (
        <div className="relative z-setup w-full max-w-4xl px-8 animate-in slide-in-from-bottom-12 duration-500">
          <div className="text-center mb-8 bg-black/50 p-6 rounded-3xl backdrop-blur-md border border-white/10 shadow-xl">
            <h2 className="text-4xl md:text-5xl font-black text-blue-400 mb-5 uppercase tracking-widest drop-shadow-[0_0_15px_rgba(59,130,246,0.8)]">تجهيز المهمة</h2>
            <div className="flex justify-center gap-3 md:gap-4">
              <div className={`h-2 md:h-2.5 w-20 md:w-24 rounded-full transition-all duration-300 ${step === 'hero' ? 'bg-blue-500 shadow-[0_0_15px_blue]' : 'bg-white/20'}`} />
              <div className={`h-2 md:h-2.5 w-20 md:w-24 rounded-full transition-all duration-300 ${step === 'name' ? 'bg-blue-500 shadow-[0_0_15px_blue]' : 'bg-white/20'}`} />
              <div className={`h-2 md:h-2.5 w-20 md:w-24 rounded-full transition-all duration-300 ${step === 'email' ? 'bg-blue-500 shadow-[0_0_15px_blue]' : 'bg-white/20'}`} />
            </div>
          </div>

          <div className="bg-black/70 backdrop-blur-xl border-2 border-blue-500/30 rounded-[40px] p-8 md:p-12 shadow-[0_0_50px_rgba(0,0,0,0.8)] min-h-[400px] flex flex-col justify-center">
            
            {step === 'hero' && (
              <div className="space-y-8 md:space-y-10 animate-in fade-in duration-300">
                <h3 className="text-center font-bold text-2xl md:text-3xl text-gray-100">اختر بطلك للرحلة:</h3>
                <div className="grid grid-cols-3 gap-6 md:gap-10">
                  {CHARACTERS.map(char => (
                    <HeroCard 
                      key={char.id} 
                      character={char} 
                      isSelected={formData.heroId === char.id} 
                      onClick={() => setFormData({...formData, heroId: char.id})} 
                    />
                  ))}
                </div>
              </div>
            )}

            {step === 'name' && (
              <div className="space-y-8 md:space-y-10 animate-in fade-in duration-300">
                <h3 className="text-center font-bold text-2xl md:text-3xl text-gray-100">ما اسمك يا بطل؟</h3>
                <input 
                  autoFocus
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                  placeholder="أدخل اسمك..."
                  className="w-full bg-black/90 border-2 border-blue-500/60 p-6 md:p-8 text-center text-3xl md:text-5xl font-black rounded-3xl md:rounded-4xl outline-none focus:border-blue-400 focus:shadow-[0_0_40px_rgba(59,130,246,0.6)] transition-all text-white placeholder:opacity-20"
                />
              </div>
            )}

            {step === 'email' && (
              <div className="space-y-8 md:space-y-10 animate-in fade-in duration-300">
                <h3 className="text-center font-bold text-2xl md:text-3xl text-gray-100">سجل بريدك الإلكتروني:</h3>
                <input 
                  autoFocus
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                  placeholder="email@example.com"
                  className="w-full bg-black/90 border-2 border-blue-500/60 p-6 md:p-8 text-center text-2xl md:text-4xl font-bold rounded-3xl md:rounded-4xl outline-none focus:border-blue-400 focus:shadow-[0_0_40px_rgba(59,130,246,0.6)] transition-all text-white placeholder:opacity-20"
                />
              </div>
            )}
          </div>

          <button 
            onClick={handleNext}
            className="w-full mt-8 md:mt-10 py-6 md:py-7 bg-blue-600 text-white font-black text-3xl md:text-4xl rounded-3xl shadow-[0_0_40px_rgba(37,99,235,0.6)] hover:bg-blue-500 active:scale-95 transition-all border-4 border-blue-400/50"
          >
            {step === 'email' ? '🚀 انطلق إلى نبتون' : 'التالي ➔'}
          </button>
        </div>
      )}
    </div>
  );
};

export default EntryScreen;
