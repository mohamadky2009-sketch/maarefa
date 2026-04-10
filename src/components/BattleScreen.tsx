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

// ── Types ──────────────────────────────────────────────────────────────────
type ActionState = 'idle' | 'run' | 'attack' | 'attack2' | 'hurt' | 'death';
type GameResult  = 'none' | 'victory' | 'defeat';

// ── Constants ──────────────────────────────────────────────────────────────
const FRAME_MS       = 110;   // ms per animation frame
const CHARGE_MS      = 550;   // ms to run to enemy
const RETURN_MS      = 500;   // ms to run back

// ── Precise sprite configs (measured from actual PNG dimensions) ────────────
const HERO_FRAMES: Record<string, Record<ActionState, number>> = {
  hero1: { idle: 7,  run: 10, attack: 10, attack2: 10, hurt: 5,  death: 9  },
  hero2: { idle: 6,  run: 8,  attack: 6,  attack2: 6,  hurt: 4,  death: 11 },
  hero3: { idle: 8,  run: 8,  attack: 6,  attack2: 6,  hurt: 4,  death: 6  },
};

interface MonsterConfig {
  name:   string;
  folder: string;
  type:   'sheet' | 'individual';
  frames: Record<ActionState, number>;
}

const MONSTER_CONFIGS: MonsterConfig[] = [
  { name: 'ساحر النار',     folder: 'monster1', type: 'sheet',
    frames: { idle: 8, run: 8, attack: 8, attack2: 8,  hurt: 4, death: 5  } },
  { name: 'جالب الموت',     folder: 'monster2', type: 'individual',
    frames: { idle: 8, run: 8, attack: 10, attack2: 9, hurt: 3, death: 10 } },
  { name: 'سيد الظلام',     folder: 'monster3', type: 'sheet',
    frames: { idle: 8, run: 8, attack: 8, attack2: 8,  hurt: 3, death: 7  } },
  { name: 'الفارس المتمرد', folder: 'monster4', type: 'sheet',
    frames: { idle: 11, run: 8, attack: 7, attack2: 7, hurt: 4, death: 11 } },
];

// ── Path resolver (keeps original logic + adds run / attack2) ──────────────
function getSpritePath(folder: string, type: string, action: ActionState, frame: number): string {
  if (type === 'individual') {
    let actionName: string;
    if      (action === 'run'     )               actionName = 'Idle';
    else if (action === 'attack'  )               actionName = 'Attack';
    else if (action === 'attack2' )               actionName = 'Cast';
    else if (action === 'hurt'    )               actionName = 'Hurt';
    else if (action === 'death'   )               actionName = 'Death';
    else                                          actionName = 'Idle';
    return `/src/assets/combat/${folder}/Individual Sprite/${actionName}/Bringer-of-Death_${actionName}_${frame}.png`;
  }

  const sub = (folder === 'hero3' || folder.startsWith('monster')) ? 'Sprites/' : '';
  let fileName = 'Idle.png';

  if (action === 'run') {
    fileName = folder === 'monster1' ? 'Move.png' : 'Run.png';
  } else if (action === 'attack') {
    if      (folder === 'hero2'   ) fileName = 'Attack_1.png';
    else if (folder === 'monster1') fileName = 'Attack.png';
    else                            fileName = 'Attack1.png';
  } else if (action === 'attack2') {
    if      (folder === 'hero2'   ) fileName = 'Attack_2.png';
    else if (folder === 'monster1') fileName = 'Attack.png';
    else                            fileName = 'Attack2.png';
  } else if (action === 'hurt') {
    if      (folder === 'hero1' || folder === 'hero2') fileName = 'Hit.png';
    else if (folder === 'monster3'                   ) fileName = 'Take hit.png';
    else                                               fileName = 'Take Hit.png';
  } else if (action === 'death') {
    fileName = 'Death.png';
  }

  return `/src/assets/combat/${folder}/${sub}${fileName}`;
}

