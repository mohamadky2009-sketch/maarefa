import { useState, useEffect } from 'react';
import { useGame } from '@/context/GameContext';
import { CHARACTERS, playSound } from '@/lib/gameState';
import StarField from './StarField';
import FloatingAstronaut from './FloatingAstronaut';
import FloatingRocket from './FloatingRocket';
import parchmentImg from '@/assets/ui/parchment.png';

const MonsterGuard = () => {
  const [frame, setFrame] = useState(0);
  const totalFrames = 8;

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
        className="w-[180px] h-[180px] md:w-[300px] md:h-[300px] drop-shadow-[0_0_30px_rgba(30,64,175,0.4)] scale-x-[-1]"
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

const HeroCard = ({ character, isSelected, onClick }: any) => {
  const [frame, setFrame] = useState(0);
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
      className={`relative cursor-pointer transition-all duration-300 rounded-2xl border-4 p-3 ${
        isSelected 
          ? 'border-blue-500 bg-blue-900/40 scale-110 shadow-[0_0_30px_rgba(59,130,246,0.6)]' 
          : 'border-white/10 bg-black/40 hover:bg-white/5 hover:scale-105'
      }`}
    >
      <div className="w-20 h-20 md:w-28 md:h-28 flex items-center justify-center overflow-hidden mx-auto">
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
      <p className={`text-center text-[10px] md:text-xs font-black mt-3 uppercase ${isSelected ? 'text-blue-400' : 'text-gray-400'}`}>
        {character.name}
      </p>
    </div>
  );
};

interface EntryScreenProps {
  onAdmin: () => void;
  loggedIn?: boolean;
  onPlay?: () => void;
}

