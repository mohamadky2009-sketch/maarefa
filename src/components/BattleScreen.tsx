import { useState, useEffect, useMemo, useRef } from 'react';
import { useGame } from '@/context/GameContext';
import { ISLANDS, CHARACTERS } from '@/lib/gameState';

interface Props {
  planetId: number;
  islandId: number;
  onBack: () => void;
  onVictory: () => void;
  onDefeat: () => void;
}

type ActionState = 'idle' | 'attack' | 'hurt' | 'death';
type GameResult = 'none' | 'victory' | 'defeat';

const FRAME_MS = 120;

const BattleScreen = ({ islandId, onBack, onVictory, onDefeat }: Props) => {
  const { currentPlayer } = useGame();

  const island = ISLANDS.find(is => is.id === islandId);
  const heroData = CHARACTERS.find(c => c.id === currentPlayer?.characterId);

  // ── HP ────────────────────────────────────────────────────────────────
  const [heroHP, setHeroHP] = useState(100);
  const [monsterHP, setMonsterHP] = useState(100);
  const [heroHPGhost, setHeroHPGhost] = useState(100);
  const [monsterHPGhost, setMonsterHPGhost] = useState(100);

  // ── Animation states ──────────────────────────────────────────────────
  const [heroAction, setHeroAction] = useState<ActionState>('idle');
  const [monsterAction, setMonsterAction] = useState<ActionState>('idle');
  const [heroDash, setHeroDash] = useState(false);

  // ── Visual effects ─────────────────────────────────────────────────────
  const [showResult, setShowResult] = useState<'none' | 'correct' | 'wrong'>('none');
  const [showImpact, setShowImpact] = useState(false);
  const [cameraZoom, setCameraZoom] = useState(false);
  const [gameResult, setGameResult] = useState<GameResult>('none');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  // ── Stats ─────────────────────────────────────────────────────────────
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState(0);

  // ── Refs ──────────────────────────────────────────────────────────────
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const gameResultRef = useRef<GameResult>('none');

  const addTimer = (fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
    return t;
  };

  useEffect(() => () => { timersRef.current.forEach(clearTimeout); }, []);

  // ── Monster config ────────────────────────────────────────────────────
  const monsterData = useMemo(() => {
    const cycleIndex = islandId % 4;
    const configs = [
      { id: 'm1', name: 'ساحر النار',     folder: 'monster1', frames: { idle: 5, attack: 8, hurt: 3, death: 5 },  type: 'sheet' },
      { id: 'm2', name: 'جالب الموت',     folder: 'monster2', frames: { idle: 8, attack: 10, hurt: 3, death: 10 }, type: 'individual' },
      { id: 'm3', name: 'سيد الظلام',     folder: 'monster3', frames: { idle: 8, attack: 8, hurt: 3, death: 7 },  type: 'sheet' },
      { id: 'm4', name: 'الفارس المتمرد', folder: 'monster4', frames: { idle: 8, attack: 7, hurt: 4, death: 8 },  type: 'sheet' },
    ];
    return configs[cycleIndex];
  }, [islandId]);

  const heroFrames = useMemo(() => {
    if (heroData?.folder === 'hero1') return { idle: 8, attack: 8, hurt: 4, death: 7 };
    if (heroData?.folder === 'hero2') return { idle: 8, attack: 6, hurt: 4, death: 11 };
    return { idle: 8, attack: 8, hurt: 4, death: 6 };
  }, [heroData]);

  // ── Ghost HP trailing bars ─────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setHeroHPGhost(heroHP), 850);
    return () => clearTimeout(t);
  }, [heroHP]);

  useEffect(() => {
    const t = setTimeout(() => setMonsterHPGhost(monsterHP), 850);
    return () => clearTimeout(t);
  }, [monsterHP]);

  // ── Death detection ───────────────────────────────────────────────────
  useEffect(() => {
    if (monsterHP <= 0 && gameResultRef.current === 'none') {
      gameResultRef.current = 'victory';
      setMonsterAction('death');
      addTimer(() => setGameResult('victory'), 1800);
    }
  }, [monsterHP]);

  useEffect(() => {
    if (heroHP <= 0 && gameResultRef.current === 'none') {
      gameResultRef.current = 'defeat';
      setHeroAction('death');
      addTimer(() => setGameResult('defeat'), 1800);
    }
  }, [heroHP]);

  // ── Guards ────────────────────────────────────────────────────────────
  if (!currentPlayer) return <div className="min-h-screen bg-black text-white flex items-center justify-center text-2xl">خطأ: بيانات اللاعب غير موجودة!</div>;
  if (!island)        return <div className="min-h-screen bg-black text-white flex items-center justify-center text-2xl">خطأ: الجزيرة غير موجودة!</div>;
  if (!heroData)      return <div className="min-h-screen bg-black text-white flex items-center justify-center text-2xl">خطأ: بيانات البطل غير موجودة!</div>;

  const isLocked = heroAction !== 'idle' || monsterAction !== 'idle' || heroHP <= 0 || monsterHP <= 0 || gameResult !== 'none';

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleAnswer = (index: number) => {
    if (isLocked) return;
    setSelectedOption(index);
    addTimer(() => setSelectedOption(null), 500);

    const q = island.question as any;
    const correctIdx = q.correctIndex ?? q.correctAnswerIndex ?? q.correctOption ?? 0;
    if (index === correctIdx) {
      setCorrectAnswers(p => p + 1);
      executeHeroAttack();
    } else {
      setWrongAnswers(p => p + 1);
      executeMonsterAttack();
    }
  };

  const executeHeroAttack = () => {
    const monsterHurtDuration = monsterData.frames.hurt * FRAME_MS + 200;

    setShowResult('correct');
    setHeroDash(true);
    setCameraZoom(true);

    addTimer(() => setHeroAction('attack'), 400);

    addTimer(() => {
      setMonsterAction('hurt');
      setMonsterHP(prev => Math.max(0, prev - 50));
      setShowImpact(true);
    }, 700);

    addTimer(() => setShowImpact(false), 820);
    addTimer(() => setCameraZoom(false), 950);

    addTimer(() => {
      setHeroAction('idle');
      setMonsterAction('idle');
      setHeroDash(false);
      setShowResult('none');
    }, 700 + monsterHurtDuration);
  };

  const executeMonsterAttack = () => {
    const heroHurtDuration = heroFrames.hurt * FRAME_MS + 200;

    setShowResult('wrong');
    setMonsterAction('attack');

    addTimer(() => {
      setHeroAction('hurt');
      setHeroHP(prev => Math.max(0, prev - 25));
    }, 600);

    addTimer(() => {
      setMonsterAction('idle');
      setHeroAction('idle');
      setShowResult('none');
    }, 600 + heroHurtDuration);
  };

  const bgUrl = `/src/assets/combat/monster4/islands/island${islandId + 1}.png`;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div dir="ltr" className="relative min-h-screen flex flex-col items-center justify-between overflow-hidden">

      {/* ── Parallax background ── */}
      <div
        className="absolute inset-0 bg-center bg-cover battle-bg-parallax"
        style={{ backgroundImage: `url('${bgUrl}')` }}
      />
      <div className="absolute inset-0 bg-black/52" />

      {/* Cinematic vignette during attack */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-500"
        style={{ boxShadow: cameraZoom ? 'inset 0 0 140px rgba(0,0,0,0.7)' : 'none' }}
      />

      {/* ── HP Bars ─────────────────────────────────────────────────────── */}
      <div className="relative z-20 w-full max-w-6xl flex justify-between items-center gap-4 p-4 md:p-6">

        {/* Hero HP */}
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-cyan-300 font-bold text-sm tracking-wide"
              style={{ textShadow: '0 0 10px rgba(6,182,212,0.9)' }}>
              {currentPlayer.name}
            </span>
            <span className="text-cyan-400/80 font-mono text-xs">{heroHP}/100</span>
          </div>
          <div className="relative h-5 bg-black/70 rounded-full overflow-hidden border border-cyan-500/40"
            style={{ boxShadow: '0 0 14px rgba(6,182,212,0.25)' }}>
            {/* Ghost bar */}
            <div className="absolute inset-y-0 left-0 rounded-full ease-out bg-white/25"
              style={{ width: `${heroHPGhost}%`, transition: 'width 1000ms ease-out' }} />
            {/* Live bar */}
            <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${heroHP}%`,
                background: 'linear-gradient(90deg, #0891b2 0%, #22d3ee 70%, #a5f3fc 100%)',
                boxShadow: '0 0 12px rgba(6,182,212,0.9), inset 0 1px 0 rgba(255,255,255,0.35)',
              }} />
            {/* Metallic sheen */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
          </div>
        </div>

        <div className="px-3 md:px-6 text-white text-xl md:text-2xl font-black"
          style={{ textShadow: '0 0 12px rgba(255,255,255,0.5)' }}>⚔️</div>

        {/* Monster HP */}
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-red-400/80 font-mono text-xs">{monsterHP}/100</span>
            <span className="text-red-400 font-bold text-sm tracking-wide"
              style={{ textShadow: '0 0 10px rgba(239,68,68,0.9)' }}>
              {monsterData.name}
            </span>
          </div>
          <div className="relative h-5 bg-black/70 rounded-full overflow-hidden border border-red-500/40"
            style={{ boxShadow: '0 0 14px rgba(239,68,68,0.25)' }}>
            {/* Ghost bar */}
            <div className="absolute inset-y-0 right-0 rounded-full bg-white/25"
              style={{ width: `${monsterHPGhost}%`, transition: 'width 1000ms ease-out' }} />
            {/* Live bar */}
            <div className="absolute inset-y-0 right-0 rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${monsterHP}%`,
                background: 'linear-gradient(270deg, #7f1d1d 0%, #ef4444 70%, #fca5a5 100%)',
                boxShadow: '0 0 12px rgba(239,68,68,0.9), inset 0 1px 0 rgba(255,255,255,0.35)',
              }} />
            {/* Metallic sheen */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ── Battle Arena ─────────────────────────────────────────────────── */}
      <div
        className="relative z-10 w-full max-w-7xl h-[42vh] flex items-end justify-between px-8 md:px-28 pb-8 transition-transform duration-500"
        style={{
          transform: cameraZoom ? 'scale(1.06)' : 'scale(1)',
          transformOrigin: 'center bottom',
          transitionTimingFunction: 'cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {/* Hero — left */}
        <div className={`transition-all duration-500 ease-out ${heroDash ? 'translate-x-[180px] md:translate-x-[360px]' : 'translate-x-0'}`}>
          <DynamicSprite folder={heroData.folder} action={heroAction} frames={heroFrames} isHero={true} type="sheet" />
        </div>

        {/* Monster — right */}
        <div className="relative">
          {/* Impact flash */}
          {showImpact && (
            <div className="absolute inset-0 z-20 pointer-events-none">
              <div className="absolute inset-0 rounded-xl animate-ping bg-white/65" style={{ animationDuration: '0.12s' }} />
              <span className="absolute top-1/4 left-1/4 text-3xl" style={{ animation: 'resultPop 0.3s ease forwards' }}>💥</span>
              <span className="absolute top-1/3 right-1/4 text-2xl" style={{ animation: 'resultPop 0.3s ease 0.05s forwards', opacity: 0 }}>⭐</span>
              <span className="absolute bottom-1/3 left-1/3 text-xl" style={{ animation: 'resultPop 0.3s ease 0.1s forwards', opacity: 0 }}>✨</span>
            </div>
          )}
          <DynamicSprite folder={monsterData.folder} action={monsterAction} frames={monsterData.frames} isHero={false} type={monsterData.type as any} />
        </div>
      </div>

      {/* ── Question Panel — Glassmorphism ───────────────────────────────── */}
      <div className="relative z-20 w-full max-w-5xl mx-auto px-2 pb-2">
        <div
          className="rounded-3xl p-6 md:p-10 shadow-2xl border border-white/10"
          style={{
            background: 'linear-gradient(135deg, rgba(6,182,212,0.09) 0%, rgba(0,0,0,0.8) 55%, rgba(6,182,212,0.06) 100%)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            boxShadow: '0 0 50px rgba(6,182,212,0.1), 0 25px 60px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}
        >
          <h3 className="text-center text-lg md:text-2xl font-bold mb-6 text-white leading-relaxed" dir="rtl">
            {island.question.text}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {island.question.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={isLocked}
                dir="rtl"
                className="group relative p-4 md:p-5 rounded-2xl text-base md:text-lg font-bold text-right border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 overflow-hidden"
                style={{
                  background: selectedOption === i ? 'rgba(6,182,212,0.22)' : 'rgba(255,255,255,0.05)',
                  borderColor: selectedOption === i ? 'rgba(6,182,212,0.65)' : 'rgba(255,255,255,0.10)',
                }}
              >
                {/* Hover glow */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.18), rgba(6,182,212,0.04))' }} />
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ boxShadow: 'inset 0 0 22px rgba(6,182,212,0.22), 0 0 18px rgba(6,182,212,0.18)' }} />
                {/* Border glow on hover */}
                <div className="absolute inset-0 rounded-2xl border border-cyan-400/0 group-hover:border-cyan-400/50 transition-all duration-300" />
                <div className="relative flex items-center gap-3">
                  <span className="text-cyan-400 font-mono text-sm shrink-0 group-hover:text-cyan-200 transition-colors">{i + 1}.</span>
                  <span className="text-white group-hover:text-cyan-100 transition-colors">{opt}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Back button ── */}
      <button
        onClick={onBack}
        className="absolute top-4 left-4 z-30 px-4 py-2 bg-black/60 hover:bg-red-900/80 rounded-full text-white font-bold transition-all border border-white/20 text-sm backdrop-blur-sm"
      >
        🏳️ انسحاب
      </button>

      {/* ── Answer flash ── */}
      {showResult !== 'none' && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div
            className={`text-7xl md:text-9xl font-black drop-shadow-2xl ${showResult === 'correct' ? 'text-green-400' : 'text-red-400'}`}
            style={{ animation: 'resultPop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
          >
            {showResult === 'correct' ? '✅' : '❌'}
          </div>
        </div>
      )}

      {/* ── Victory Modal ── */}
      {gameResult === 'victory' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/72 backdrop-blur-lg">
          <div
            className="relative max-w-md w-full mx-4 rounded-3xl p-8 text-center border border-yellow-400/30 shadow-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(234,179,8,0.14) 0%, rgba(0,0,0,0.92) 65%)',
              boxShadow: '0 0 70px rgba(234,179,8,0.3), 0 0 140px rgba(234,179,8,0.08)',
              animation: 'resultPop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards',
            }}
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-yellow-400/5 to-transparent pointer-events-none" />
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-3xl font-black text-yellow-400 mb-2"
              style={{ textShadow: '0 0 24px rgba(234,179,8,0.9)' }}>انتصار!</h2>
            <p className="text-white/60 mb-6 text-sm">لقد هزمت {monsterData.name}</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="rounded-2xl p-4 border border-white/10 bg-white/5">
                <div className="text-green-400 text-2xl font-black">{correctAnswers}</div>
                <div className="text-white/50 text-xs mt-1">إجابات صحيحة</div>
              </div>
              <div className="rounded-2xl p-4 border border-white/10 bg-white/5">
                <div className="text-red-400 text-2xl font-black">{wrongAnswers}</div>
                <div className="text-white/50 text-xs mt-1">إجابات خاطئة</div>
              </div>
            </div>
            <button
              onClick={onVictory}
              className="w-full py-4 rounded-2xl font-black text-lg text-black transition-all duration-300 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #ca8a04, #eab308, #fde047)',
                boxShadow: '0 0 32px rgba(234,179,8,0.55), 0 4px 18px rgba(0,0,0,0.4)',
              }}
            >
              متابعة المغامرة ←
            </button>
          </div>
        </div>
      )}

      {/* ── Defeat Modal ── */}
      {gameResult === 'defeat' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg">
          <div
            className="relative max-w-md w-full mx-4 rounded-3xl p-8 text-center border border-red-500/30 shadow-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(239,68,68,0.13) 0%, rgba(0,0,0,0.93) 65%)',
              boxShadow: '0 0 70px rgba(239,68,68,0.28), 0 0 140px rgba(239,68,68,0.08)',
              animation: 'resultPop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards',
            }}
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-red-500/5 to-transparent pointer-events-none" />
            <div className="text-6xl mb-4">💀</div>
            <h2 className="text-3xl font-black text-red-400 mb-2"
              style={{ textShadow: '0 0 24px rgba(239,68,68,0.9)' }}>هُزِمت!</h2>
            <p className="text-white/60 mb-6 text-sm">{monsterData.name} كان أقوى هذه المرة</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="rounded-2xl p-4 border border-white/10 bg-white/5">
                <div className="text-green-400 text-2xl font-black">{correctAnswers}</div>
                <div className="text-white/50 text-xs mt-1">إجابات صحيحة</div>
              </div>
              <div className="rounded-2xl p-4 border border-white/10 bg-white/5">
                <div className="text-red-400 text-2xl font-black">{wrongAnswers}</div>
                <div className="text-white/50 text-xs mt-1">إجابات خاطئة</div>
              </div>
            </div>
            <button
              onClick={onDefeat}
              className="w-full py-4 rounded-2xl font-black text-lg text-white transition-all duration-300 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #7f1d1d, #ef4444, #f87171)',
                boxShadow: '0 0 32px rgba(239,68,68,0.45), 0 4px 18px rgba(0,0,0,0.4)',
              }}
            >
              حاول مجدداً ↩
            </button>
          </div>
        </div>
      )}

      {/* ── Keyframes ── */}
      <style>{`
        .battle-bg-parallax {
          animation: bgParallax 22s ease-in-out infinite alternate;
          transform: scale(1.12);
        }
        @keyframes bgParallax {
          0%   { transform: scale(1.12) translate(0%, 0%); }
          50%  { transform: scale(1.17) translate(0.6%, 0.4%); }
          100% { transform: scale(1.12) translate(-0.6%, -0.4%); }
        }
        @keyframes resultPop {
          0%   { transform: scale(0.2) rotate(-12deg); opacity: 0; }
          65%  { transform: scale(1.25) rotate(4deg);  opacity: 1; }
          100% { transform: scale(1)   rotate(0deg);   opacity: 1; }
        }
      `}</style>
    </div>
  );
};