// ══════════════════════════════════════════════════════════════════════════
// DynamicSprite — unchanged getPath logic, added flip + run/attack2 support
// ══════════════════════════════════════════════════════════════════════════
interface SpriteProps {
  folder:  string;
  action:  ActionState;
  frames:  Record<ActionState, number>;
  isHero:  boolean;
  type:    'sheet' | 'individual';
  flipped?: boolean;   // extra flip for running-back direction
}

const DynamicSprite = ({ folder, action, frames, isHero, type, flipped = false }: SpriteProps) => {
  const [frame, setFrame] = useState(1);
  const totalFrames = frames[action] ?? 1;

  useEffect(() => {
    setFrame(1);
    const timer = setInterval(() => {
      setFrame(prev => (prev % totalFrames) + 1);
    }, FRAME_MS);
    return () => clearInterval(timer);
  }, [action, totalFrames]);

  // isHero=true  + flipped=false → no flip  (hero faces right)
  // isHero=true  + flipped=true  → flip     (hero runs back, faces left)
  // isHero=false + flipped=false → flip     (monster faces left toward hero)
  // isHero=false + flipped=true  → no flip  (monster runs back, faces right)
  const shouldFlip = isHero ? flipped : !flipped;

  const posX = totalFrames > 1 ? ((frame - 1) / (totalFrames - 1)) * 100 : 0;

  return (
    <div
      className="w-48 h-48 sm:w-64 sm:h-64 md:w-72 md:h-72 lg:w-80 lg:h-80"
      style={{
        backgroundImage:    `url('${getSpritePath(folder, type, action, frame)}')`,
        backgroundSize:     type === 'individual' ? 'contain' : `${totalFrames * 100}% 100%`,
        backgroundPosition: type === 'individual' ? 'center'  : `${posX}% center`,
        backgroundRepeat:   'no-repeat',
        imageRendering:     'pixelated',
        transform:          `scaleX(${shouldFlip ? -1 : 1})`,
        transition:         'none',
      }}
    />
  );
};

