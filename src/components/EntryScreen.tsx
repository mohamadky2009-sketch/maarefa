import { useState, useEffect } from 'react';
import { useGame } from '@/context/GameContext';
import { CHARACTERS, playSound } from '@/lib/gameState';
import StarField from './StarField';
import FloatingAstronaut from './FloatingAstronaut';
import FloatingRocket from './FloatingRocket';
import parchmentImg from '@/assets/ui/parchment.png';

// ── Monster Guard Sprite ──────────────────────────────────────────────────────
const MonsterGuard = () => {
  const [frame, setFrame] = useState(0);
  const totalFrames = 8;
  useEffect(() => {
    const t = setInterval(() => setFrame(p => (p + 1) % totalFrames), 150);
    return () => clearInterval(t);
  }, []);
  const posX = (frame / (totalFrames - 1)) * 100;
  return (
    <div className="absolute right-0 sm:right-[-50px] top-1/2 -translate-y-1/2 z-20 opacity-90 pointer-events-none">
      <div
        className="w-[130px] h-[130px] sm:w-[200px] sm:h-[200px] md:w-[270px] md:h-[270px] scale-x-[-1]"
        style={{
          backgroundImage: `url('/src/assets/combat/monster1/Sprites/Idle.png')`,
          backgroundSize: `${totalFrames * 100}% 100%`,
          backgroundPosition: `${posX}% center`,
          backgroundRepeat: 'no-repeat',
          imageRendering: 'pixelated',
          filter: 'drop-shadow(0 0 18px rgba(30,64,175,0.5))',
        }}
      />
    </div>
  );
};

// ── Hero Selection Card ───────────────────────────────────────────────────────
const HeroCard = ({ character, isSelected, onClick }: any) => {
  const [frame, setFrame] = useState(0);
  const totalFrames = character.folder === 'hero3' ? 8 : 6;
  useEffect(() => {
    const t = setInterval(() => setFrame(p => (p + 1) % totalFrames), 150);
    return () => clearInterval(t);
  }, [totalFrames]);
  const posX = (frame / (totalFrames - 1)) * 100;
  const src = character.folder === 'hero3'
    ? `/src/assets/combat/${character.folder}/Sprites/Idle.png`
    : `/src/assets/combat/${character.folder}/Idle.png`;
  return (
    <div
      onClick={onClick}
      className={`relative cursor-pointer transition-all duration-300 rounded-2xl border-4 p-3 select-none ${
        isSelected
          ? 'border-blue-500 bg-blue-900/40 scale-110 shadow-[0_0_30px_rgba(59,130,246,0.6)]'
          : 'border-white/10 bg-black/40 hover:bg-white/5 hover:scale-105'
      }`}
    >
      <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center overflow-hidden mx-auto">
        <div
          className={`w-full h-full ${character.folder === 'hero3' ? 'scale-[2.4]' : 'scale-[1.8]'}`}
          style={{
            backgroundImage: `url('${src}')`,
            backgroundSize: `${totalFrames * 100}% 100%`,
            backgroundPosition: `${posX}% center`,
            backgroundRepeat: 'no-repeat',
            imageRendering: 'pixelated',
          }}
        />
      </div>
      <p className={`text-center text-[9px] sm:text-xs font-black mt-2 uppercase ${isSelected ? 'text-blue-400' : 'text-gray-400'}`}>
        {character.name}
      </p>
    </div>
  );
};

// ── Entry Screen ──────────────────────────────────────────────────────────────
interface EntryScreenProps {
  onAdmin: () => void;
  loggedIn?: boolean;
  onPlay?: () => void;
}

