import { useState, useEffect, useMemo, useRef, memo, useCallback } from 'react';
import { useGame } from '@/context/GameContext';
import { ISLANDS, CHARACTERS } from '@/lib/gameState';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Props {
  planetId: number;
  islandId: number;
  onBack:    () => void;
  onVictory: () => void;
  onDefeat:  () => void;
}

type ActionState = 'idle' | 'run' | 'attack' | 'attack2' | 'hurt' | 'death';
type GameResult  = 'none' | 'victory' | 'defeat';
type CharPos     = 'home' | 'charging' | 'atEnemy' | 'returning';

interface FloatNum {
  id:     number;
  value:  number;
  target: 'hero' | 'monster';
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const FRAME_MS   = 110;
const CHARGE_MS  = 480;
const RETURN_MS  = 420;

// ─────────────────────────────────────────────────────────────────────────────
// ╔══════════════════════════════════════════════════════════╗
// ║          SPRITE DIRECTION — VISUAL ANALYSIS              ║
// ║                                                          ║
// ║  facesRight = true  → sprite image faces RIGHT           ║
// ║  facesRight = false → sprite image faces LEFT            ║
// ║                                                          ║
// ║  Heroes sit on LEFT  → must appear facing RIGHT (+X)     ║
// ║  Monsters sit on RIGHT → must appear facing LEFT  (-X)   ║
// ║                                                          ║
// ║  hero1   wizard  — Run/Attack go RIGHT  → true           ║
// ║  hero2   king    — Run/Attack go RIGHT  → true           ║
// ║  hero3   hero    — Run/Attack go RIGHT  → true           ║
// ║  monster1 fire   — Attack fire goes LEFT → false         ║
// ║  monster2 death  — Idle/body faces LEFT  → false         ║
// ║  monster3 dark   — Run goes LEFT         → false         ║
// ║  monster4 knight — Run/Attack go RIGHT   → true          ║
// ╚══════════════════════════════════════════════════════════╝
// ─────────────────────────────────────────────────────────────────────────────

interface HeroConfig {
  frames:     Record<ActionState, number>;
  facesRight: boolean;
}

const HERO_CONFIGS: Record<string, HeroConfig> = {
  hero1: { facesRight: true,  frames: { idle: 7,  run: 10, attack: 10, attack2: 10, hurt: 5,  death: 9  } },
  hero2: { facesRight: true,  frames: { idle: 6,  run: 8,  attack: 6,  attack2: 6,  hurt: 4,  death: 11 } },
  hero3: { facesRight: true,  frames: { idle: 8,  run: 8,  attack: 6,  attack2: 6,  hurt: 4,  death: 6  } },
};

interface MonsterConfig {
  name:       string;
  folder:     string;
  type:       'sheet' | 'individual';
  facesRight: boolean;
  frames:     Record<ActionState, number>;
}

const MONSTER_CONFIGS: MonsterConfig[] = [
  { name: 'ساحر النار',     folder: 'monster1', type: 'sheet',      facesRight: false,
    frames: { idle: 8,  run: 8,  attack: 8,  attack2: 8,  hurt: 4, death: 5  } },
  { name: 'جالب الموت',     folder: 'monster2', type: 'individual', facesRight: false,
    frames: { idle: 8,  run: 8,  attack: 10, attack2: 9,  hurt: 3, death: 10 } },
  { name: 'سيد الظلام',     folder: 'monster3', type: 'sheet',      facesRight: false,
    frames: { idle: 8,  run: 8,  attack: 8,  attack2: 8,  hurt: 3, death: 7  } },
  { name: 'الفارس المتمرد', folder: 'monster4', type: 'sheet',      facesRight: true,
    frames: { idle: 11, run: 8,  attack: 7,  attack2: 7,  hurt: 4, death: 11 } },
];

// ─────────────────────────────────────────────────────────────────────────────
// Path resolver — UNTOUCHED
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
  if      (action === 'run')    file = folder === 'monster1' ? 'Move.png' : 'Run.png';
  else if (action === 'attack') {
    if      (folder === 'hero2')    file = 'Attack_1.png';
    else if (folder === 'monster1') file = 'Attack.png';
    else                            file = 'Attack1.png';
  }
  else if (action === 'attack2') {
    if      (folder === 'hero2')    file = 'Attack_2.png';
    else if (folder === 'monster1') file = 'Attack.png';
    else                            file = 'Attack2.png';
  }
  else if (action === 'hurt') {
    if      (folder === 'hero1' || folder === 'hero2') file = 'Hit.png';
    else if (folder === 'monster3')                    file = 'Take hit.png';
    else                                               file = 'Take Hit.png';
  }
  else if (action === 'death') file = 'Death.png';
  return `/src/assets/combat/${folder}/${sub}${file}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Preloader
// ─────────────────────────────────────────────────────────────────────────────
function preloadImage(src: string): Promise<void> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = img.onerror = () => resolve();
    img.src = src;
  });
}

function buildPreloadList(heroFolder: string, monster: MonsterConfig, bgUrl: string): string[] {
  const paths: string[] = [bgUrl];
  const all: ActionState[] = ['idle','run','attack','attack2','hurt','death'];
  all.forEach(a => paths.push(getSpritePath(heroFolder, 'sheet', a, 1)));
  if (monster.type === 'individual') {
    const sets: Array<[string,number]> = [['Idle',6],['Attack',10],['Cast',9],['Hurt',3],['Death',10]];
    sets.forEach(([name,count]) => {
      for (let i = 1; i <= count; i++)
        paths.push(`/src/assets/combat/monster2/Individual Sprite/${name}/Bringer-of-Death_${name}_${i}.png`);
    });
  } else {
    all.forEach(a => paths.push(getSpritePath(monster.folder, 'sheet', a, 1)));
  }
  return paths;
}

// ─────────────────────────────────────────────────────────────────────────────
// DynamicSprite
//
//  scaleX formula: (isHero === (facesRight !== flipped)) ? 1 : -1
//
//  Truth table (idle, flipped=false):
//    Hero   + facesRight=true  → scaleX= 1 (sprite faces right, stays right)  ✓
//    Hero   + facesRight=false → scaleX=-1 (sprite faces left,  flip to right) ✓
//    Monster+ facesRight=false → scaleX= 1 (sprite faces left,  stays left)    ✓
//    Monster+ facesRight=true  → scaleX=-1 (sprite faces right, flip to left)  ✓
//
//  When flipped=true (retreating): direction is inverted automatically.
// ─────────────────────────────────────────────────────────────────────────────
interface SpriteProps {
  folder:     string;
  action:     ActionState;
  frames:     Record<ActionState, number>;
  isHero:     boolean;
  type:       'sheet' | 'individual';
  flipped:    boolean;
  facesRight: boolean;
  isHurt:     boolean;
}

const DynamicSprite = memo(({ folder, action, frames, isHero, type, flipped, facesRight, isHurt }: SpriteProps) => {
  const [frame, setFrame] = useState(1);
  const total = frames[action] ?? 1;

  useEffect(() => {
    setFrame(1);
    const id = setInterval(() => setFrame(f => (f % total) + 1), FRAME_MS);
    return () => clearInterval(id);
  }, [action, total]);

  const scaleX = (isHero === (facesRight !== flipped)) ? 1 : -1;
  const src    = getSpritePath(folder, type, action, frame);
  const posX   = total > 1 ? ((frame - 1) / (total - 1)) * 100 : 0;

  return (
    <div
      className="w-44 h-44 sm:w-56 sm:h-56 md:w-64 md:h-64 lg:w-80 lg:h-80"
      style={{
        backgroundImage:    `url('${src}')`,
        backgroundSize:     type === 'individual' ? 'contain' : `${total * 100}% 100%`,
        backgroundPosition: type === 'individual' ? 'center'  : `${posX}% center`,
        backgroundRepeat:   'no-repeat',
        imageRendering:     'pixelated',
        transform:          `scaleX(${scaleX})`,
        willChange:         'background-position, filter',
        filter:             isHurt ? 'brightness(10) saturate(0)' : 'none',
        transition:         isHurt ? 'none' : 'filter 0.15s ease-out',
      }}
    />
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
    () => HERO_CONFIGS[heroData?.folder ?? 'hero1'] ?? HERO_CONFIGS['hero1'], [heroData],
  );
  const heroFrames = heroConfig.frames;
  const bgUrl      = `/src/assets/combat/monster4/islands/island${islandId + 1}.png`;

  // ── Preloading ────────────────────────────────────────────────────────────
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!heroData || !island) return;
    Promise.all(buildPreloadList(heroData.folder, monster, bgUrl).map(preloadImage))
      .then(() => setReady(true));
  }, []);

  // ── HP ────────────────────────────────────────────────────────────────────
  const [heroHP,         setHeroHP]         = useState(100);
  const [monsterHP,      setMonsterHP]      = useState(100);
  const [heroHPGhost,    setHeroHPGhost]    = useState(100);
  const [monsterHPGhost, setMonsterHPGhost] = useState(100);

  // ── Animation state ───────────────────────────────────────────────────────
  const [heroAction,    setHeroAction]    = useState<ActionState>('idle');
  const [monsterAction, setMonsterAction] = useState<ActionState>('idle');
  const [heroPos,       setHeroPos]       = useState<CharPos>('home');
  const [monsterPos,    setMonsterPos]    = useState<CharPos>('home');
  const [heroFlipped,   setHeroFlipped]   = useState(false);
  const [monsterFlipped,setMonsterFlipped]= useState(false);
  const [attackVar,     setAttackVar]     = useState<'attack'|'attack2'>('attack');

  // ── Hurt flash state ──────────────────────────────────────────────────────
  const [heroHurt,    setHeroHurt]    = useState(false);
  const [monsterHurt, setMonsterHurt] = useState(false);

  // ── VFX ───────────────────────────────────────────────────────────────────
  const [showResult,    setShowResult]    = useState<'none'|'correct'|'wrong'>('none');
  const [showImpact,    setShowImpact]    = useState(false);
  const [showWhiteFlash,setShowWhiteFlash]= useState(false);
  const [cameraZoom,    setCameraZoom]    = useState(false);
  const [screenShake,   setScreenShake]  = useState(false);
  const [gameResult,    setGameResult]   = useState<GameResult>('none');

  // ── Floating damage numbers ───────────────────────────────────────────────
  const [floatNums, setFloatNums] = useState<FloatNum[]>([]);
  const floatIdRef = useRef(0);

  const spawnFloat = useCallback((value: number, target: 'hero' | 'monster') => {
    const id = ++floatIdRef.current;
    setFloatNums(prev => [...prev, { id, value, target }]);
    setTimeout(() => setFloatNums(prev => prev.filter(f => f.id !== id)), 1200);
  }, []);

  // ── Combo ─────────────────────────────────────────────────────────────────
  const [combo, setCombo] = useState(0);
  const [showCombo, setShowCombo] = useState(false);
  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [wrongAnswers,   setWrongAnswers]   = useState(0);
  const [damageDealt,    setDamageDealt]    = useState(0);
  const [damageReceived, setDamageReceived] = useState(0);

  // ── Timer management ──────────────────────────────────────────────────────
  const timers   = useRef<ReturnType<typeof setTimeout>[]>([]);
  const gameOver = useRef(false);
  const addTimer = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
  }, []);
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  // ── Ghost HP delay ────────────────────────────────────────────────────────
  useEffect(() => { const t = setTimeout(() => setHeroHPGhost(heroHP),     900); return () => clearTimeout(t); }, [heroHP]);
  useEffect(() => { const t = setTimeout(() => setMonsterHPGhost(monsterHP), 900); return () => clearTimeout(t); }, [monsterHP]);

  // ── Death detection ───────────────────────────────────────────────────────
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
      addTimer(() => setGameResult('defeat'), heroFrames.death * FRAME_MS + 500);
    }
  }, [heroHP]);

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!currentPlayer) return <Err msg="بيانات اللاعب غير موجودة!" />;
  if (!island)        return <Err msg="الجزيرة غير موجودة!" />;
  if (!heroData)      return <Err msg="بيانات البطل غير موجودة!" />;

  if (!ready) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6">
        <div className="text-5xl animate-pulse">⚔️</div>
        <p className="text-white/70 text-lg font-bold tracking-widest">جاري تحميل المعركة…</p>
        <div className="flex gap-2">
          {[0,1,2].map(i => (
            <div key={i} className="w-3 h-3 rounded-full bg-cyan-400"
              style={{ animation: `pulse 1s ${i*0.2}s ease-in-out infinite` }} />
          ))}
        </div>
      </div>
    );
  }

  const isLocked = heroAction !== 'idle' || monsterAction !== 'idle' || gameResult !== 'none';

  // ── Answer handler ────────────────────────────────────────────────────────
  const handleAnswer = (index: number) => {
    if (isLocked) return;
    const q     = island.question as any;
    const right = q.correctIndex ?? q.correctAnswerIndex ?? q.correctOption ?? 0;
    if (index === right) {
      setCorrectAnswers(p => p + 1);
      const newCombo = combo + 1;
      setCombo(newCombo);
      if (newCombo >= 2) {
        setShowCombo(true);
        if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
        comboTimerRef.current = setTimeout(() => setShowCombo(false), 1800);
      }
      doHeroAttack();
    } else {
      setWrongAnswers(p => p + 1);
      setCombo(0);
      setShowCombo(false);
      doMonsterAttack();
    }
  };

  // ── Hero Attack ───────────────────────────────────────────────────────────
  const doHeroAttack = () => {
    const variant = attackVar;
    const atkMs   = heroFrames[variant] * FRAME_MS;
    const halfAtk = Math.floor(atkMs / 2);
    const hurtMs  = monster.frames.hurt * FRAME_MS;
    setAttackVar(v => v === 'attack' ? 'attack2' : 'attack');

    setShowResult('correct');
    setCameraZoom(true);

    // 1. Charge
    setHeroAction('run');
    setHeroPos('charging');
    setHeroFlipped(false);

    // 2. Attack
    addTimer(() => {
      setHeroPos('atEnemy');
      setHeroAction(variant);
    }, CHARGE_MS);

    // 3. Impact — hit-stop + white flash + damage
    addTimer(() => {
      setShowImpact(true);
      setShowWhiteFlash(true);
      setScreenShake(true);
      setMonsterHurt(true);
      setMonsterAction('hurt');
      const dmg = 50;
      setMonsterHP(prev => Math.max(0, prev - dmg));
      setDamageDealt(prev => prev + dmg);
      spawnFloat(dmg, 'monster');
    }, CHARGE_MS + halfAtk);

    // 3b. End white flash
    addTimer(() => setShowWhiteFlash(false), CHARGE_MS + halfAtk + 70);
    // 3c. End shake + impact
    addTimer(() => { setShowImpact(false); setScreenShake(false); }, CHARGE_MS + halfAtk + 200);
    // 3d. End monster hurt flash
    addTimer(() => setMonsterHurt(false), CHARGE_MS + halfAtk + 280);
    // 3e. Camera unzoom
    addTimer(() => setCameraZoom(false), CHARGE_MS + halfAtk + 380);

    // 4. Retreat — wait for full hurt animation
    const retreatAt = CHARGE_MS + Math.max(atkMs, halfAtk + hurtMs);
    addTimer(() => {
      setHeroAction('run');
      setHeroFlipped(true);
      setHeroPos('returning');
    }, retreatAt);

    // 5. Reset
    addTimer(() => {
      setHeroAction('idle');
      setHeroFlipped(false);
      setHeroPos('home');
      setMonsterAction('idle');
      setShowResult('none');
    }, retreatAt + RETURN_MS);
  };

  // ── Monster Attack ────────────────────────────────────────────────────────
  const doMonsterAttack = () => {
    const atkMs   = monster.frames.attack * FRAME_MS;
    const halfAtk = Math.floor(atkMs / 2);
    const hurtMs  = heroFrames.hurt * FRAME_MS;

    setShowResult('wrong');

    // 1. Charge
    setMonsterAction('run');
    setMonsterFlipped(false);
    setMonsterPos('charging');

    // 2. Attack
    addTimer(() => {
      setMonsterPos('atEnemy');
      setMonsterAction('attack');
      setMonsterFlipped(false);
    }, CHARGE_MS);

    // 3. Impact
    addTimer(() => {
      setHeroAction('hurt');
      setHeroHurt(true);
      setShowWhiteFlash(true);
      setScreenShake(true);
      const dmg = 25;
      setHeroHP(prev => Math.max(0, prev - dmg));
      setDamageReceived(prev => prev + dmg);
      spawnFloat(dmg, 'hero');
    }, CHARGE_MS + halfAtk);

    addTimer(() => setShowWhiteFlash(false), CHARGE_MS + halfAtk + 70);
    addTimer(() => setScreenShake(false),    CHARGE_MS + halfAtk + 200);
    addTimer(() => setHeroHurt(false),       CHARGE_MS + halfAtk + 280);

    // 4. Retreat
    const retreatAt = CHARGE_MS + Math.max(atkMs, halfAtk + hurtMs);
    addTimer(() => {
      setMonsterAction('run');
      setMonsterFlipped(true);
      setMonsterPos('returning');
    }, retreatAt);

    // 5. Reset
    addTimer(() => {
      setMonsterAction('idle');
      setMonsterFlipped(false);
      setMonsterPos('home');
      setHeroAction('idle');
      setShowResult('none');
    }, retreatAt + RETURN_MS);
  };

  // ── Position → CSS ────────────────────────────────────────────────────────
  const CHARGE_DIST = 'clamp(110px,27vw,370px)';
  const heroTransformX = (heroPos === 'charging' || heroPos === 'atEnemy') ? `translateX(${CHARGE_DIST})` : 'translateX(0)';
  const heroMoveDur    = heroPos === 'charging' ? CHARGE_MS : heroPos === 'returning' ? RETURN_MS : 0;
  const monTransformX  = (monsterPos === 'charging' || monsterPos === 'atEnemy') ? `translateX(-${CHARGE_DIST})` : 'translateX(0)';
  const monMoveDur     = monsterPos === 'charging' ? CHARGE_MS : monsterPos === 'returning' ? RETURN_MS : 0;

  // HP color thresholds
  const heroHPPct     = heroHP / 100;
  const monHPPct      = monsterHP / 100;
  const heroBarColor  = heroHPPct > 0.5 ? '#22d3ee' : heroHPPct > 0.25 ? '#f59e0b' : '#ef4444';
  const monBarColor   = monHPPct  > 0.5 ? '#ef4444' : monHPPct  > 0.25 ? '#f97316' : '#fbbf24';
  const heroCritical  = heroHP < 30;
  const monCritical   = monsterHP < 30;

  const accuracy = correctAnswers + wrongAnswers > 0
    ? Math.round((correctAnswers / (correctAnswers + wrongAnswers)) * 100) : 0;

  return (
    <div
      dir="ltr"
      className="relative min-h-screen flex flex-col items-center justify-between overflow-hidden"
      style={screenShake ? { animation: 'bsShake 0.38s ease both' } : undefined}
    >
      {/* ── Background ── */}
      <div className="absolute inset-0 bg-center bg-cover"
        style={{ backgroundImage: `url('${bgUrl}')`, animation: 'bsBgZoom 24s ease-in-out infinite alternate', transform: 'scale(1.12)' }} />
      <div className="absolute inset-0 bg-black/55" />

      {/* ── Vignette ── */}
      <div className="absolute inset-0 pointer-events-none transition-all duration-500"
        style={{ boxShadow: cameraZoom ? 'inset 0 0 220px rgba(0,0,0,0.88)' : 'inset 0 0 90px rgba(0,0,0,0.42)' }} />

      {/* ── Full-screen white hit flash ── */}
      {showWhiteFlash && (
        <div className="fixed inset-0 z-40 pointer-events-none"
          style={{ background: 'rgba(255,255,255,0.5)', animation: 'bsWhiteFlash 0.1s ease forwards' }} />
      )}

      {/* ════════════════════════════════════════════════════════════════════
          HP BARS  (high-tech glowing with ghost + scan + critical pulse)
      ═════════════════════════════════════════════════════════════════════ */}
      <div className="relative z-20 w-full max-w-6xl flex items-center gap-3 p-3 md:p-5">

        {/* Hero HP */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-cyan-300 font-black text-xs md:text-sm truncate"
              style={{ textShadow: '0 0 12px rgba(6,182,212,1)' }}>{currentPlayer.name}</span>
            <span className="font-mono text-xs tabular-nums shrink-0 ml-2"
              style={{ color: heroBarColor }}>{heroHP}<span className="text-white/30">/100</span></span>
          </div>
          <div className="relative h-5 md:h-6 bg-black/90 rounded-full overflow-hidden"
            style={{
              border:    `1px solid ${heroBarColor}55`,
              boxShadow: `0 0 18px ${heroBarColor}44`,
              animation: heroCritical ? 'bsCritPulse 0.7s ease-in-out infinite' : 'none',
            }}>
            {/* Ghost */}
            <div className="absolute inset-y-0 left-0 rounded-full"
              style={{ width: `${heroHPGhost}%`, background: 'rgba(255,255,255,0.16)', transition: 'width 900ms cubic-bezier(0.4,0,0.2,1)' }} />
            {/* Bar */}
            <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
              style={{
                width:      `${heroHP}%`,
                background: `linear-gradient(90deg,rgba(14,116,144,.9),${heroBarColor},rgba(224,255,255,.8))`,
                boxShadow:  `0 0 18px ${heroBarColor},inset 0 1px 0 rgba(255,255,255,.3)`,
              }} />
            {/* Scan shimmer */}
            <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
              <div className="absolute inset-y-0 w-10 bg-white/25 blur-sm" style={{ animation: 'bsScan 2.4s linear infinite' }} />
            </div>
            {/* Gloss */}
            <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-full pointer-events-none"
              style={{ background: 'linear-gradient(to bottom,rgba(255,255,255,.22),transparent)' }} />
          </div>
        </div>

        <span className="text-xl font-black shrink-0 px-1 select-none"
          style={{ textShadow: '0 0 20px rgba(255,255,255,.7)' }}>⚔️</span>

        {/* Monster HP */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-1.5">
            <span className="font-mono text-xs tabular-nums shrink-0 mr-2"
              style={{ color: monBarColor }}>{monsterHP}<span className="text-white/30">/100</span></span>
            <span className="text-red-400 font-black text-xs md:text-sm truncate"
              style={{ textShadow: '0 0 12px rgba(239,68,68,1)' }}>{monster.name}</span>
          </div>
          <div className="relative h-5 md:h-6 bg-black/90 rounded-full overflow-hidden"
            style={{
              border:    `1px solid ${monBarColor}55`,
              boxShadow: `0 0 18px ${monBarColor}44`,
              animation: monCritical ? 'bsCritPulse 0.7s ease-in-out infinite' : 'none',
            }}>
            {/* Ghost */}
            <div className="absolute inset-y-0 right-0 rounded-full"
              style={{ width: `${monsterHPGhost}%`, background: 'rgba(255,255,255,0.16)', transition: 'width 900ms cubic-bezier(0.4,0,0.2,1)' }} />
            {/* Bar */}
            <div className="absolute inset-y-0 right-0 rounded-full transition-all duration-300"
              style={{
                width:      `${monsterHP}%`,
                background: `linear-gradient(270deg,rgba(127,29,29,.9),${monBarColor},rgba(255,224,200,.8))`,
                boxShadow:  `0 0 18px ${monBarColor},inset 0 1px 0 rgba(255,255,255,.3)`,
              }} />
            {/* Scan shimmer (reversed) */}
            <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none" style={{ transform:'scaleX(-1)' }}>
              <div className="absolute inset-y-0 w-10 bg-white/25 blur-sm" style={{ animation: 'bsScan 2.8s linear infinite' }} />
            </div>
            {/* Gloss */}
            <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-full pointer-events-none"
              style={{ background: 'linear-gradient(to bottom,rgba(255,255,255,.22),transparent)' }} />
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          BATTLE ARENA
      ═════════════════════════════════════════════════════════════════════ */}
      <div
        className="relative z-10 w-full max-w-7xl h-[42vh] flex items-end justify-between px-4 sm:px-10 md:px-20 pb-4 transition-transform duration-500"
        style={{ transform: cameraZoom ? 'scale(1.08)' : 'scale(1)', transformOrigin: 'center bottom' }}
      >
        {/* Floating damage numbers */}
        {floatNums.map(fn => (
          <div key={fn.id}
            className="absolute pointer-events-none z-30 font-black text-2xl md:text-3xl"
            style={{
              left:        fn.target === 'hero' ? '18%' : '72%',
              bottom:      '55%',
              transform:   'translateX(-50%)',
              color:       fn.target === 'hero' ? '#f87171' : '#fde047',
              textShadow:  fn.target === 'hero' ? '0 0 20px #ef4444' : '0 0 20px #eab308',
              animation:   'bsFloatDmg 1.1s ease-out forwards',
            }}>
            -{fn.value}
          </div>
        ))}

        {/* Hero — left */}
        <div style={{
          transform: heroTransformX,
          transitionProperty: 'transform',
          transitionTimingFunction: 'cubic-bezier(0.4,0,0.2,1)',
          transitionDuration: `${heroMoveDur}ms`,
          willChange: 'transform',
        }}>
          <DynamicSprite
            key={heroAction}
            folder={heroData.folder} action={heroAction}
            frames={heroFrames}     isHero={true}
            type="sheet"            flipped={heroFlipped}
            facesRight={heroConfig.facesRight}
            isHurt={heroHurt}
          />
        </div>

        {/* Monster — right + impact */}
        <div className="relative">
          {showImpact && (
            <div className="absolute inset-0 z-20 pointer-events-none">
              <div className="absolute inset-0 rounded-xl bg-white/72" style={{ animation: 'bsFlash 0.22s ease forwards' }} />
              <span className="absolute top-[14%] left-[6%] text-4xl"  style={{ animation: 'bsPop 0.35s ease forwards' }}>💥</span>
              <span className="absolute top-[36%] right-[6%] text-2xl" style={{ animation: 'bsPop 0.35s 0.06s ease both', opacity:0 }}>⭐</span>
              <span className="absolute bottom-[24%] left-[33%] text-xl" style={{ animation: 'bsPop 0.35s 0.11s ease both', opacity:0 }}>✨</span>
              <span className="absolute top-[52%] left-[18%] text-lg"  style={{ animation: 'bsPop 0.3s 0.17s ease both', opacity:0 }}>⚡</span>
            </div>
          )}
          <div style={{
            transform: monTransformX,
            transitionProperty: 'transform',
            transitionTimingFunction: 'cubic-bezier(0.4,0,0.2,1)',
            transitionDuration: `${monMoveDur}ms`,
            willChange: 'transform',
          }}>
            <DynamicSprite
              key={monsterAction}
              folder={monster.folder} action={monsterAction}
              frames={monster.frames} isHero={false}
              type={monster.type}     flipped={monsterFlipped}
              facesRight={monster.facesRight}
              isHurt={monsterHurt}
            />
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          COMBO DISPLAY
      ═════════════════════════════════════════════════════════════════════ */}
      {showCombo && combo >= 2 && (
        <div className="fixed top-[18%] left-1/2 -translate-x-1/2 z-50 pointer-events-none text-center"
          style={{ animation: 'bsComboIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
          <div className="text-4xl font-black" style={{ color: combo >= 5 ? '#f59e0b' : '#22d3ee', textShadow: `0 0 30px ${combo >= 5 ? '#f59e0b' : '#22d3ee'}` }}>
            {combo}x COMBO!
          </div>
          {combo >= 5 && <div className="text-lg font-bold text-yellow-300 mt-1">🔥 رائع!</div>}
          {combo >= 3 && combo < 5 && <div className="text-sm text-cyan-300 mt-1">⚡ ممتاز!</div>}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          QUESTION PANEL — Glassmorphism
      ═════════════════════════════════════════════════════════════════════ */}
      <div className="relative z-20 w-full max-w-5xl mx-auto px-2 pb-2">
        <div className="rounded-3xl border overflow-hidden"
          style={{
            background:           'linear-gradient(135deg,rgba(6,182,212,0.08) 0%,rgba(0,0,0,0.9) 50%,rgba(6,182,212,0.04) 100%)',
            backdropFilter:       'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
            borderColor:          'rgba(6,182,212,0.2)',
            boxShadow:            '0 0 60px rgba(6,182,212,0.1),0 0 120px rgba(6,182,212,0.05),0 24px 80px rgba(0,0,0,0.88),inset 0 1px 0 rgba(255,255,255,0.07)',
          }}>
          {/* Accent line top */}
          <div className="h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(6,182,212,0.85),transparent)' }} />

          <div className="p-5 md:p-8">
            <h3 className="text-center text-sm sm:text-base md:text-xl font-bold mb-5 text-white leading-relaxed" dir="rtl"
              style={{ textShadow: '0 0 24px rgba(6,182,212,0.25)' }}>
              {island.question.text}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {island.question.options.map((opt, i) => (
                <button key={i} onClick={() => handleAnswer(i)} disabled={isLocked} dir="rtl"
                  className="group relative p-4 md:p-5 rounded-2xl text-sm md:text-base font-bold text-right border transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>
                  {/* Hover bg */}
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ background: 'linear-gradient(135deg,rgba(6,182,212,0.16),rgba(6,182,212,0.03))' }} />
                  {/* Hover border */}
                  <div className="absolute inset-0 rounded-2xl border border-transparent group-hover:border-cyan-400/65 transition-all duration-200" />
                  {/* Hover inner glow */}
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ boxShadow: 'inset 0 0 30px rgba(6,182,212,0.18),0 0 22px rgba(6,182,212,0.14)' }} />
                  {/* Left bar */}
                  <div className="absolute left-0 top-2.5 bottom-2.5 w-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ background: 'rgba(6,182,212,0.9)' }} />
                  <div className="relative flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 border border-white/10 group-hover:border-cyan-400/55 transition-all duration-200"
                      style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(6,182,212,0.85)' }}>
                      {i + 1}
                    </span>
                    <span className="text-white/90 group-hover:text-cyan-50 transition-colors duration-200">{opt}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Accent line bottom */}
          <div className="h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(6,182,212,0.4),transparent)' }} />
        </div>
      </div>

      {/* Back */}
      <button onClick={onBack}
        className="absolute top-3 left-3 z-30 px-4 py-2 bg-black/60 hover:bg-red-900/80 rounded-full text-white font-bold border border-white/20 text-xs md:text-sm backdrop-blur-sm transition-all">
        🏳️ انسحاب
      </button>

      {/* Answer flash */}
      {showResult !== 'none' && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className={`text-7xl md:text-9xl font-black drop-shadow-2xl`}
            style={{ animation: 'bsPop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards', color: showResult === 'correct' ? '#4ade80' : '#f87171' }}>
            {showResult === 'correct' ? '✅' : '❌'}
          </div>
        </div>
      )}

      {/* ════ VICTORY ════════════════════════════════════════════════════════ */}
      {gameResult === 'victory' && (
        <EpicModal type="victory" monsterName={monster.name}
          correct={correctAnswers} wrong={wrongAnswers}
          damageDealt={damageDealt} damageReceived={damageReceived}
          accuracy={accuracy} onAction={onVictory} />
      )}

      {/* ════ DEFEAT ═════════════════════════════════════════════════════════ */}
      {gameResult === 'defeat' && (
        <EpicModal type="defeat" monsterName={monster.name}
          correct={correctAnswers} wrong={wrongAnswers}
          damageDealt={damageDealt} damageReceived={damageReceived}
          accuracy={accuracy} onAction={onDefeat} />
      )}

      {/* ════ KEYFRAMES ══════════════════════════════════════════════════════ */}
      <style>{`
        @keyframes bsBgZoom {
          0%   { transform: scale(1.12) translate(0%,0%); }
          50%  { transform: scale(1.18) translate(0.5%,0.4%); }
          100% { transform: scale(1.12) translate(-0.5%,-0.4%); }
        }
        @keyframes bsPop {
          0%   { transform: scale(0.1) rotate(-12deg); opacity:0; }
          60%  { transform: scale(1.25) rotate(4deg);  opacity:1; }
          100% { transform: scale(1)   rotate(0deg);   opacity:1; }
        }
        @keyframes bsShake {
          0%,100% { transform:translate(0,0) rotate(0deg); }
          15%  { transform:translate(-8px,3px) rotate(-0.6deg); }
          30%  { transform:translate(8px,-3px) rotate(0.6deg); }
          45%  { transform:translate(-5px,4px) rotate(-0.3deg); }
          60%  { transform:translate(5px,-2px) rotate(0.3deg); }
          80%  { transform:translate(-2px,1px); }
        }
        @keyframes bsFlash {
          0%   { opacity:0.8; }
          100% { opacity:0; }
        }
        @keyframes bsWhiteFlash {
          0%   { opacity:0.55; }
          100% { opacity:0; }
        }
        @keyframes bsScan {
          0%   { left:-8%; }
          100% { left:108%; }
        }
        @keyframes bsCritPulse {
          0%,100% { box-shadow: inherit; opacity:1; }
          50%     { opacity:0.65; }
        }
        @keyframes bsFloatDmg {
          0%   { transform:translateX(-50%) translateY(0)    scale(1.2); opacity:1; }
          30%  { transform:translateX(-50%) translateY(-30px) scale(1);   opacity:1; }
          100% { transform:translateX(-50%) translateY(-80px) scale(0.7); opacity:0; }
        }
        @keyframes bsComboIn {
          0%   { opacity:0; transform:translateX(-50%) scale(0.5); }
          60%  { opacity:1; transform:translateX(-50%) scale(1.15); }
          100% { opacity:1; transform:translateX(-50%) scale(1); }
        }
        @keyframes bsModalIn {
          0%   { opacity:0; transform:scale(0.88) translateY(24px); }
          60%  { opacity:1; transform:scale(1.03) translateY(-4px); }
          100% { opacity:1; transform:scale(1)    translateY(0); }
        }
        @keyframes bsParticle {
          0%   { opacity:1; transform:translateY(0) scale(1) rotate(0deg); }
          100% { opacity:0; transform:translateY(-70px) scale(0.3) rotate(180deg); }
        }
        @keyframes bsGlowPulse {
          0%,100% { opacity:0.5; }
          50%     { opacity:1; }
        }
        @keyframes bsFloat {
          0%,100% { transform:translateY(0); }
          50%     { transform:translateY(-8px); }
        }
        @keyframes bsAccuracyFill {
          0%   { width:0%; }
          100% { width:var(--acc-w); }
        }
      `}</style>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Epic Victory / Defeat full-screen overlay
// ─────────────────────────────────────────────────────────────────────────────
interface EpicModalProps {
  type:           'victory' | 'defeat';
  monsterName:    string;
  correct:        number;
  wrong:          number;
  damageDealt:    number;
  damageReceived: number;
  accuracy:       number;
  onAction:       () => void;
}

const EpicModal = ({ type, monsterName, correct, wrong, damageDealt, damageReceived, accuracy, onAction }: EpicModalProps) => {
  const isVictory  = type === 'victory';
  const accent     = isVictory ? '#eab308' : '#ef4444';
  const accentRgb  = isVictory ? '234,179,8' : '239,68,68';
  const particles  = isVictory
    ? ['⭐','✨','🌟','💫','🏆','⭐','✨','🌟']
    : ['💀','🩸','☠️','💀','🩸','☠️','💀','🩸'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      style={{ background: `radial-gradient(ellipse at center,rgba(${accentRgb},0.2) 0%,rgba(0,0,0,0.96) 70%)` }}>

      <div className="absolute inset-0" style={{ backdropFilter:'blur(22px)', WebkitBackdropFilter:'blur(22px)' }} />

      {/* Floating particles */}
      {particles.map((p, i) => (
        <span key={i} className="absolute text-2xl pointer-events-none select-none"
          style={{
            left:      `${6 + i * 13}%`,
            bottom:    `${12 + (i % 4) * 10}%`,
            animation: `bsParticle ${1.6 + i * 0.22}s ${i * 0.14}s ease-out infinite`,
            opacity:   0,
          }}>{p}</span>
      ))}

      {/* Ambient orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-96 h-96 rounded-full blur-3xl -top-24 -left-24"
          style={{ background:`rgba(${accentRgb},0.14)`, animation:'bsGlowPulse 3s ease-in-out infinite' }} />
        <div className="absolute w-96 h-96 rounded-full blur-3xl -bottom-24 -right-24"
          style={{ background:`rgba(${accentRgb},0.10)`, animation:'bsGlowPulse 3.5s 0.6s ease-in-out infinite' }} />
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-lg mx-4 rounded-3xl border overflow-hidden"
        style={{
          borderColor: `rgba(${accentRgb},0.38)`,
          background:  `linear-gradient(145deg,rgba(${accentRgb},0.13) 0%,rgba(0,0,0,0.97) 55%,rgba(${accentRgb},0.07) 100%)`,
          boxShadow:   `0 0 100px rgba(${accentRgb},0.38),0 0 200px rgba(${accentRgb},0.12),0 40px 80px rgba(0,0,0,0.8)`,
          animation:   'bsModalIn 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards',
        }}>

        <div className="h-0.5" style={{ background:`linear-gradient(90deg,transparent,${accent},transparent)` }} />

        <div className="p-8 text-center">

          {/* Emoji */}
          <div className="text-7xl mb-3" style={{ animation:'bsFloat 2.5s ease-in-out infinite' }}>
            {isVictory ? '🏆' : '💀'}
          </div>

          {/* Title */}
          <h2 className="text-4xl md:text-5xl font-black mb-1 tracking-tight"
            style={{ color:accent, textShadow:`0 0 40px rgba(${accentRgb},1),0 0 80px rgba(${accentRgb},0.5)` }}>
            {isVictory ? 'انتصار!' : 'هُزِمت!'}
          </h2>

          <p className="text-white/45 mb-6 text-sm" dir="rtl">
            {isVictory ? `أسقطت ${monsterName} في المعركة!` : `${monsterName} كان أقوى هذه المرة…`}
          </p>

          {/* Stats 2×2 */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <StatCard label="إجابات صحيحة" value={correct}            color="#4ade80" icon="✅" />
            <StatCard label="إجابات خاطئة"  value={wrong}              color="#f87171" icon="❌" />
            <StatCard label="ضرر ألحقته"    value={`${damageDealt}%`}  color={accent}  icon="⚔️" />
            <StatCard label="ضرر تلقيته"    value={`${damageReceived}%`} color="#f97316" icon="🛡️" />
          </div>

          {/* Accuracy bar */}
          <div className="mb-6 p-3 rounded-2xl border border-white/8 bg-white/4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white/45 text-xs" dir="rtl">الدقة</span>
              <span className="font-black text-sm"
                style={{ color: accuracy >= 70 ? '#4ade80' : accuracy >= 40 ? '#f59e0b' : '#f87171' }}>
                {accuracy}%
              </span>
            </div>
            <div className="h-2.5 bg-black/60 rounded-full overflow-hidden">
              <div className="h-full rounded-full"
                style={{
                  width:      `${accuracy}%`,
                  background: accuracy >= 70 ? 'linear-gradient(90deg,#166534,#4ade80)' : accuracy >= 40 ? 'linear-gradient(90deg,#78350f,#f59e0b)' : 'linear-gradient(90deg,#7f1d1d,#f87171)',
                  boxShadow:  `0 0 12px ${accuracy >= 70 ? '#4ade80' : accuracy >= 40 ? '#f59e0b' : '#f87171'}`,
                  transition: 'width 1.2s cubic-bezier(0.4,0,0.2,1)',
                }} />
            </div>
          </div>

          {/* Action button */}
          <button onClick={onAction}
            className="w-full py-4 rounded-2xl font-black text-lg tracking-wide active:scale-95 transition-all duration-150 relative overflow-hidden group"
            style={{
              background: isVictory
                ? 'linear-gradient(135deg,#78350f,#ca8a04,#eab308,#fde047)'
                : 'linear-gradient(135deg,#7f1d1d,#b91c1c,#ef4444,#f87171)',
              boxShadow: `0 0 40px rgba(${accentRgb},0.65),0 8px 24px rgba(0,0,0,0.5)`,
              color: isVictory ? '#000' : '#fff',
            }}>
            {/* Shimmer on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 overflow-hidden rounded-2xl">
              <div className="absolute inset-y-0 w-16 bg-white/25 blur-sm" style={{ animation:'bsScan 1s linear infinite' }} />
            </div>
            <span className="relative">{isVictory ? '🚀 متابعة المغامرة' : '↩ حاول مجدداً'}</span>
          </button>
        </div>

        <div className="h-0.5" style={{ background:`linear-gradient(90deg,transparent,rgba(${accentRgb},0.45),transparent)` }} />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, color, icon }: { label:string; value:string|number; color:string; icon:string }) => (
  <div className="rounded-xl p-3 border border-white/8 bg-white/5 text-center">
    <div className="text-lg mb-0.5">{icon}</div>
    <div className="text-xl font-black" style={{ color }}>{value}</div>
    <div className="text-white/40 text-xs mt-0.5" dir="rtl">{label}</div>
  </div>
);

const Err = ({ msg }: { msg: string }) => (
  <div className="min-h-screen bg-black text-white flex items-center justify-center text-xl">{msg}</div>
);

export default BattleScreen;