// ── DynamicSprite ─────────────────────────────────────────────────────────
// NOTE: getPath logic is untouched — file names and folder structure preserved exactly.
const DynamicSprite = ({ folder, action, frames, isHero, type }: any) => {
  const [frame, setFrame] = useState(1);
  const totalFrames = frames[action] || 1;

  useEffect(() => {
    setFrame(1);
    const timer = setInterval(() => {
      setFrame(prev => (prev % totalFrames) + 1);
    }, FRAME_MS);
    return () => clearInterval(timer);
  }, [action, totalFrames]);

  const getPath = () => {
    // 1. monster2 — individual frames
    if (type === 'individual') {
      const actionName = action === 'hurt' ? 'Hurt' : (action === 'idle' ? 'Idle' : (action === 'attack' ? 'Attack' : 'Death'));
      return `/src/assets/combat/${folder}/Individual Sprite/${actionName}/Bringer-of-Death_${actionName}_${frame}.png`;
    }

    // 2. Sprite sheets (heroes + remaining monsters)
    let fileName = 'Idle.png';
    const sub = (folder === 'hero3' || folder.startsWith('monster')) ? 'Sprites/' : '';

    if (action === 'attack') {
      fileName = folder === 'hero2' ? 'Attack_1.png' : (folder === 'monster1' ? 'Attack.png' : 'Attack1.png');
    } else if (action === 'hurt') {
      if (folder === 'hero1' || folder === 'hero2') fileName = 'Hit.png';
      else if (folder === 'monster3')               fileName = 'Take hit.png';
      else                                           fileName = 'Take Hit.png';
    } else if (action === 'death') {
      fileName = 'Death.png';
    }

    return `/src/assets/combat/${folder}/${sub}${fileName}`;
  };

  const posX = ((frame - 1) / Math.max(totalFrames - 1, 1)) * 100;

  return (
    <div
      className={`w-64 h-64 md:w-80 md:h-80 ${!isHero ? 'scale-x-[-1]' : ''}`}
      style={{
        backgroundImage: `url('${getPath()}')`,
        backgroundSize: type === 'individual' ? 'contain' : `${totalFrames * 100}% 100%`,
        backgroundPosition: type === 'individual' ? 'center' : `${totalFrames > 1 ? posX : 0}% center`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
      }}
    />
  );
};

export default BattleScreen;