const EntryScreen = ({ onAdmin, loggedIn = false, onPlay }: EntryScreenProps) => {
  const { registerPlayer } = useGame();
  const [phase, setPhase] = useState<'intro' | 'setup'>('intro');
  const [step, setStep]   = useState<'hero' | 'name' | 'email'>('hero');
  const [formData, setFormData] = useState({ name: '', email: '', heroId: CHARACTERS[0].id });

  const handleNext = () => {
    playSound('click');
    if (step === 'hero') {
      setStep('name');
    } else if (step === 'name') {
      if (!formData.name.trim()) return alert('يا بطل، سجل اسمك أولاً!');
      setStep('email');
    } else {
      if (!formData.email.trim() || !formData.email.includes('@'))
        return alert('تأكد من كتابة البريد الإلكتروني بشكل صحيح!');
      playSound('victory');
      registerPlayer(formData.name, formData.email, formData.heroId);
    }
  };

  const handleStartAdventure = () => {
    playSound('click');
    if (loggedIn && onPlay) onPlay();
    else setPhase('setup');
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#050505] overflow-hidden text-white">
      <StarField />
      <FloatingRocket />
      {phase === 'intro' && !loggedIn && <FloatingAstronaut />}

      {/* ── Intro / Scroll Phase ── */}
      {phase === 'intro' && (
        <div className="relative flex items-center z-30 w-full max-w-3xl justify-center px-3">
          <MonsterGuard />

          {/* Parchment scroll */}
          <div className="relative z-30 w-full flex justify-center" style={{ animation: 'entryFloat 4s ease-in-out infinite' }}>
            <div
              className="relative"
              style={{
                width: 'min(72vw, 320px)',
                animation: 'entryFadeIn 0.7s cubic-bezier(0.34,1.56,0.64,1) both',
              }}
            >
              {/* Aspect ratio box */}
              <div className="relative" style={{ paddingBottom: '135%' }}>
                <img
                  src={parchmentImg}
                  draggable={false}
                  className="absolute inset-0 w-full h-full object-fill rounded-2xl select-none"
                  style={{ filter: 'drop-shadow(0 20px 50px rgba(0,0,0,0.88))' }}
                />

                {/* Text & Buttons layer */}
                <div className="absolute inset-0 flex flex-col items-center justify-center px-6 py-10 text-amber-950 text-center gap-0">
                  {/* Title */}
                  <h1
                    className="font-black leading-none mb-1 drop-shadow-md"
                    style={{ fontSize: 'clamp(2.2rem, 11vw, 3.4rem)' }}
                  >
                    مَعرِفة
                  </h1>
                  <p
                    className="font-bold opacity-60 tracking-[0.28em] uppercase mb-5"
                    style={{ fontSize: 'clamp(0.45rem, 1.8vw, 0.6rem)' }}
                  >
                    Neptune to the Sun
                  </p>

                  {/* Ornamental divider */}
                  <div className="flex items-center gap-2 mb-5 w-full px-2">
                    <div className="flex-1 h-px bg-amber-900/30" />
                    <span className="text-amber-900/40 text-[8px]">✦</span>
                    <div className="flex-1 h-px bg-amber-900/30" />
                  </div>

                  {/* ── Buttons — leather scroll ends, 55% size ── */}
                  <div className="flex flex-col items-center gap-2.5 w-full">

                    {/* Primary */}
                    <button
                      onClick={handleStartAdventure}
                      className="group relative overflow-hidden active:scale-95 transition-all duration-150 select-none"
                      style={{
                        padding: '5px 18px',
                        background: 'linear-gradient(180deg,#7a4220 0%,#3d1a06 48%,#7a4220 100%)',
                        border: '1.5px solid #9a6840',
                        borderRadius: '7px',
                        color: '#f5deb3',
                        fontWeight: 900,
                        fontSize: 'clamp(0.6rem, 2.5vw, 0.75rem)',
                        letterSpacing: '0.04em',
                        boxShadow: '0 3px 10px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.35)',
                        textShadow: '0 1px 2px rgba(0,0,0,0.65)',
                        minWidth: '0',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {/* Sheen */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.14) 0%,transparent 60%)' }} />
                      {/* Rivets */}
                      <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-amber-600/60" />
                      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-amber-600/60" />
                      <span className="relative">ابدأ المغامرة 🚀</span>
                    </button>

                    {/* Secondary */}
                    <button
                      onClick={() => { playSound('click'); onAdmin(); }}
                      className="group relative overflow-hidden active:scale-95 transition-all duration-150 select-none"
                      style={{
                        padding: '4px 14px',
                        background: 'transparent',
                        border: '1px solid rgba(101,67,33,0.40)',
                        borderRadius: '6px',
                        color: 'rgba(101,67,33,0.80)',
                        fontWeight: 700,
                        fontSize: 'clamp(0.5rem, 2vw, 0.62rem)',
                        letterSpacing: '0.03em',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: 'rgba(101,67,33,0.09)' }} />
                      <div className="absolute left-1 top-1/2 -translate-y-1/2 w-0.5 h-0.5 rounded-full bg-amber-900/40" />
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 w-0.5 h-0.5 rounded-full bg-amber-900/40" />
                      <span className="relative">لوحة التحكم 🔐</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Setup / Registration Phase ── */}
      {phase === 'setup' && (
        <div className="relative z-30 w-full max-w-lg px-4 animate-in slide-in-from-bottom-8 duration-500">
          {/* Progress header */}
          <div className="text-center mb-4 bg-black/50 px-5 py-4 rounded-3xl backdrop-blur-md border border-white/10 shadow-xl">
            <h2 className="text-2xl sm:text-3xl font-black text-blue-400 mb-3 uppercase tracking-widest"
              style={{ textShadow: '0 0 15px rgba(59,130,246,0.8)' }}>
              تجهيز المهمة
            </h2>
            <div className="flex justify-center gap-2">
              {(['hero', 'name', 'email'] as const).map(s => (
                <div key={s} className={`h-1.5 w-14 sm:w-18 rounded-full transition-all duration-300 ${
                  step === s ? 'bg-blue-500 shadow-[0_0_12px_blue]' : 'bg-white/20'
                }`} />
              ))}
            </div>
          </div>

          <div className="bg-black/70 backdrop-blur-xl border-2 border-blue-500/30 rounded-3xl p-5 sm:p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] min-h-[260px] flex flex-col justify-center">

            {step === 'hero' && (
              <div className="space-y-5 animate-in fade-in duration-300">
                <h3 className="text-center font-bold text-lg sm:text-xl text-gray-100">اختر بطلك للرحلة:</h3>
                <div className="grid grid-cols-3 gap-3 sm:gap-6">
                  {CHARACTERS.map(char => (
                    <HeroCard
                      key={char.id}
                      character={char}
                      isSelected={formData.heroId === char.id}
                      onClick={() => setFormData({ ...formData, heroId: char.id })}
                    />
                  ))}
                </div>
              </div>
            )}

            {step === 'name' && (
              <div className="space-y-5 animate-in fade-in duration-300">
                <h3 className="text-center font-bold text-lg sm:text-xl text-gray-100">ما اسمك يا بطل؟</h3>
                <input
                  autoFocus
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && handleNext()}
                  placeholder="أدخل اسمك..."
                  className="w-full bg-black/90 border-2 border-blue-500/60 p-4 text-center text-2xl sm:text-3xl font-black rounded-2xl outline-none focus:border-blue-400 focus:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all text-white placeholder:opacity-20"
                />
              </div>
            )}

            {step === 'email' && (
              <div className="space-y-5 animate-in fade-in duration-300">
                <h3 className="text-center font-bold text-lg sm:text-xl text-gray-100">سجل بريدك الإلكتروني:</h3>
                <input
                  autoFocus
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && handleNext()}
                  placeholder="email@example.com"
                  className="w-full bg-black/90 border-2 border-blue-500/60 p-4 text-center text-xl sm:text-2xl font-bold rounded-2xl outline-none focus:border-blue-400 focus:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all text-white placeholder:opacity-20"
                />
              </div>
            )}
          </div>

          <button
            onClick={handleNext}
            className="w-full mt-5 py-4 sm:py-5 bg-blue-600 text-white font-black text-xl sm:text-2xl rounded-2xl shadow-[0_0_35px_rgba(37,99,235,0.6)] hover:bg-blue-500 active:scale-95 transition-all border-4 border-blue-400/50"
          >
            {step === 'email' ? '🚀 انطلق إلى نبتون' : 'التالي ➔'}
          </button>
        </div>
      )}

      {/* Keyframes */}
      <style>{`
        @keyframes entryFloat {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-10px); }
        }
        @keyframes entryFadeIn {
          0%   { opacity:0; transform:scale(0.88) translateY(18px); }
          60%  { opacity:1; transform:scale(1.03) translateY(-4px); }
          100% { opacity:1; transform:scale(1)   translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default EntryScreen;