const EntryScreen = ({ onAdmin, loggedIn = false, onPlay }: EntryScreenProps) => {
  const { registerPlayer } = useGame();
  
  const [phase, setPhase] = useState<'intro' | 'setup'>('intro');
  const [step, setStep] = useState<'hero' | 'name' | 'email'>('hero');
  const [formData, setFormData] = useState({ name: '', email: '', heroId: CHARACTERS[0].id });

  const handleNext = () => {
    playSound('click');
    if (step === 'hero') {
      setStep('name');
    } else if (step === 'name') {
      if (!formData.name.trim()) return alert("يا بطل، سجل اسمك أولاً!");
      setStep('email');
    } else {
      if (!formData.email.trim() || !formData.email.includes('@')) {
        return alert("تأكد من كتابة البريد الإلكتروني بشكل صحيح!");
      }
      playSound('victory');
      registerPlayer(formData.name, formData.email, formData.heroId);
    }
  };

  const handleStartAdventure = () => {
    playSound('click');
    if (loggedIn && onPlay) {
      onPlay();
    } else {
      setPhase('setup');
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#050505] overflow-hidden text-white font-sans">
      <StarField />
      <FloatingRocket />

      {phase === 'intro' && !loggedIn && <FloatingAstronaut />}

      {/* ── Scroll / Parchment intro ── */}
      {phase === 'intro' && (
        <div className="relative flex items-center z-30 w-full max-w-4xl justify-center px-4">
          <MonsterGuard />
          
          <div className="animate-float z-30">
            {/* Parchment card — tighter on mobile */}
            <div className="relative w-[80vw] max-w-[380px] mx-auto animate-in fade-in zoom-in duration-700">
              {/* Aspect ratio wrapper */}
              <div className="relative" style={{ paddingBottom: '130%' }}>
                <img
                  src={parchmentImg}
                  className="absolute inset-0 w-full h-full object-fill drop-shadow-[0_20px_50px_rgba(0,0,0,0.85)] rounded-2xl"
                  draggable={false}
                />

                {/* Content layer */}
                <div className="absolute inset-0 flex flex-col items-center justify-center px-8 py-12 text-amber-950 text-center gap-0">
                  
                  {/* Title */}
                  <h1 className="text-5xl sm:text-6xl font-black mb-1 drop-shadow-md leading-tight">
                    مَعرِفة
                  </h1>
                  <p className="text-[9px] sm:text-[10px] font-bold mb-8 opacity-70 tracking-[0.3em] uppercase">
                    Neptune to the Sun
                  </p>

                  {/* Decorative divider */}
                  <div className="w-24 h-px bg-amber-950/30 mb-8" />

                  {/* Buttons — styled as leather scroll ends */}
                  <div className="flex flex-col items-center gap-3 w-full">

                    {/* Primary: ابدأ المغامرة */}
                    <button
                      onClick={handleStartAdventure}
                      className="group relative overflow-hidden active:scale-95 transition-all duration-150"
                      style={{
                        padding: '8px 28px',
                        background: 'linear-gradient(180deg, #6b3a1f 0%, #3d1a06 50%, #6b3a1f 100%)',
                        border: '2px solid #8b5e3c',
                        borderRadius: '8px',
                        color: '#f5deb3',
                        fontWeight: 900,
                        fontSize: '0.85rem',
                        letterSpacing: '0.03em',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.3)',
                        textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                        minWidth: '160px',
                      }}
                    >
                      {/* Leather sheen */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 60%)' }} />
                      {/* Scroll-end notches */}
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-amber-800/60" />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-amber-800/60" />
                      <span className="relative">ابدأ المغامرة 🚀</span>
                    </button>

                    {/* Secondary: لوحة التحكم */}
                    <button
                      onClick={() => { playSound('click'); onAdmin(); }}
                      className="group relative overflow-hidden active:scale-95 transition-all duration-150"
                      style={{
                        padding: '6px 24px',
                        background: 'transparent',
                        border: '1.5px solid rgba(101,67,33,0.45)',
                        borderRadius: '8px',
                        color: 'rgba(101,67,33,0.85)',
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        letterSpacing: '0.02em',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
                        minWidth: '140px',
                      }}
                    >
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        style={{ background: 'rgba(101,67,33,0.08)' }} />
                      <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-amber-900/40" />
                      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-amber-900/40" />
                      <span className="relative">لوحة التحكم 🔐</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Setup phase (registration) ── */}
      {phase === 'setup' && (
        <div className="relative z-30 w-full max-w-2xl px-4 sm:px-8 animate-in slide-in-from-bottom-12 duration-500">
          {/* Progress header */}
          <div className="text-center mb-6 bg-black/50 p-4 sm:p-6 rounded-3xl backdrop-blur-md border border-white/10 shadow-xl">
            <h2 className="text-3xl sm:text-4xl font-black text-blue-400 mb-4 uppercase tracking-widest drop-shadow-[0_0_15px_rgba(59,130,246,0.8)]">
              تجهيز المهمة
            </h2>
            <div className="flex justify-center gap-2 sm:gap-3">
              {(['hero','name','email'] as const).map((s) => (
                <div key={s}
                  className={`h-2 w-16 sm:w-20 rounded-full transition-all duration-300 ${
                    step === s ? 'bg-blue-500 shadow-[0_0_15px_blue]' : 'bg-white/20'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="bg-black/70 backdrop-blur-xl border-2 border-blue-500/30 rounded-[32px] p-6 sm:p-10 shadow-[0_0_50px_rgba(0,0,0,0.8)] min-h-[320px] flex flex-col justify-center">
            
            {step === 'hero' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <h3 className="text-center font-bold text-xl sm:text-2xl text-gray-100">اختر بطلك للرحلة:</h3>
                <div className="grid grid-cols-3 gap-4 sm:gap-8">
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
              <div className="space-y-6 animate-in fade-in duration-300">
                <h3 className="text-center font-bold text-xl sm:text-2xl text-gray-100">ما اسمك يا بطل؟</h3>
                <input 
                  autoFocus
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                  placeholder="أدخل اسمك..."
                  className="w-full bg-black/90 border-2 border-blue-500/60 p-4 sm:p-6 text-center text-2xl sm:text-4xl font-black rounded-2xl outline-none focus:border-blue-400 focus:shadow-[0_0_40px_rgba(59,130,246,0.6)] transition-all text-white placeholder:opacity-20"
                />
              </div>
            )}

            {step === 'email' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <h3 className="text-center font-bold text-xl sm:text-2xl text-gray-100">سجل بريدك الإلكتروني:</h3>
                <input 
                  autoFocus
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                  placeholder="email@example.com"
                  className="w-full bg-black/90 border-2 border-blue-500/60 p-4 sm:p-6 text-center text-xl sm:text-3xl font-bold rounded-2xl outline-none focus:border-blue-400 focus:shadow-[0_0_40px_rgba(59,130,246,0.6)] transition-all text-white placeholder:opacity-20"
                />
              </div>
            )}
          </div>

          <button 
            onClick={handleNext}
            className="w-full mt-6 py-5 sm:py-6 bg-blue-600 text-white font-black text-2xl sm:text-3xl rounded-2xl shadow-[0_0_40px_rgba(37,99,235,0.6)] hover:bg-blue-500 active:scale-95 transition-all border-4 border-blue-400/50"
          >
            {step === 'email' ? '🚀 انطلق إلى نبتون' : 'التالي ➔'}
          </button>
        </div>
      )}
    </div>
  );
};

export default EntryScreen;