// ══════════════════════════════════════════════════════════════════════════
// BattleScreen
// ══════════════════════════════════════════════════════════════════════════
const BattleScreen = ({ islandId, onBack, onVictory, onDefeat }: Props) => {
  const { currentPlayer } = useGame();

  const island   = ISLANDS.find(is => is.id === islandId);
  const heroData = CHARACTERS.find(c => c.id === currentPlayer?.characterId);

  // ── HP ──────────────────────────────────────────────────────────────────
  const [heroHP,        setHeroHP]        = useState(100);
  const [monsterHP,     setMonsterHP]     = useState(100);
  const [heroHPGhost,   setHeroHPGhost]   = useState(100);
  const [monsterHPGhost,setMonsterHPGhost]= useState(100);

  // ── Animation ───────────────────────────────────────────────────────────
  const [heroAction,    setHeroAction]    = useState<ActionState>('idle');
  const [monsterAction, setMonsterAction] = useState<ActionState>('idle');
  const [heroCharge,    setHeroCharge]    = useState(false);   // hero moving right
  const [heroReturn,    setHeroReturn]    = useState(false);   // hero moving back left
  const [heroFlipped,   setHeroFlipped]   = useState(false);   // hero facing left
  const [monsterCharge, setMonsterCharge] = useState(false);   // monster moving left
  const [monsterReturn, setMonsterReturn] = useState(false);   // monster moving right
  const [monsterFlipped,setMonsterFlipped]= useState(false);   // monster facing right
  const [attackVariant, setAttackVariant] = useState<'attack' | 'attack2'>('attack');

  // ── VFX ─────────────────────────────────────────────────────────────────
  const [showResult,  setShowResult]  = useState<'none' | 'correct' | 'wrong'>('none');
  const [showImpact,  setShowImpact]  = useState(false);
  const [cameraZoom,  setCameraZoom]  = useState(false);
  const [screenShake, setScreenShake] = useState(false);
  const [gameResult,  setGameResult]  = useState<GameResult>('none');

  // ── Stats ────────────────────────────────────────────────────────────────
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [wrongAnswers,   setWrongAnswers]   = useState(0);

  // ── Refs ─────────────────────────────────────────────────────────────────
  const timers       = useRef<ReturnType<typeof setTimeout>[]>([]);
  const gameOverRef  = useRef(false);

  const addTimer = (fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timers.current.push(t);
    return t;
  };
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  // ── Monster config ────────────────────────────────────────────────────────
  const monsterData = useMemo<MonsterConfig>(() => {
    return MONSTER_CONFIGS[islandId % 4];
  }, [islandId]);

  const heroFrames = useMemo<Record<ActionState, number>>(() => {
    return HERO_FRAMES[heroData?.folder ?? 'hero1'] ?? HERO_FRAMES['hero1'];
  }, [heroData]);

  // ── Ghost HP ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setHeroHPGhost(heroHP), 900);
    return () => clearTimeout(t);
  }, [heroHP]);

  useEffect(() => {
    const t = setTimeout(() => setMonsterHPGhost(monsterHP), 900);
    return () => clearTimeout(t);
  }, [monsterHP]);

  // ── Death detection ───────────────────────────────────────────────────────
  useEffect(() => {
    if (monsterHP <= 0 && !gameOverRef.current) {
      gameOverRef.current = true;
      setMonsterAction('death');
      addTimer(() => setGameResult('victory'), monsterData.frames.death * FRAME_MS + 200);
    }
  }, [monsterHP]);

  useEffect(() => {
    if (heroHP <= 0 && !gameOverRef.current) {
      gameOverRef.current = true;
      setHeroAction('death');
      addTimer(() => setGameResult('defeat'), heroFrames.death * FRAME_MS + 200);
    }
  }, [heroHP]);

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!currentPlayer) return <div className="min-h-screen bg-black text-white flex items-center justify-center text-2xl">خطأ: بيانات اللاعب غير موجودة!</div>;
  if (!island)        return <div className="min-h-screen bg-black text-white flex items-center justify-center text-2xl">خطأ: الجزيرة غير موجودة!</div>;
  if (!heroData)      return <div className="min-h-screen bg-black text-white flex items-center justify-center text-2xl">خطأ: بيانات البطل غير موجودة!</div>;

  const isLocked = heroAction !== 'idle' || monsterAction !== 'idle' || gameResult !== 'none';

  // ── Answer handler ────────────────────────────────────────────────────────
  const handleAnswer = (index: number) => {
    if (isLocked) return;
    const q = island.question as any;
    const correct = q.correctIndex ?? q.correctAnswerIndex ?? q.correctOption ?? 0;
    if (index === correct) { setCorrectAnswers(p => p + 1); executeHeroAttack();   }
    else                   { setWrongAnswers(p => p + 1);   executeMonsterAttack(); }
  };

  // ── Epic Hero Attack ──────────────────────────────────────────────────────
  const executeHeroAttack = () => {
    const variant   = attackVariant;
    const atkFrames = heroFrames[variant];
    const atkMs     = atkFrames * FRAME_MS;
    const halfAtk   = Math.floor(atkMs / 2);
    setAttackVariant(prev => prev === 'attack' ? 'attack2' : 'attack');

    setShowResult('correct');
    setCameraZoom(true);

    // 1. Hero starts running toward monster
    setHeroAction('run');
    setHeroCharge(true);
    setHeroReturn(false);
    setHeroFlipped(false);

    // 2. Hero arrives — play attack
    addTimer(() => {
      setHeroCharge(false);
      setHeroAction(variant);
    }, CHARGE_MS);

    // 3. Impact at midpoint of attack
    addTimer(() => {
      setShowImpact(true);
      setScreenShake(true);
      setMonsterAction('hurt');
      setMonsterHP(prev => Math.max(0, prev - 50));
    }, CHARGE_MS + halfAtk);

    addTimer(() => { setShowImpact(false); setScreenShake(false); }, CHARGE_MS + halfAtk + 180);
    addTimer(() => setCameraZoom(false),                            CHARGE_MS + halfAtk + 300);

    // 4. Attack done — hero runs back (flipped)
    addTimer(() => {
      setHeroAction('run');
      setHeroFlipped(true);
      setHeroReturn(true);
    }, CHARGE_MS + atkMs);

    // 5. Hero back home — reset everything
    addTimer(() => {
      setHeroAction('idle');
      setHeroFlipped(false);
      setHeroReturn(false);
      setMonsterAction('idle');
      setShowResult('none');
    }, CHARGE_MS + atkMs + RETURN_MS);
  };

  // ── Epic Monster Attack ───────────────────────────────────────────────────
  const executeMonsterAttack = () => {
    const variant   = 'attack';
    const atkFrames = monsterData.frames[variant];
    const atkMs     = atkFrames * FRAME_MS;
    const halfAtk   = Math.floor(atkMs / 2);

    setShowResult('wrong');

    // 1. Monster runs toward hero (facing right = flipped=true)
    setMonsterAction('run');
    setMonsterFlipped(true);
    setMonsterCharge(true);
    setMonsterReturn(false);

    // 2. Monster arrives — play attack
    addTimer(() => {
      setMonsterCharge(false);
      setMonsterAction(variant);
      setMonsterFlipped(true);
    }, CHARGE_MS);

    // 3. Hero takes hit at midpoint
    addTimer(() => {
      setHeroAction('hurt');
      setHeroHP(prev => Math.max(0, prev - 25));
      setScreenShake(true);
    }, CHARGE_MS + halfAtk);

    addTimer(() => setScreenShake(false), CHARGE_MS + halfAtk + 180);

    // 4. Monster runs back (faces left again = flipped=false)
    addTimer(() => {
      setMonsterAction('run');
      setMonsterFlipped(false);
      setMonsterReturn(true);
    }, CHARGE_MS + atkMs);

    // 5. Monster home — reset
    addTimer(() => {
      setMonsterAction('idle');
      setMonsterFlipped(false);
      setMonsterReturn(false);
      setHeroAction('idle');
      setShowResult('none');
    }, CHARGE_MS + atkMs + RETURN_MS);
  };

  const bgUrl = `/src/assets/combat/monster4/islands/island${islandId + 1}.png`;

  // ── CSS translate values for charge/return ────────────────────────────────
  const heroTranslate = heroCharge  ? 'translateX(clamp(120px,28vw,380px))'
                       : heroReturn  ? 'translateX(0)'
                       : 'translateX(0)';

  const monsterTranslate = monsterCharge  ? 'translateX(clamp(-380px,-28vw,-120px))'
                          : monsterReturn  ? 'translateX(0)'
                          : 'translateX(0)';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      dir="ltr"
      className={`relative min-h-screen flex flex-col items-center justify-between overflow-hidden ${screenShake ? 'battle-shake' : ''}`}
    >
      {/* ── Background parallax ── */}
      <div
        className="absolute inset-0 bg-center bg-cover battle-bg-parallax"
        style={{ backgroundImage: `url('${bgUrl}')` }}
      />
      <div className="absolute inset-0 bg-black/50" />

      {/* ── Cinematic vignette ── */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-500"
        style={{ boxShadow: cameraZoom ? 'inset 0 0 160px rgba(0,0,0,0.75)' : 'none' }}
      />

      {/* ═══════════════════════════════════════════════════════════════════
          HP BARS
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="relative z-20 w-full max-w-6xl flex justify-between items-center gap-4 p-3 md:p-5">

        {/* Hero HP */}
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1">
            <span className="text-cyan-300 font-bold text-xs md:text-sm tracking-wide"
              style={{ textShadow: '0 0 10px rgba(6,182,212,0.9)' }}>
              {currentPlayer.name}
            </span>
            <span className="text-cyan-400/70 font-mono text-xs">{heroHP}/100</span>
          </div>
          <div className="relative h-4 md:h-5 bg-black/80 rounded-full overflow-hidden border border-cyan-500/40"
            style={{ boxShadow: '0 0 12px rgba(6,182,212,0.22)' }}>
            <div className="absolute inset-y-0 left-0 rounded-full bg-white/22"
              style={{ width: `${heroHPGhost}%`, transition: 'width 900ms ease-out' }} />
            <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${heroHP}%`,
                background: 'linear-gradient(90deg,#0e7490,#22d3ee,#a5f3fc)',
                boxShadow: '0 0 10px rgba(6,182,212,0.85), inset 0 1px 0 rgba(255,255,255,0.3)',
              }} />
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/20 to-transparent" />
          </div>
        </div>

        <div className="px-2 md:px-5 text-white text-lg md:text-2xl font-black"
          style={{ textShadow: '0 0 14px rgba(255,255,255,0.55)' }}>⚔️</div>

        {/* Monster HP */}
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1">
            <span className="text-red-400/70 font-mono text-xs">{monsterHP}/100</span>
            <span className="text-red-400 font-bold text-xs md:text-sm tracking-wide"
              style={{ textShadow: '0 0 10px rgba(239,68,68,0.9)' }}>
              {monsterData.name}
            </span>
          </div>
          <div className="relative h-4 md:h-5 bg-black/80 rounded-full overflow-hidden border border-red-500/40"
            style={{ boxShadow: '0 0 12px rgba(239,68,68,0.22)' }}>
            <div className="absolute inset-y-0 right-0 rounded-full bg-white/22"
              style={{ width: `${monsterHPGhost}%`, transition: 'width 900ms ease-out' }} />
            <div className="absolute inset-y-0 right-0 rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${monsterHP}%`,
                background: 'linear-gradient(270deg,#7f1d1d,#ef4444,#fca5a5)',
                boxShadow: '0 0 10px rgba(239,68,68,0.85), inset 0 1px 0 rgba(255,255,255,0.3)',
              }} />
            <div className="absolute inset-y-0 rounded-full bg-gradient-to-b from-white/20 to-transparent" />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          BATTLE ARENA
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        className="relative z-10 w-full max-w-7xl h-[42vh] flex items-end justify-between px-4 sm:px-12 md:px-24 pb-6"
        style={{
          transform: cameraZoom ? 'scale(1.07)' : 'scale(1)',
          transition: 'transform 0.45s cubic-bezier(0.34,1.56,0.64,1)',
          transformOrigin: 'center bottom',
        }}
      >
        {/* ── Hero (left) ── */}
        <div
          style={{
            transform: heroTranslate,
            transition: (heroCharge || heroReturn) ? `transform ${heroCharge ? CHARGE_MS : RETURN_MS}ms ease-in-out` : 'none',
          }}
        >
          <DynamicSprite
            folder={heroData.folder}
            action={heroAction}
            frames={heroFrames}
            isHero={true}
            type="sheet"
            flipped={heroFlipped}
          />
        </div>

        {/* ── Monster (right) + impact flash ── */}
        <div className="relative">
          {showImpact && (
            <div className="absolute inset-0 z-20 pointer-events-none">
              <div className="absolute inset-0 rounded-xl bg-white/70 battle-flash" />
              <span className="absolute top-[20%] left-[15%] text-3xl battle-pop-0">💥</span>
              <span className="absolute top-[35%] right-[15%] text-2xl battle-pop-1">⭐</span>
              <span className="absolute bottom-[30%] left-[35%] text-xl battle-pop-2">✨</span>
            </div>
          )}
          <div
            style={{
              transform: monsterTranslate,
              transition: (monsterCharge || monsterReturn) ? `transform ${monsterCharge ? CHARGE_MS : RETURN_MS}ms ease-in-out` : 'none',
            }}
          >
            <DynamicSprite
              folder={monsterData.folder}
              action={monsterAction}
              frames={monsterData.frames}
              isHero={false}
              type={monsterData.type}
              flipped={monsterFlipped}
            />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          QUESTION PANEL — Glassmorphism
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="relative z-20 w-full max-w-5xl mx-auto px-2 pb-2">
        <div
          className="rounded-3xl p-5 md:p-9 shadow-2xl border border-white/10"
          style={{
            background: 'linear-gradient(135deg,rgba(6,182,212,0.09) 0%,rgba(0,0,0,0.82) 55%,rgba(6,182,212,0.05) 100%)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            boxShadow: '0 0 50px rgba(6,182,212,0.1),0 25px 60px rgba(0,0,0,0.75),inset 0 1px 0 rgba(255,255,255,0.1)',
          }}
        >
          <h3 className="text-center text-base md:text-xl font-bold mb-5 text-white leading-relaxed" dir="rtl">
            {island.question.text}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {island.question.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={isLocked}
                dir="rtl"
                className="group relative p-4 md:p-5 rounded-2xl text-sm md:text-base font-bold text-right border transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 overflow-hidden"
                style={{
                  background:   'rgba(255,255,255,0.05)',
                  borderColor:  'rgba(255,255,255,0.10)',
                }}
              >
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: 'linear-gradient(135deg,rgba(6,182,212,0.18),rgba(6,182,212,0.04))' }} />
                <div className="absolute inset-0 rounded-2xl border border-cyan-400/0 group-hover:border-cyan-400/55 transition-all duration-300" />
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ boxShadow: 'inset 0 0 22px rgba(6,182,212,0.2),0 0 16px rgba(6,182,212,0.15)' }} />
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
        className="absolute top-3 left-3 z-30 px-4 py-2 bg-black/60 hover:bg-red-900/80 rounded-full text-white font-bold transition-all border border-white/20 text-xs md:text-sm backdrop-blur-sm"
      >
        🏳️ انسحاب
      </button>

      {/* ── Answer flash ── */}
      {showResult !== 'none' && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div
            className={`text-6xl md:text-9xl font-black drop-shadow-2xl ${showResult === 'correct' ? 'text-green-400' : 'text-red-400'}`}
            style={{ animation: 'battleResultPop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
          >
            {showResult === 'correct' ? '✅' : '❌'}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          VICTORY MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {gameResult === 'victory' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xl">
          <div
            className="relative max-w-md w-full mx-4 rounded-3xl p-8 text-center border border-yellow-400/30 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg,rgba(234,179,8,0.14) 0%,rgba(0,0,0,0.93) 65%)',
              boxShadow: '0 0 80px rgba(234,179,8,0.32),0 0 160px rgba(234,179,8,0.08)',
              animation: 'battleResultPop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards',
            }}
          >
            <div className="text-6xl mb-3">🏆</div>
            <h2 className="text-3xl font-black text-yellow-400 mb-1"
              style={{ textShadow: '0 0 26px rgba(234,179,8,0.95)' }}>انتصار!</h2>
            <p className="text-white/55 mb-5 text-sm" dir="rtl">لقد هزمت {monsterData.name}</p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="rounded-2xl p-4 border border-white/10 bg-white/5">
                <div className="text-green-400 text-2xl font-black">{correctAnswers}</div>
                <div className="text-white/50 text-xs mt-1" dir="rtl">إجابات صحيحة</div>
              </div>
              <div className="rounded-2xl p-4 border border-white/10 bg-white/5">
                <div className="text-red-400 text-2xl font-black">{wrongAnswers}</div>
                <div className="text-white/50 text-xs mt-1" dir="rtl">إجابات خاطئة</div>
              </div>
            </div>
            <button
              onClick={onVictory}
              className="w-full py-4 rounded-2xl font-black text-lg text-black active:scale-95 transition-all"
              style={{
                background: 'linear-gradient(135deg,#ca8a04,#eab308,#fde047)',
                boxShadow: '0 0 34px rgba(234,179,8,0.6),0 4px 18px rgba(0,0,0,0.4)',
              }}
            >
              متابعة المغامرة ←
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          DEFEAT MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {gameResult === 'defeat' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 backdrop-blur-xl">
          <div
            className="relative max-w-md w-full mx-4 rounded-3xl p-8 text-center border border-red-500/30 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg,rgba(239,68,68,0.13) 0%,rgba(0,0,0,0.94) 65%)',
              boxShadow: '0 0 80px rgba(239,68,68,0.28),0 0 160px rgba(239,68,68,0.07)',
              animation: 'battleResultPop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards',
            }}
          >
            <div className="text-6xl mb-3">💀</div>
            <h2 className="text-3xl font-black text-red-400 mb-1"
              style={{ textShadow: '0 0 26px rgba(239,68,68,0.95)' }}>هُزِمت!</h2>
            <p className="text-white/55 mb-5 text-sm" dir="rtl">{monsterData.name} كان أقوى هذه المرة</p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="rounded-2xl p-4 border border-white/10 bg-white/5">
                <div className="text-green-400 text-2xl font-black">{correctAnswers}</div>
                <div className="text-white/50 text-xs mt-1" dir="rtl">إجابات صحيحة</div>
              </div>
              <div className="rounded-2xl p-4 border border-white/10 bg-white/5">
                <div className="text-red-400 text-2xl font-black">{wrongAnswers}</div>
                <div className="text-white/50 text-xs mt-1" dir="rtl">إجابات خاطئة</div>
              </div>
            </div>
            <button
              onClick={onDefeat}
              className="w-full py-4 rounded-2xl font-black text-lg text-white active:scale-95 transition-all"
              style={{
                background: 'linear-gradient(135deg,#7f1d1d,#ef4444,#f87171)',
                boxShadow: '0 0 34px rgba(239,68,68,0.48),0 4px 18px rgba(0,0,0,0.4)',
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
          animation: battleBgZoom 24s ease-in-out infinite alternate;
          transform: scale(1.12);
        }
        @keyframes battleBgZoom {
          0%   { transform: scale(1.12) translate(0%,0%);    }
          50%  { transform: scale(1.18) translate(0.5%,0.4%); }
          100% { transform: scale(1.12) translate(-0.5%,-0.4%); }
        }
        @keyframes battleResultPop {
          0%   { transform: scale(0.2) rotate(-12deg); opacity: 0; }
          65%  { transform: scale(1.2) rotate(4deg);   opacity: 1; }
          100% { transform: scale(1)   rotate(0deg);   opacity: 1; }
        }
        .battle-shake { animation: battleShake 0.35s ease both; }
        @keyframes battleShake {
          0%,100% { transform: translate(0,0); }
          20%  { transform: translate(-5px, 2px); }
          40%  { transform: translate(5px,-2px);  }
          60%  { transform: translate(-4px, 3px); }
          80%  { transform: translate(4px,-1px);  }
        }
        .battle-flash { animation: battleFlash 0.18s ease forwards; }
        @keyframes battleFlash {
          0%   { opacity: 0.75; }
          100% { opacity: 0;    }
        }
        .battle-pop-0 { animation: battleResultPop 0.28s ease forwards; }
        .battle-pop-1 { animation: battleResultPop 0.28s 0.05s ease both; opacity:0; }
        .battle-pop-2 { animation: battleResultPop 0.28s 0.10s ease both; opacity:0; }
      `}</style>
    </div>
  );
};

export default BattleScreen;
