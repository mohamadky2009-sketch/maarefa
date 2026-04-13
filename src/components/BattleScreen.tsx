import { useState, useEffect, useMemo, useRef, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { ISLANDS, CHARACTERS } from '@/lib/gameState';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Props {
  planetId:  number;
  islandId:  number;
  onBack:    () => void;
  onVictory: () => void;
  onDefeat:  () => void;
}

type ActionState = 'idle' | 'run' | 'attack' | 'attack2' | 'hurt' | 'death';
type GameResult  = 'none' | 'victory' | 'defeat';
type CharPos     = 'home' | 'charging' | 'atEnemy' | 'returning';

interface FloatNum { id: number; value: number; target: 'hero' | 'monster'; }

// ─────────────────────────────────────────────────────────────────────────────
// Timing
// ─────────────────────────────────────────────────────────────────────────────
const FRAME_MS  = 110;
const CHARGE_MS = 480;
const RETURN_MS = 420;

// ─────────────────────────────────────────────────────────────────────────────
// SPRITE SHEET DATA
// ─────────────────────────────────────────────────────────────────────────────

interface HeroConfig {
  facesRight: boolean;
  frameH:     number;
  frames:     Record<ActionState, number>;
  sheetW:     Record<ActionState, number>;
}

const HERO_CONFIGS: Record<string, HeroConfig> = {
  hero1: {
    facesRight: true, frameH: 190,
    frames: { idle: 6,  run: 8, attack: 8, attack2: 8, hurt: 4,  death: 7  },
    sheetW: { idle: 1386, run: 1848, attack: 1848, attack2: 1848, hurt: 924, death: 1617 },
  },
  hero2: {
    facesRight: true, frameH: 155,
    frames: { idle: 6,  run: 8,  attack: 6,  attack2: 6,  hurt: 4,  death: 11 },
    sheetW: { idle: 930, run: 1240, attack: 930, attack2: 930, hurt: 620, death: 1705 },
  },
  hero3: {
    facesRight: true, frameH: 200,
    frames: { idle: 8,  run: 8,  attack: 6,  attack2: 6,  hurt: 4,  death: 6  },
    sheetW: { idle: 1600, run: 1600, attack: 1200, attack2: 1200, hurt: 800, death: 1200 },
  },
};

interface MonsterConfig {
  name:       string;
  folder:     string;
  type:       'sheet' | 'individual';
  facesRight: boolean;
  frameH:     number;
  frames:     Record<ActionState, number>;
  sheetW:     Record<ActionState, number>;
}

const MONSTER2_FRAME_W = 140;
const MONSTER2_FRAME_H = 93;

const MONSTER_CONFIGS: MonsterConfig[] = [
  {
    name: 'ساحر النار', folder: 'monster1', type: 'sheet', facesRight: false, frameH: 150,
    frames: { idle: 8, run: 8, attack: 8, attack2: 8, hurt: 4, death: 5 },
    sheetW: { idle: 1200, run: 1200, attack: 1200, attack2: 1200, hurt: 600, death: 750 },
  },
  {
    name: 'جالب الموت', folder: 'monster2', type: 'individual', facesRight: false, frameH: MONSTER2_FRAME_H,
    frames: { idle: 8, run: 8, attack: 10, attack2: 9, hurt: 3, death: 10 },
    sheetW: { idle: 140, run: 140, attack: 140, attack2: 140, hurt: 140, death: 140 },
  },
  {
    name: 'سيد الظلام', folder: 'monster3', type: 'sheet', facesRight: false, frameH: 250,
    frames: { idle: 8, run: 8, attack: 8, attack2: 8, hurt: 3, death: 7 },
    sheetW: { idle: 2000, run: 2000, attack: 2000, attack2: 2000, hurt: 750, death: 1750 },
  },
  {
    name: 'الفارس المتمرد', folder: 'monster4', type: 'sheet', facesRight: true, frameH: 180,
    frames: { idle: 11, run: 8, attack: 7, attack2: 7, hurt: 4, death: 11 },
    sheetW: { idle: 1980, run: 1440, attack: 1260, attack2: 1260, hurt: 720, death: 1980 },
  },
];
// ─────────────────────────────────────────────────────────────────────────────
// Path resolver
// ─────────────────────────────────────────────────────────────────────────────
function getSpritePath(folder: string, type: string, action: ActionState, frame: number): string {
  if (type === 'individual') {
    const nameMap: Partial<Record<ActionState, string>> = {
      idle: 'Idle', run: 'Idle', attack: 'Attack', attack2: 'Cast', hurt: 'Hurt', death: 'Death',
    };
    const n = nameMap[action] ?? 'Idle';
    return `/src/assets/combat/${folder}/Individual Sprite/${n}/Bringer-of-Death_${n}_${frame}.png`;
  }
  const sub = (folder === 'hero3' || folder.startsWith('monster')) ? 'Sprites/' : '';
  let file = 'Idle.png';
  if      (action === 'run')     file = folder === 'monster1' ? 'Move.png' : 'Run.png';
  else if (action === 'attack')  { if (folder === 'hero2') file = 'Attack_1.png'; else if (folder === 'monster1') file = 'Attack.png'; else file = 'Attack1.png'; }
  else if (action === 'attack2') { if (folder === 'hero2') file = 'Attack_2.png'; else if (folder === 'monster1') file = 'Attack.png'; else file = 'Attack2.png'; }
  else if (action === 'hurt')    { if (folder === 'hero1' || folder === 'hero2') file = 'Hit.png'; else if (folder === 'monster3') file = 'Take hit.png'; else file = 'Take Hit.png'; }
  else if (action === 'death')   file = 'Death.png';
  return `/src/assets/combat/${folder}/${sub}${file}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Preloader
// ─────────────────────────────────────────────────────────────────────────────
function preloadImage(src: string): Promise<void> {
  return new Promise(r => { const i = new Image(); i.onload = i.onerror = () => r(); i.src = src; });
}

function buildPreloadList(heroFolder: string, monster: MonsterConfig, bgUrl: string): string[] {
  const paths = [bgUrl];
  const all: ActionState[] = ['idle', 'run', 'attack', 'attack2', 'hurt', 'death'];
  all.forEach(a => paths.push(getSpritePath(heroFolder, 'sheet', a, 1)));
  if (monster.type === 'individual') {
    const sets: [string, number][] = [['Idle', 6], ['Attack', 10], ['Cast', 9], ['Hurt', 3], ['Death', 10]];
    sets.forEach(([n, c]) => { for (let i = 1; i <= c; i++) paths.push(`/src/assets/combat/monster2/Individual Sprite/${n}/Bringer-of-Death_${n}_${i}.png`); });
  } else {
    all.forEach(a => paths.push(getSpritePath(monster.folder, 'sheet', a, 1)));
  }
  return paths;
}

// ─────────────────────────────────────────────────────────────────────────────
// DynamicSprite
// ─────────────────────────────────────────────────────────────────────────────
const DISPLAY_H = 256;

interface SpriteProps {
  folder:     string;
  action:     ActionState;
  frameCount: number;
  sheetW:     number;
  frameH:     number;
  isHero:     boolean;
  type:       'sheet' | 'individual';
  flipped:    boolean;
  facesRight: boolean;
  isHurt:     boolean;
}

const DynamicSprite = memo(({
  folder, action, frameCount, sheetW, frameH,
  isHero, type, flipped, facesRight, isHurt,
}: SpriteProps) => {
  const [frame, setFrame] = useState(1);

  useEffect(() => {
    setFrame(1);
    const id = setInterval(() => setFrame(f => (f % frameCount) + 1), FRAME_MS);
    return () => clearInterval(id);
  }, [action, frameCount]);

  const scaleX     = (isHero === (facesRight !== flipped)) ? 1 : -1;
  const hurtFilter = isHurt ? 'brightness(10) saturate(0)' : 'none';

  if (type === 'individual') {
    const src   = getSpritePath(folder, type, action, frame);
    const scale = DISPLAY_H / MONSTER2_FRAME_H;
    const dW    = MONSTER2_FRAME_W * scale;
    return (
      <div style={{
        width: dW, height: DISPLAY_H,
        backgroundImage:    `url('${src}')`,
        backgroundSize:     `${dW}px ${DISPLAY_H}px`,
        backgroundPosition: 'center center',
        backgroundRepeat:   'no-repeat',
        imageRendering:     'pixelated',
        transform:          `scaleX(${scaleX})`,
        filter:             hurtFilter,
        willChange:         'filter, transform',
      }} />
    );
  }

  const src     = getSpritePath(folder, type, action, frame);
  const scale   = DISPLAY_H / frameH;
  const frameW  = sheetW / frameCount;
  const dFrameW = frameW * scale;
  const dSheetW = sheetW * scale;
  const bgX     = -((frame - 1) * dFrameW);

  return (
    <div style={{
      width:              dFrameW,
      height:             DISPLAY_H,
      backgroundImage:    `url('${src}')`,
      backgroundSize:     `${dSheetW}px ${DISPLAY_H}px`,
      backgroundPosition: `${bgX}px 0px`,
      backgroundRepeat:   'no-repeat',
      imageRendering:     'pixelated',
      transform:          `scaleX(${scaleX})`,
      filter:             hurtFilter,
      willChange:         'background-position, filter, transform',
    }} />
  );
});
// ─────────────────────────────────────────────────────────────────────────────
// BattleScreen
// ─────────────────────────────────────────────────────────────────────────────
const BattleScreen = ({ islandId, onBack, onVictory, onDefeat }: Props) => {
  const { currentPlayer } = useGame();

  const island     = ISLANDS.find(is => is.id === islandId);
  const heroData   = CHARACTERS.find(c => c.id === currentPlayer?.characterId);
  const monster    = useMemo(() => MONSTER_CONFIGS[islandId % 4], [islandId]);
  const heroConfig = useMemo<HeroConfig>(
    () => HERO_CONFIGS[heroData?.folder ?? 'hero1'] ?? HERO_CONFIGS['hero1'],
    [heroData],
  );
  const bgUrl = `/src/assets/combat/monster4/islands/island${islandId + 1}.png`;

  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!heroData || !island) return;
    Promise.all(buildPreloadList(heroData.folder, monster, bgUrl).map(preloadImage))
      .then(() => setReady(true));
  }, []);

  const [heroHP,         setHeroHP]         = useState(100);
  const [monsterHP,      setMonsterHP]      = useState(100);
  const [heroHPGhost,    setHeroHPGhost]    = useState(100);
  const [monsterHPGhost, setMonsterHPGhost] = useState(100);

  const [heroAction,     setHeroAction]     = useState<ActionState>('idle');
  const [monsterAction,  setMonsterAction]  = useState<ActionState>('idle');
  const [heroPos,        setHeroPos]        = useState<CharPos>('home');
  const [monsterPos,     setMonsterPos]     = useState<CharPos>('home');
  const [heroFlipped,    setHeroFlipped]    = useState(false);
  const [monsterFlipped, setMonsterFlipped] = useState(false);
  const [attackVar,      setAttackVar]      = useState<'attack' | 'attack2'>('attack');
  const [heroHurt,       setHeroHurt]       = useState(false);
  const [monsterHurt,    setMonsterHurt]    = useState(false);

  const [showResult,     setShowResult]     = useState<'none' | 'correct' | 'wrong'>('none');
  const [showImpact,     setShowImpact]     = useState(false);
  const [showWhiteFlash, setShowWhiteFlash] = useState(false);
  const [cameraZoom,     setCameraZoom]     = useState(false);
  const [screenShake,    setScreenShake]    = useState(false);
  const [gameResult,     setGameResult]     = useState<GameResult>('none');

  const [floatNums, setFloatNums] = useState<FloatNum[]>([]);
  const floatId = useRef(0);
  const spawnFloat = useCallback((value: number, target: 'hero' | 'monster') => {
    const id = ++floatId.current;
    setFloatNums(prev => [...prev, { id, value, target }]);
    setTimeout(() => setFloatNums(prev => prev.filter(f => f.id !== id)), 1200);
  }, []);

  const [combo,      setCombo]      = useState(0);
  const [showCombo,  setShowCombo]  = useState(false);
  const comboTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [wrongAnswers,   setWrongAnswers]   = useState(0);
  const [damageDealt,    setDamageDealt]    = useState(0);
  const [damageReceived, setDamageReceived] = useState(0);

  const timers   = useRef<ReturnType<typeof setTimeout>[]>([]);
  const gameOver = useRef(false);
  const addTimer = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
  }, []);
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  useEffect(() => { const t = setTimeout(() => setHeroHPGhost(heroHP),       900); return () => clearTimeout(t); }, [heroHP]);
  useEffect(() => { const t = setTimeout(() => setMonsterHPGhost(monsterHP), 900); return () => clearTimeout(t); }, [monsterHP]);

  useEffect(() => {
    if (monsterHP <= 0 && !gameOver.current) {
      gameOver.current = true;
      setMonsterAction('death');
      addTimer(() => setGameResult('victory'), monster.frames.death * FRAME_MS + 500);
    }
  }, [monsterHP]);

  useEffect(() => {
    if (heroHP <= 0 && !gameOver.current) {
      gameOver.current = true;
      setHeroAction('death');
      addTimer(() => setGameResult('defeat'), heroConfig.frames.death * FRAME_MS + 500);
    }
  }, [heroHP]);

  if (!currentPlayer) return <Err msg="بيانات اللاعب غير موجودة!" />;
  if (!island)        return <Err msg="الجزيرة غير موجودة!" />;
  if (!heroData)      return <Err msg="بيانات البطل غير موجودة!" />;

  if (!ready) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-5">
        <div className="text-5xl animate-pulse">⚔️</div>
        <p className="text-white/70 text-base font-bold tracking-widest">جاري تحميل المعركة…</p>
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2.5 h-2.5 rounded-full bg-cyan-400"
              style={{ animation: `pulse 1s ${i * 0.2}s ease-in-out infinite` }} />
          ))}
        </div>
      </div>
    );
  }

  const isLocked = heroAction !== 'idle' || monsterAction !== 'idle' || gameResult !== 'none';

  const handleAnswer = (index: number) => {
    if (isLocked) return;
    const q     = island.question as any;
    const right = q.correctIndex ?? q.correctAnswerIndex ?? q.correctOption ?? 0;
    if (index === right) {
      setCorrectAnswers(p => p + 1);
      const nc = combo + 1;
      setCombo(nc);
      if (nc >= 2) {
        setShowCombo(true);
        if (comboTimer.current) clearTimeout(comboTimer.current);
        comboTimer.current = setTimeout(() => setShowCombo(false), 1800);
      }
      doHeroAttack();
    } else {
      setWrongAnswers(p => p + 1);
      setCombo(0);
      setShowCombo(false);
      doMonsterAttack();
    }
  };

  const doHeroAttack = () => {
    const variant = attackVar;
    const atkMs   = heroConfig.frames[variant] * FRAME_MS;
    const halfAtk = Math.floor(atkMs / 2);
    const hurtMs  = monster.frames.hurt * FRAME_MS;
    setAttackVar(v => v === 'attack' ? 'attack2' : 'attack');

    setShowResult('correct');
    setCameraZoom(true);
    setHeroAction('run');
    setHeroPos('charging');
    setHeroFlipped(false);

    addTimer(() => { setHeroPos('atEnemy'); setHeroAction(variant); }, CHARGE_MS);

    addTimer(() => {
      setShowImpact(true);
      setShowWhiteFlash(true);
      setScreenShake(true);
      setMonsterHurt(true);
      setMonsterAction('hurt');
      const dmg = 50;
      setMonsterHP(p => Math.max(0, p - dmg));
      setDamageDealt(p => p + dmg);
      spawnFloat(dmg, 'monster');
    }, CHARGE_MS + halfAtk);

    addTimer(() => setShowWhiteFlash(false),                           CHARGE_MS + halfAtk + 70);
    addTimer(() => { setShowImpact(false); setScreenShake(false); },   CHARGE_MS + halfAtk + 220);
    addTimer(() => setMonsterHurt(false),                              CHARGE_MS + halfAtk + 300);
    addTimer(() => setCameraZoom(false),                               CHARGE_MS + halfAtk + 400);

    const retreatAt = CHARGE_MS + Math.max(atkMs, halfAtk + hurtMs);
    addTimer(() => { setHeroAction('run'); setHeroFlipped(true); setHeroPos('returning'); }, retreatAt);
    addTimer(() => {
      setHeroAction('idle'); setHeroFlipped(false); setHeroPos('home');
      setMonsterAction('idle'); setShowResult('none');
    }, retreatAt + RETURN_MS);
  };

  const doMonsterAttack = () => {
    const atkMs   = monster.frames.attack * FRAME_MS;
    const halfAtk = Math.floor(atkMs / 2);
    const hurtMs  = heroConfig.frames.hurt * FRAME_MS;

    setShowResult('wrong');
    setMonsterAction('run');
    setMonsterFlipped(false);
    setMonsterPos('charging');

    addTimer(() => { setMonsterPos('atEnemy'); setMonsterAction('attack'); setMonsterFlipped(false); }, CHARGE_MS);

    addTimer(() => {
      setHeroAction('hurt');
      setHeroHurt(true);
      setShowWhiteFlash(true);
      setScreenShake(true);
      const dmg = 25;
      setHeroHP(p => Math.max(0, p - dmg));
      setDamageReceived(p => p + dmg);
      spawnFloat(dmg, 'hero');
    }, CHARGE_MS + halfAtk);

    addTimer(() => setShowWhiteFlash(false), CHARGE_MS + halfAtk + 70);
    addTimer(() => setScreenShake(false),    CHARGE_MS + halfAtk + 220);
    addTimer(() => setHeroHurt(false),       CHARGE_MS + halfAtk + 300);

    const retreatAt = CHARGE_MS + Math.max(atkMs, halfAtk + hurtMs);
    addTimer(() => { setMonsterAction('run'); setMonsterFlipped(true); setMonsterPos('returning'); }, retreatAt);
    addTimer(() => {
      setMonsterAction('idle'); setMonsterFlipped(false); setMonsterPos('home');
      setHeroAction('idle'); setShowResult('none');
    }, retreatAt + RETURN_MS);
  };

  const CHARGE_DIST = 'clamp(40px, 12vw, 240px)';
  const heroChargeX  = (heroPos    === 'charging' || heroPos    === 'atEnemy')
    ? `translateX(${CHARGE_DIST})`  : 'translateX(0)';
  const monChargeX   = (monsterPos === 'charging' || monsterPos === 'atEnemy')
    ? `translateX(calc(-1 * ${CHARGE_DIST}))` : 'translateX(0)';
  const heroMoveDur  = heroPos    === 'charging' ? CHARGE_MS : heroPos    === 'returning' ? RETURN_MS : 0;
  const monMoveDur   = monsterPos === 'charging' ? CHARGE_MS : monsterPos === 'returning' ? RETURN_MS : 0;

  const heroPct      = heroHP / 100;
  const monPct       = monsterHP / 100;
  const heroBarColor = heroPct > 0.5 ? '#22d3ee' : heroPct > 0.25 ? '#f59e0b' : '#ef4444';
  const monBarColor  = monPct  > 0.5 ? '#ef4444' : monPct  > 0.25 ? '#f97316' : '#fbbf24';

  const accuracy = correctAnswers + wrongAnswers > 0
    ? Math.round(correctAnswers / (correctAnswers + wrongAnswers) * 100) : 0;

  const idleBreath = {
    animate: { y: [0, -5, 0] },
    transition: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' as const },
  };
  const hurtShake = {
    animate: { x: [-7, 7, -6, 6, -4, 4, -2, 0] },
    transition: { duration: 0.35, ease: 'linear' as const },
  };
  const idleStop = { animate: { y: 0 }, transition: { duration: 0.15 } };

  const heroMotion    = heroHurt    ? hurtShake : heroAction    === 'idle' ? idleBreath : idleStop;
  const monsterMotion = monsterHurt ? hurtShake : monsterAction === 'idle' ? idleBreath : idleStop;
    return (
    <div
      dir="ltr"
      className="relative w-full bg-black"
      style={{
        minHeight: '100dvh',
        maxWidth: '100vw',
        overflowX: 'hidden',
        overflowY: 'hidden',
        animation: screenShake ? 'bsShake 0.38s ease both' : 'none',
      }}
    >
      {/* ── Background ── */}
      <div className="absolute inset-0 bg-center bg-cover"
        style={{ backgroundImage: `url('${bgUrl}')`, animation: 'bsBgZoom 24s ease-in-out infinite alternate', transform: 'scale(1.12)' }} />
      <div className="absolute inset-0 bg-black/60" />
      <div className="absolute inset-0 pointer-events-none transition-all duration-500"
        style={{ boxShadow: cameraZoom ? 'inset 0 0 220px rgba(0,0,0,0.88)' : 'inset 0 0 80px rgba(0,0,0,0.4)' }} />

      {/* ── Hit Flash ── */}
      {showWhiteFlash && (
        <div className="fixed inset-0 z-40 pointer-events-none"
          style={{ background: 'rgba(255,255,255,0.44)', animation: 'bsWhiteFlash 0.12s ease forwards' }} />
      )}

      {/* ══════ HP BARS ══════════════════════════════════════════════════════ */}
      <div className="relative z-20 w-full max-w-6xl mx-auto flex items-center gap-1 px-2 pt-1.5 pb-0.5 sm:gap-3 sm:px-4 sm:pt-3">
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-0.5">
            <span className="font-black truncate" style={{ fontSize: 'clamp(9px,2.5vw,13px)', color: '#67e8f9', textShadow: '0 0 10px #06b6d4' }}>
              {currentPlayer.name}
            </span>
            <span className="font-mono tabular-nums shrink-0 ml-1" style={{ fontSize: 'clamp(9px,2.5vw,12px)', color: heroBarColor }}>
              {heroHP}<span className="text-white/30">/100</span>
            </span>
          </div>
          <div className="relative rounded-full overflow-hidden"
            style={{
              height: 'clamp(8px,2.8vw,20px)',
              background: 'linear-gradient(180deg,#0a0a0a 0%,#1a1a1a 50%,#0d0d0d 100%)',
              border: `1px solid ${heroBarColor}55`,
              boxShadow: `0 0 12px ${heroBarColor}44, inset 0 1px 0 rgba(255,255,255,0.07)`,
              animation: heroHP < 30 ? 'bsCritPulse 0.7s ease-in-out infinite' : 'none',
            }}>
            <div className="absolute inset-y-0 left-0 rounded-full"
              style={{ width: `${heroHPGhost}%`, background: 'rgba(255,255,255,0.16)', transition: 'width 900ms cubic-bezier(0.4,0,0.2,1)' }} />
            <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
              style={{
                width: `${heroHP}%`,
                background: `linear-gradient(90deg,rgba(14,116,144,.9) 0%,${heroBarColor} 55%,rgba(207,250,254,.9) 100%)`,
                boxShadow: `0 0 12px ${heroBarColor}, inset 0 1px 0 rgba(255,255,255,0.3)`,
              }} />
            <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
              <div className="absolute inset-y-0 w-6 bg-white/22 blur-sm skew-x-12" style={{ animation: 'bsScan 2.5s linear infinite' }} />
            </div>
            <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-full pointer-events-none"
              style={{ background: 'linear-gradient(to bottom,rgba(255,255,255,.2),transparent)' }} />
          </div>
        </div>

        <span className="shrink-0 select-none" style={{ fontSize: 'clamp(12px,3.5vw,20px)', textShadow: '0 0 16px rgba(255,255,255,.7)' }}>⚔️</span>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-0.5">
            <span className="font-mono tabular-nums shrink-0 mr-1" style={{ fontSize: 'clamp(9px,2.5vw,12px)', color: monBarColor }}>
              {monsterHP}<span className="text-white/30">/100</span>
            </span>
            <span className="font-black truncate text-right" style={{ fontSize: 'clamp(9px,2.5vw,13px)', color: '#fca5a5', textShadow: '0 0 10px #ef4444' }}>
              {monster.name}
            </span>
          </div>
          <div className="relative rounded-full overflow-hidden"
            style={{
              height: 'clamp(8px,2.8vw,20px)',
              background: 'linear-gradient(180deg,#0a0a0a 0%,#1a1a1a 50%,#0d0d0d 100%)',
              border: `1px solid ${monBarColor}55`,
              boxShadow: `0 0 12px ${monBarColor}44, inset 0 1px 0 rgba(255,255,255,0.07)`,
              animation: monsterHP < 30 ? 'bsCritPulse 0.7s ease-in-out infinite' : 'none',
            }}>
            <div className="absolute inset-y-0 right-0 rounded-full"
              style={{ width: `${monsterHPGhost}%`, background: 'rgba(255,255,255,0.16)', transition: 'width 900ms cubic-bezier(0.4,0,0.2,1)' }} />
            <div className="absolute inset-y-0 right-0 rounded-full transition-all duration-300"
              style={{
                width: `${monsterHP}%`,
                background: `linear-gradient(270deg,rgba(127,29,29,.9) 0%,${monBarColor} 55%,rgba(255,224,200,.9) 100%)`,
                boxShadow: `0 0 12px ${monBarColor}, inset 0 1px 0 rgba(255,255,255,0.3)`,
              }} />
            <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none" style={{ transform: 'scaleX(-1)' }}>
              <div className="absolute inset-y-0 w-6 bg-white/22 blur-sm skew-x-12" style={{ animation: 'bsScan 2.9s linear infinite' }} />
            </div>
            <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-full pointer-events-none"
              style={{ background: 'linear-gradient(to bottom,rgba(255,255,255,.2),transparent)' }} />
          </div>
        </div>
      </div>

      {/* ══════ BATTLE ARENA ═════════════════════════════════════════════════ */}
      <div
        className="relative z-10 w-full transition-transform duration-500 overflow-hidden"
        style={{
          height: 'clamp(140px, 32vh, 360px)',
          transform: cameraZoom ? 'scale(1.07)' : 'scale(1)',
          transformOrigin: 'center bottom',
        }}
      >
        {floatNums.map(fn => (
          <div key={fn.id}
            className="absolute pointer-events-none z-30 font-black select-none"
            style={{
              fontSize: 'clamp(1rem, 4.5vw, 1.75rem)',
              left:     fn.target === 'hero' ? '18%' : '72%',
              bottom:   '65%',
              transform: 'translateX(-50%)',
              color:     fn.target === 'hero' ? '#f87171' : '#fde047',
              textShadow: fn.target === 'hero'
                ? '0 0 14px #ef4444,0 2px 4px rgba(0,0,0,0.8)'
                : '0 0 14px #eab308,0 2px 4px rgba(0,0,0,0.8)',
              animation: 'bsFloatDmg 1.1s ease-out forwards',
            }}>
            -{fn.value}
          </div>
        ))}

        {/* ── HERO (LEFT) ── */}
        <div
          className="absolute"
          style={{
            left:       '15%',
            bottom:     '20%',
            transform:  heroChargeX,
            transition: heroMoveDur > 0
              ? `transform ${heroMoveDur}ms cubic-bezier(0.4,0,0.2,1)`
              : 'none',
            willChange: 'transform',
          }}
        >
          <motion.div animate={heroMotion.animate} transition={heroMotion.transition}>
            <div style={{ transform: 'scale(var(--sprite-scale, 1))', transformOrigin: 'bottom center' }}>
              <DynamicSprite
                key={`hero-${heroData.folder}`}
                folder={heroData.folder}
                action={heroAction}
                frameCount={heroConfig.frames[heroAction]}
                sheetW={heroConfig.sheetW[heroAction]}
                frameH={heroConfig.frameH}
                isHero={true}
                type="sheet"
                flipped={heroFlipped}
                facesRight={heroConfig.facesRight}
                isHurt={heroHurt}
              />
            </div>
          </motion.div>
        </div>

        {/* ── MONSTER (RIGHT) ── */}
        <div
          className="absolute"
          style={{
            right:      '15%',
            bottom:     '20%',
            transform:  monChargeX,
            transition: monMoveDur > 0
              ? `transform ${monMoveDur}ms cubic-bezier(0.4,0,0.2,1)`
              : 'none',
            willChange: 'transform',
          }}
        >
          {showImpact && (
            <div className="absolute inset-0 z-20 pointer-events-none">
              <div className="absolute inset-0 rounded-xl bg-white/70" style={{ animation: 'bsFlash 0.22s ease forwards' }} />
              <span className="absolute top-[10%] left-[0%] text-2xl sm:text-4xl" style={{ animation: 'bsPop 0.35s ease forwards' }}>💥</span>
              <span className="absolute top-[35%] right-[0%] text-xl sm:text-2xl" style={{ animation: 'bsPop 0.35s 0.06s ease both', opacity: 0 }}>⭐</span>
              <span className="absolute bottom-[20%] left-[30%] text-lg sm:text-xl" style={{ animation: 'bsPop 0.35s 0.12s ease both', opacity: 0 }}>⚡</span>
            </div>
          )}

          <motion.div animate={monsterMotion.animate} transition={monsterMotion.transition}>
            <div style={{ transform: 'scale(var(--sprite-scale, 1))', transformOrigin: 'bottom center' }}>
              <DynamicSprite
                key={`monster-${monster.folder}`}
                folder={monster.folder}
                action={monsterAction}
                frameCount={monster.frames[monsterAction]}
                sheetW={monster.sheetW[monsterAction]}
                frameH={monster.frameH}
                isHero={false}
                type={monster.type}
                flipped={monsterFlipped}
                facesRight={monster.facesRight}
                isHurt={monsterHurt}
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Combo */}
      <AnimatePresence>
        {showCombo && combo >= 2 && (
          <motion.div
            key="combo"
            initial={{ opacity: 0, scale: 0.5, y: 10 }}
            animate={{ opacity: 1, scale: 1,   y: 0 }}
            exit={{    opacity: 0, scale: 0.8,  y: -10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            className="fixed z-50 pointer-events-none text-center"
            style={{ top: '14%', left: '50%', transform: 'translateX(-50%)' }}
          >
            <div className="font-black" style={{
              fontSize: 'clamp(1.4rem, 5vw, 2.2rem)',
              color: combo >= 5 ? '#f59e0b' : '#22d3ee',
              textShadow: `0 0 28px ${combo >= 5 ? '#f59e0b' : '#22d3ee'}`,
            }}>
              {combo}× COMBO!
            </div>
            {combo >= 5 && <div className="text-sm font-bold text-yellow-300 mt-0.5">🔥 رائع!</div>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Answer flash */}
      <AnimatePresence>
        {showResult !== 'none' && (
          <motion.div
            key={showResult}
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: 1,   opacity: 1 }}
            exit={{    scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <div style={{
              fontSize: 'clamp(3.5rem, 16vw, 7rem)',
              color: showResult === 'correct' ? '#4ade80' : '#f87171',
            }}>
              {showResult === 'correct' ? '✅' : '❌'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
            {/* ══════ QUESTION PANEL ════════════════════════════════════════════════ */}
      <div className="relative z-20 w-full max-w-5xl mx-auto px-1.5 pb-1.5 mt-auto sm:px-3 sm:pb-3">
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg,rgba(6,182,212,0.10) 0%,rgba(0,0,0,0.93) 45%,rgba(6,182,212,0.06) 100%)',
            backdropFilter:       'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            border: '1px solid rgba(6,182,212,0.26)',
            boxShadow: [
              '0 0 35px rgba(6,182,212,0.12)',
              '0 0 70px rgba(6,182,212,0.05)',
              '0 20px 50px rgba(0,0,0,0.9)',
              'inset 0 1px 0 rgba(255,255,255,0.07)',
            ].join(','),
          }}
        >
          <div className="h-px w-full" style={{ background: 'linear-gradient(90deg,transparent,rgba(6,182,212,0.95) 30%,rgba(34,211,238,1) 50%,rgba(6,182,212,0.95) 70%,transparent)', animation: 'bsGlowPulse 2s ease-in-out infinite' }} />

          {(['tl','tr','bl','br'] as const).map(c => (
            <div key={c} className="absolute pointer-events-none" style={{
              top:    c.startsWith('t') ? 0 : 'auto',
              bottom: c.startsWith('b') ? 0 : 'auto',
              left:   c.endsWith('l')   ? 0 : 'auto',
              right:  c.endsWith('r')   ? 0 : 'auto',
              width: 16, height: 16,
              borderTop:    c.startsWith('t') ? '2px solid rgba(6,182,212,0.6)' : 'none',
              borderBottom: c.startsWith('b') ? '2px solid rgba(6,182,212,0.4)' : 'none',
              borderLeft:   c.endsWith('l')   ? '2px solid rgba(6,182,212,0.6)' : 'none',
              borderRight:  c.endsWith('r')   ? '2px solid rgba(6,182,212,0.6)' : 'none',
              borderRadius: c === 'tl' ? '8px 0 0 0' : c === 'tr' ? '0 8px 0 0' : c === 'bl' ? '0 0 0 8px' : '0 0 8px 0',
            }} />
          ))}

          <div className="p-2 sm:p-4 md:p-6">
            <p
              className="text-center font-bold text-white mb-2 leading-snug"
              dir="rtl"
              style={{ fontSize: 'clamp(0.72rem,3.8vw,1.05rem)', textShadow: '0 0 18px rgba(6,182,212,0.25)' }}
            >
              {island.question.text}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
              {island.question.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  disabled={isLocked}
                  dir="rtl"
                  className="group relative rounded-xl text-right font-bold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 overflow-hidden"
                  style={{
                    padding: 'clamp(7px,2.2vw,16px) clamp(8px,2.5vw,18px)',
                    fontSize: 'clamp(0.68rem,3.5vw,0.9rem)',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(6,182,212,0.14)',
                  }}
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl"
                    style={{ background: 'linear-gradient(135deg,rgba(6,182,212,0.18),rgba(6,182,212,0.04))' }} />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-200 rounded-xl"
                    style={{ boxShadow: 'inset 0 0 22px rgba(6,182,212,0.17), 0 0 14px rgba(6,182,212,0.12), 0 0 0 1px rgba(6,182,212,0.5)' }} />
                  <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ background: 'linear-gradient(180deg,transparent,rgba(6,182,212,0.95),transparent)' }} />
                  <div className="absolute inset-0 overflow-hidden opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300">
                    <div className="absolute inset-y-0 w-10 bg-white/12 blur-sm skew-x-12" style={{ animation: 'bsScan 1.4s linear infinite' }} />
                  </div>

                  <div className="relative flex items-center gap-2">
                    <span
                      className="shrink-0 rounded-lg flex items-center justify-center font-black transition-all duration-200"
                      style={{
                        width: 'clamp(20px,4.5vw,28px)',
                        height: 'clamp(20px,4.5vw,28px)',
                        fontSize: 'clamp(9px,2vw,12px)',
                        background: 'rgba(6,182,212,0.10)',
                        border: '1px solid rgba(6,182,212,0.28)',
                        color: 'rgba(6,182,212,0.9)',
                      }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-white/85 group-hover:text-cyan-50 transition-colors duration-200 leading-snug">{opt}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="h-px w-full" style={{ background: 'linear-gradient(90deg,transparent,rgba(6,182,212,0.55) 40%,rgba(6,182,212,0.55) 60%,transparent)' }} />
        </div>
      </div>

      {/* Exit button */}
      <button
        onClick={onBack}
        className="absolute top-2 left-2 z-30 bg-black/65 hover:bg-red-900/80 rounded-full font-bold text-white border border-white/20 backdrop-blur-sm transition-all active:scale-95"
        style={{ padding: 'clamp(4px,1.5vw,8px) clamp(8px,3vw,16px)', fontSize: 'clamp(9px,2.5vw,13px)' }}
      >
        🏳️ خروج
      </button>

      {/* Victory / Defeat */}
      {gameResult === 'victory' && (
        <EpicModal type="victory" monsterName={monster.name}
          correct={correctAnswers} wrong={wrongAnswers}
          damageDealt={damageDealt} damageReceived={damageReceived}
          accuracy={accuracy} onAction={onVictory} />
      )}
      {gameResult === 'defeat' && (
        <EpicModal type="defeat" monsterName={monster.name}
          correct={correctAnswers} wrong={wrongAnswers}
          damageDealt={damageDealt} damageReceived={damageReceived}
          accuracy={accuracy} onAction={onDefeat} />
      )}

      {/* ── CSS: sprite scale breakpoints + keyframes ── */}
      <style>{`
        :root { --sprite-scale: 0.42; }
        @media (min-width:  380px) { :root { --sprite-scale: 0.48; } }
        @media (min-width:  480px) { :root { --sprite-scale: 0.56; } }
        @media (min-width:  640px) { :root { --sprite-scale: 0.72; } }
        @media (min-width:  768px) { :root { --sprite-scale: 0.90; } }
        @media (min-width: 1024px) { :root { --sprite-scale: 1.15; } }
        @media (min-width: 1280px) { :root { --sprite-scale: 1.35; } }

        @keyframes bsBgZoom {
          0%   { transform:scale(1.12) translate(0%,0%); }
          50%  { transform:scale(1.18) translate(0.5%,0.4%); }
          100% { transform:scale(1.12) translate(-0.5%,-0.4%); }
        }
        @keyframes bsPop {
          0%   { transform:scale(0.1) rotate(-12deg); opacity:0; }
          60%  { transform:scale(1.25) rotate(4deg);  opacity:1; }
          100% { transform:scale(1)   rotate(0deg);   opacity:1; }
        }
        @keyframes bsShake {
          0%,100% { transform:translate(0,0); }
          15% { transform:translate(-8px,3px); }
          30% { transform:translate(8px,-3px); }
          45% { transform:translate(-5px,4px); }
          60% { transform:translate(5px,-2px); }
          80% { transform:translate(-2px,1px); }
        }
        @keyframes bsFlash      { 0%{opacity:.8;} 100%{opacity:0;} }
        @keyframes bsWhiteFlash { 0%{opacity:.48;} 100%{opacity:0;} }
        @keyframes bsScan       { 0%{left:-14%;} 100%{left:114%;} }
        @keyframes bsCritPulse  { 0%,100%{opacity:1;} 50%{opacity:.5;} }
        @keyframes bsFloatDmg {
          0%   { transform:translateX(-50%) translateY(0)    scale(1.2); opacity:1; }
          30%  { transform:translateX(-50%) translateY(-22px) scale(1);  opacity:1; }
          100% { transform:translateX(-50%) translateY(-68px) scale(.7); opacity:0; }
        }
        @keyframes bsModalIn {
          0%   { opacity:0; transform:scale(.9) translateY(28px); }
          60%  { opacity:1; transform:scale(1.03) translateY(-4px); }
          100% { opacity:1; transform:scale(1) translateY(0); }
        }
        @keyframes bsParticle {
          0%   { opacity:1; transform:translateY(0) scale(1); }
          100% { opacity:0; transform:translateY(-64px) scale(.3) rotate(160deg); }
        }
        @keyframes bsGlowPulse  { 0%,100%{opacity:.45;} 50%{opacity:1;} }
        @keyframes bsFloat      { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-7px);} }
        @keyframes bsStatIn     { 0%{opacity:0;transform:translateY(10px);} 100%{opacity:1;transform:translateY(0);} }
      `}</style>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Epic Victory / Defeat overlay
// ─────────────────────────────────────────────────────────────────────────────
interface EpicModalProps {
  type: 'victory' | 'defeat'; monsterName: string;
  correct: number; wrong: number;
  damageDealt: number; damageReceived: number;
  accuracy: number; onAction: () => void;
}

const EpicModal = ({ type, monsterName, correct, wrong, damageDealt, damageReceived, accuracy, onAction }: EpicModalProps) => {
  const isV    = type === 'victory';
  const accent = isV ? '#eab308' : '#ef4444';
  const rgb    = isV ? '234,179,8' : '239,68,68';
  const parts  = isV
    ? ['⭐', '✨', '🌟', '💫', '🏆', '⭐', '✨', '🌟', '💛', '✦', '✧', '💥']
    : ['💀', '🩸', '☠️', '💀', '🩸', '☠️', '💀', '🩸', '💣', '⚡', '🔥', '☠️'];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center overflow-hidden"
      style={{ background: `radial-gradient(ellipse at center,rgba(${rgb},.22) 0%,rgba(0,0,0,.97) 65%)` }}
    >
      <div className="absolute inset-0" style={{ backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }} />

      {parts.map((p, i) => (
        <span key={i} className="absolute pointer-events-none select-none"
          style={{
            fontSize: 'clamp(14px,3.5vw,22px)',
            left: `${5 + (i % 6) * 17}%`,
            bottom: `${8 + Math.floor(i / 6) * 38 + (i % 3) * 7}%`,
            animation: `bsParticle ${1.5 + i * 0.2}s ${i * 0.12}s ease-out infinite`,
            opacity: 0,
          }}>{p}</span>
      ))}

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute rounded-full blur-3xl" style={{ width: 280, height: 280, top: -80, left: -80, background: `rgba(${rgb},.16)`, animation: 'bsGlowPulse 3s ease-in-out infinite' }} />
        <div className="absolute rounded-full blur-3xl" style={{ width: 280, height: 280, bottom: -80, right: -80, background: `rgba(${rgb},.11)`, animation: 'bsGlowPulse 3.5s .6s ease-in-out infinite' }} />
      </div>

      <motion.div
        initial={{ y: 60, opacity: 0, scale: 0.92 }}
        animate={{ y: 0,  opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22, delay: 0.05 }}
        className="relative z-10 w-full sm:max-w-md mx-auto rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{
          border: `1px solid rgba(${rgb},.4)`,
          borderBottom: 'none',
          background: `linear-gradient(155deg,rgba(${rgb},.15) 0%,rgba(0,0,0,.98) 50%,rgba(${rgb},.08) 100%)`,
          boxShadow: `0 0 70px rgba(${rgb},.4),0 0 160px rgba(${rgb},.12),inset 0 1px 0 rgba(255,255,255,.1)`,
        }}
      >
        <div className="h-0.5" style={{ background: `linear-gradient(90deg,transparent,${accent},transparent)` }} />

        <div className="flex items-center justify-center gap-2 pt-3 pb-1 px-5">
          <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg,transparent,rgba(${rgb},.4))` }} />
          <span className="text-[9px] sm:text-xs font-black tracking-widest uppercase opacity-50" style={{ color: accent }}>
            {isV ? 'VICTORY' : 'DEFEAT'}
          </span>
          <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg,rgba(${rgb},.4),transparent)` }} />
        </div>

        <div className="px-4 sm:px-6 pt-1 pb-5">
          <div className="text-center mb-3">
            <div style={{ fontSize: 'clamp(2.5rem,10vw,4rem)', animation: 'bsFloat 2.5s ease-in-out infinite' }}>{isV ? '🏆' : '💀'}</div>
            <h2 className="font-black tracking-tight mb-0.5"
              style={{ fontSize: 'clamp(1.6rem,6vw,2.6rem)', color: accent, textShadow: `0 0 28px rgba(${rgb},1),0 0 56px rgba(${rgb},.5)` }}>
              {isV ? 'انتصار!' : 'هُزِمت!'}
            </h2>
            <p className="text-white/40 text-xs" dir="rtl">
              {isV ? `أسقطت ${monsterName} في المعركة!` : `${monsterName} كان أقوى هذه المرة…`}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            {[
              { label: 'إجابات صحيحة', value: correct,             color: '#4ade80', icon: '✅' },
              { label: 'إجابات خاطئة',  value: wrong,               color: '#f87171', icon: '❌' },
              { label: 'ضرر ألحقته',    value: `${damageDealt}%`,   color: accent,    icon: '⚔️' },
              { label: 'ضرر تلقيته',    value: `${damageReceived}%`,color: '#f97316', icon: '🛡️' },
            ].map((s, idx) => (
              <div key={idx}
                className="rounded-xl p-2.5 text-center"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  animation: `bsStatIn 0.4s ${0.1 + idx * 0.07}s ease both`,
                }}>
                <div style={{ fontSize: 'clamp(0.9rem,3.5vw,1.2rem)' }}>{s.icon}</div>
                <div className="font-black" style={{ fontSize: 'clamp(1rem,4vw,1.4rem)', color: s.color }}>{s.value}</div>
                <div className="text-white/35 mt-0.5" dir="rtl" style={{ fontSize: 'clamp(8px,2vw,11px)' }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div className="mb-4 p-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-white/40" style={{ fontSize: 'clamp(9px,2vw,12px)' }} dir="rtl">الدقة</span>
              <span className="font-black" style={{
                fontSize: 'clamp(10px,2.5vw,14px)',
                color: accuracy >= 70 ? '#4ade80' : accuracy >= 40 ? '#f59e0b' : '#f87171',
              }}>{accuracy}%</span>
            </div>
            <div className="h-2 bg-black/60 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000 delay-300"
                style={{
                  width: `${accuracy}%`,
                  background: accuracy >= 70
                    ? 'linear-gradient(90deg,#166534,#4ade80)'
                    : accuracy >= 40
                      ? 'linear-gradient(90deg,#78350f,#f59e0b)'
                      : 'linear-gradient(90deg,#7f1d1d,#f87171)',
                  boxShadow: `0 0 10px ${accuracy >= 70 ? '#4ade80' : accuracy >= 40 ? '#f59e0b' : '#f87171'}`,
                }} />
            </div>
          </div>

          <button
            onClick={onAction}
            className="w-full rounded-2xl font-black tracking-wide active:scale-95 transition-all duration-150 relative overflow-hidden group"
            style={{
              padding: 'clamp(10px,3vw,16px)',
              fontSize: 'clamp(0.85rem,3.5vw,1.1rem)',
              background: isV
                ? 'linear-gradient(135deg,#78350f 0%,#ca8a04 40%,#eab308 70%,#fde047 100%)'
                : 'linear-gradient(135deg,#7f1d1d 0%,#b91c1c 40%,#ef4444 75%,#f87171 100%)',
              boxShadow: `0 0 32px rgba(${rgb},.65),0 8px 20px rgba(0,0,0,.5)`,
              color: isV ? '#000' : '#fff',
              border: `1px solid rgba(${rgb},.5)`,
            }}
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 overflow-hidden rounded-2xl">
              <div className="absolute inset-y-0 w-16 bg-white/28 blur-sm skew-x-12" style={{ animation: 'bsScan 0.9s linear infinite' }} />
            </div>
            <span className="relative">{isV ? '🚀 متابعة المغامرة' : '↩ العودة للبيت'}</span>
          </button>
        </div>

        <div className="h-0.5" style={{ background: `linear-gradient(90deg,transparent,rgba(${rgb},.5),transparent)` }} />
      </motion.div>
    </motion.div>
  );
};

const Err = ({ msg }: { msg: string }) => (
  <div className="min-h-screen bg-black text-white flex items-center justify-center text-lg text-center px-4">{msg}</div>
);

export default BattleScreen;