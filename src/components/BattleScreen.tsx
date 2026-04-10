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

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const FRAME_MS   = 110;
const CHARGE_MS  = 520;
const RETURN_MS  = 480;

// ─────────────────────────────────────────────────────────────────────────────
// Sprite configs — frame counts measured from actual PNG dimensions
// facesRight: true  = sprite image is drawn facing RIGHT
//             false = sprite image is drawn facing LEFT
// ─────────────────────────────────────────────────────────────────────────────
interface HeroConfig {
  frames: Record<ActionState, number>;
  facesRight: boolean;
}

const HERO_CONFIGS: Record<string, HeroConfig> = {
  hero1: { facesRight: false, frames: { idle: 7,  run: 10, attack: 10, attack2: 10, hurt: 5,  death: 9  } },
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
  { name: 'جالب الموت',     folder: 'monster2', type: 'individual', facesRight: true,
    frames: { idle: 8,  run: 8,  attack: 10, attack2: 9,  hurt: 3, death: 10 } },
  { name: 'سيد الظلام',     folder: 'monster3', type: 'sheet',      facesRight: true,
    frames: { idle: 8,  run: 8,  attack: 8,  attack2: 8,  hurt: 3, death: 7  } },
  { name: 'الفارس المتمرد', folder: 'monster4', type: 'sheet',      facesRight: false,
    frames: { idle: 11, run: 8,  attack: 7,  attack2: 7,  hurt: 4, death: 11 } },
];

// ─────────────────────────────────────────────────────────────────────────────
// Path resolver (original getPath logic — file names / folders untouched)
// ─────────────────────────────────────────────────────────────────────────────
function getSpritePath(folder: string, type: string, action: ActionState, frame: number): string {
  if (type === 'individual') {
    const nameMap: Partial<Record<ActionState, string>> = {
      idle:    'Idle',
      run:     'Idle',
      attack:  'Attack',
      attack2: 'Cast',
      hurt:    'Hurt',
      death:   'Death',
    };
    const n = nameMap[action] ?? 'Idle';
    return `/src/assets/combat/${folder}/Individual Sprite/${n}/Bringer-of-Death_${n}_${frame}.png`;
  }

  const sub = (folder === 'hero3' || folder.startsWith('monster')) ? 'Sprites/' : '';
  let file = 'Idle.png';

  if      (action === 'run')    file = folder === 'monster1' ? 'Move.png' : 'Run.png';
  else if (action === 'attack') {
    if      (folder === 'hero2'   ) file = 'Attack_1.png';
    else if (folder === 'monster1') file = 'Attack.png';
    else                            file = 'Attack1.png';
  }
  else if (action === 'attack2') {
    if      (folder === 'hero2'   ) file = 'Attack_2.png';
    else if (folder === 'monster1') file = 'Attack.png';
    else                            file = 'Attack2.png';
  }
  else if (action === 'hurt') {
    if      (folder === 'hero1' || folder === 'hero2') file = 'Hit.png';
    else if (folder === 'monster3'                   ) file = 'Take hit.png';
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
  const sheetActions: ActionState[] = ['idle','run','attack','attack2','hurt','death'];
  sheetActions.forEach(a => paths.push(getSpritePath(heroFolder, 'sheet', a, 1)));
  if (monster.type === 'individual') {
    const sets: Array<[string, number]> = [
      ['Idle',6],['Attack',10],['Cast',9],['Hurt',3],['Death',10],
    ];
    sets.forEach(([name, count]) => {
      for (let i = 1; i <= count; i++)
        paths.push(`/src/assets/combat/monster2/Individual Sprite/${name}/Bringer-of-Death_${name}_${i}.png`);
    });
  } else {
    sheetActions.forEach(a => paths.push(getSpritePath(monster.folder, 'sheet', a, 1)));
  }
  return paths;
}

// ─────────────────────────────────────────────────────────────────────────────
// DynamicSprite — memoized, GPU-accelerated
// scaleX formula: (isHero === (facesRight !== flipped)) ? 1 : -1
//   Heroes sit LEFT and must face RIGHT; Monsters sit RIGHT and must face LEFT.
//   facesRight=true  means the sprite image is drawn facing RIGHT.
//   When a character retreats, `flipped` inverts the facing direction.
// ─────────────────────────────────────────────────────────────────────────────
interface SpriteProps {
  folder:     string;
  action:     ActionState;
  frames:     Record<ActionState, number>;
  isHero:     boolean;
  type:       'sheet' | 'individual';
  flipped:    boolean;
  facesRight: boolean;
}

const DynamicSprite = memo(({ folder, action, frames, isHero, type, flipped, facesRight }: SpriteProps) => {
  const [frame, setFrame] = useState(1);
  const total = frames[action] ?? 1;

  useEffect(() => {
    setFrame(1);
    const id = setInterval(() => setFrame(f => (f % total) + 1), FRAME_MS);
    return () => clearInterval(id);
  }, [action, total]);

  // Heroes face RIGHT in arena; Monsters face LEFT in arena.
  // facesRight tells us whether the raw sprite image faces right.
  // flipped is set during retreat to invert direction.
  const scaleX = (isHero === (facesRight !== flipped)) ? 1 : -1;

  const src  = getSpritePath(folder, type, action, frame);
  const posX = total > 1 ? ((frame - 1) / (total - 1)) * 100 : 0;

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
        willChange:         'background-position',
      }}
    />
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// BattleScreen
// ─────────────────────────────────────────────────────────────────────────────
const BattleScreen = ({ islandId, onBack, onVictory, onDefeat }: Props) => {
  const { currentPlayer } = useGame();

  const island    = ISLANDS.find(is => is.id === islandId);
  const heroData  = CHARACTERS.find(c => c.id === currentPlayer?.characterId);
  const monster   = useMemo(() => MONSTER_CONFIGS[islandId % 4], [islandId]);
  const heroConfig = useMemo<HeroConfig>(
    () => HERO_CONFIGS[heroData?.folder ?? 'hero1'] ?? HERO_CONFIGS['hero1'],
    [heroData],
  );
  const heroFrames = heroConfig.frames;

  const bgUrl = `/src/assets/combat/monster4/islands/island${islandId + 1}.png`;

  // ── Preloading ────────────────────────────────────────────────────────────
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!heroData || !island) return;
    const urls = buildPreloadList(heroData.folder, monster, bgUrl);
    Promise.all(urls.map(preloadImage)).then(() => setReady(true));
  }, []);

  // ── HP ────────────────────────────────────────────────────────────────────
  const [heroHP,         setHeroHP]         = useState(100);
  const [monsterHP,      setMonsterHP]      = useState(100);
  const [heroHPGhost,    setHeroHPGhost]    = useState(100);
  const [monsterHPGhost, setMonsterHPGhost] = useState(100);

  // ── Animation ─────────────────────────────────────────────────────────────
  const [heroAction,    setHeroAction]    = useState<ActionState>('idle');
  const [monsterAction, setMonsterAction] = useState<ActionState>('idle');
  const [heroPos,       setHeroPos]       = useState<CharPos>('home');
  const [monsterPos,    setMonsterPos]    = useState<CharPos>('home');
  const [heroFlipped,   setHeroFlipped]   = useState(false);
  const [monsterFlipped,setMonsterFlipped]= useState(false);
  const [attackVar,     setAttackVar]     = useState<'attack'|'attack2'>('attack');

  // ── VFX ───────────────────────────────────────────────────────────────────
  const [showResult,    setShowResult]    = useState<'none'|'correct'|'wrong'>('none');
  const [showImpact,    setShowImpact]    = useState(false);
  const [showWhiteFlash,setShowWhiteFlash]= useState(false);
  const [cameraZoom,    setCameraZoom]    = useState(false);
  const [screenShake,   setScreenShake]  = useState(false);
  const [gameResult,    setGameResult]   = useState<GameResult>('none');

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
  useEffect(() => { const t = setTimeout(() => setHeroHPGhost(heroHP),    950); return () => clearTimeout(t); }, [heroHP]);
  useEffect(() => { const t = setTimeout(() => setMonsterHPGhost(monsterHP), 950); return () => clearTimeout(t); }, [monsterHP]);

  // ── Death detection ───────────────────────────────────────────────────────
  useEffect(() => {
    if (monsterHP <= 0 && !gameOver.current) {
      gameOver.current = true;
      setMonsterAction('death');
      addTimer(() => setGameResult('victory'), monster.frames.death * FRAME_MS + 400);
    }
  }, [monsterHP]);

  useEffect(() => {
    if (heroHP <= 0 && !gameOver.current) {
      gameOver.current = true;
      setHeroAction('death');
      addTimer(() => setGameResult('defeat'), heroFrames.death * FRAME_MS + 400);
    }
  }, [heroHP]);

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!currentPlayer) return <Err msg="بيانات اللاعب غير موجودة!" />;
  if (!island)        return <Err msg="الجزيرة غير موجودة!" />;
  if (!heroData)      return <Err msg="بيانات البطل غير موجودة!" />;

  // ── Loading screen ────────────────────────────────────────────────────────
  if (!ready) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6">
        <div className="text-5xl animate-pulse">⚔️</div>
        <p className="text-white/70 text-lg font-bold tracking-widest">جاري تحميل المعركة…</p>
        <div className="flex gap-2">
          {[0,1,2].map(i => (
            <div key={i} className="w-3 h-3 rounded-full bg-cyan-400"
              style={{ animation: `pulse 1s ${i * 0.2}s ease-in-out infinite` }} />
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
    if (index === right) { setCorrectAnswers(p => p + 1); doHeroAttack();   }
    else                 { setWrongAnswers(p => p + 1);   doMonsterAttack(); }
  };

  // ── Epic Hero Attack ──────────────────────────────────────────────────────
  const doHeroAttack = () => {
    const variant  = attackVar;
    const atkMs    = heroFrames[variant] * FRAME_MS;
    const halfAtk  = Math.floor(atkMs / 2);
    const hurtMs   = monster.frames.hurt * FRAME_MS;
    setAttackVar(v => v === 'attack' ? 'attack2' : 'attack');

    setShowResult('correct');
    setCameraZoom(true);

    // 1. Charge toward monster
    setHeroAction('run');
    setHeroPos('charging');
    setHeroFlipped(false);

    // 2. Arrive → attack
    addTimer(() => {
      setHeroPos('atEnemy');
      setHeroAction(variant);
    }, CHARGE_MS);

    // 3. Impact at midpoint of attack
    addTimer(() => {
      setShowImpact(true);
      setShowWhiteFlash(true);
      setScreenShake(true);
      setMonsterAction('hurt');
      const dmg = 50;
      setMonsterHP(prev => Math.max(0, prev - dmg));
      setDamageDealt(prev => prev + dmg);
    }, CHARGE_MS + halfAtk);

    addTimer(() => setShowWhiteFlash(false), CHARGE_MS + halfAtk + 80);
    addTimer(() => { setShowImpact(false); setScreenShake(false); }, CHARGE_MS + halfAtk + 220);
    addTimer(() => setCameraZoom(false), CHARGE_MS + halfAtk + 350);

    // 4. Wait for full hurt animation to complete, then hero retreats
    const retreatAt = CHARGE_MS + Math.max(atkMs, halfAtk + hurtMs);
    addTimer(() => {
      setHeroAction('run');
      setHeroFlipped(true);
      setHeroPos('returning');
    }, retreatAt);

    // 5. Back home
    addTimer(() => {
      setHeroAction('idle');
      setHeroFlipped(false);
      setHeroPos('home');
      setMonsterAction('idle');
      setShowResult('none');
    }, retreatAt + RETURN_MS);
  };

  // ── Epic Monster Attack ───────────────────────────────────────────────────
  const doMonsterAttack = () => {
    const atkMs   = monster.frames.attack * FRAME_MS;
    const halfAtk = Math.floor(atkMs / 2);
    const hurtMs  = heroFrames.hurt * FRAME_MS;

    setShowResult('wrong');

    // 1. Charge toward hero
    setMonsterAction('run');
    setMonsterFlipped(false);
    setMonsterPos('charging');

    // 2. Arrive → attack
    addTimer(() => {
      setMonsterPos('atEnemy');
      setMonsterAction('attack');
      setMonsterFlipped(false);
    }, CHARGE_MS);

    // 3. Hero takes hit
    addTimer(() => {
      setHeroAction('hurt');
      setShowWhiteFlash(true);
      setScreenShake(true);
      const dmg = 25;
      setHeroHP(prev => Math.max(0, prev - dmg));
      setDamageReceived(prev => prev + dmg);
    }, CHARGE_MS + halfAtk);

    addTimer(() => setShowWhiteFlash(false), CHARGE_MS + halfAtk + 80);
    addTimer(() => setScreenShake(false), CHARGE_MS + halfAtk + 220);

    // 4. Wait for hero hurt to finish, then monster retreats
    const retreatAt = CHARGE_MS + Math.max(atkMs, halfAtk + hurtMs);
    addTimer(() => {
      setMonsterAction('run');
      setMonsterFlipped(true);
      setMonsterPos('returning');
    }, retreatAt);

    // 5. Home
    addTimer(() => {
      setMonsterAction('idle');
      setMonsterFlipped(false);
      setMonsterPos('home');
      setHeroAction('idle');
      setShowResult('none');
    }, retreatAt + RETURN_MS);
  };

  // ── Position → CSS ────────────────────────────────────────────────────────
  const CHARGE_DIST = 'clamp(110px, 27vw, 370px)';
  const heroTransformX = (heroPos === 'charging' || heroPos === 'atEnemy') ? `translateX(${CHARGE_DIST})` : 'translateX(0)';
  const heroMoveDur    = heroPos === 'charging' ? CHARGE_MS : heroPos === 'returning' ? RETURN_MS : 0;
  const monTransformX  = (monsterPos === 'charging' || monsterPos === 'atEnemy') ? `translateX(-${CHARGE_DIST})` : 'translateX(0)';
  const monMoveDur     = monsterPos === 'charging' ? CHARGE_MS : monsterPos === 'returning' ? RETURN_MS : 0;

  const heroHPColor   = heroHP > 50 ? '#22d3ee' : heroHP > 25 ? '#f59e0b' : '#ef4444';
  const monsterHPColor = monsterHP > 50 ? '#ef4444' : monsterHP > 25 ? '#f97316' : '#fbbf24';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      dir="ltr"
      className="relative min-h-screen flex flex-col items-center justify-between overflow-hidden"
      style={screenShake ? { animation: 'bsShake 0.35s ease both' } : undefined}
    >
      {/* Background */}
      <div
        className="absolute inset-0 bg-center bg-cover"
        style={{
          backgroundImage: `url('${bgUrl}')`,
          animation: 'bsBgZoom 24s ease-in-out infinite alternate',
          transform: 'scale(1.12)',
        }}
      />
      <div className="absolute inset-0 bg-black/55" />

      {/* Cinematic vignette */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-500"
        style={{ boxShadow: cameraZoom ? 'inset 0 0 200px rgba(0,0,0,0.85)' : 'inset 0 0 80px rgba(0,0,0,0.4)' }}
      />

      {/* White flash on hit */}
      {showWhiteFlash && (
        <div className="fixed inset-0 z-40 pointer-events-none bg-white" style={{ animation: 'bsWhiteFlash 0.12s ease forwards' }} />
      )}

      {/* ════ HP BARS ════════════════════════════════════════════════════════ */}
      <div className="relative z-20 w-full max-w-6xl flex items-center gap-3 p-3 md:p-5">

        {/* Hero HP */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-cyan-300 font-black text-xs md:text-sm truncate tracking-wide"
              style={{ textShadow: '0 0 14px rgba(6,182,212,1),0 0 28px rgba(6,182,212,0.5)' }}>
              {currentPlayer.name}
            </span>
            <span className="text-cyan-400 font-mono text-xs ml-2 shrink-0 tabular-nums">{heroHP}<span className="text-cyan-600">/100</span></span>
          </div>
          {/* Bar container */}
          <div className="relative h-5 md:h-6 bg-black/90 rounded-full overflow-hidden"
            style={{
              border: '1px solid rgba(6,182,212,0.5)',
              boxShadow: '0 0 18px rgba(6,182,212,0.35), inset 0 0 8px rgba(0,0,0,0.6)',
            }}>
            {/* Ghost bar */}
            <div className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${heroHPGhost}%`,
                background: 'rgba(255,255,255,0.18)',
                transition: 'width 950ms cubic-bezier(0.4,0,0.2,1)',
              }} />
            {/* Actual bar */}
            <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
              style={{
                width: `${heroHP}%`,
                background: `linear-gradient(90deg, rgba(14,116,144,0.9), ${heroHPColor}, rgba(165,243,252,0.9))`,
                boxShadow: `0 0 16px ${heroHPColor}, 0 0 4px rgba(255,255,255,0.4), inset 0 1px 0 rgba(255,255,255,0.35)`,
              }} />
            {/* Scan line shimmer */}
            <div className="absolute inset-0 rounded-full pointer-events-none overflow-hidden">
              <div className="absolute inset-y-0 w-8 bg-white/20 blur-sm" style={{ animation: 'bsScan 2.2s linear infinite' }} />
            </div>
            {/* Top gloss */}
            <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
          </div>
        </div>

        <span className="text-white text-xl font-black shrink-0 px-1"
          style={{ textShadow: '0 0 20px rgba(255,255,255,0.7)' }}>⚔️</span>

        {/* Monster HP */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-red-400 font-mono text-xs mr-2 shrink-0 tabular-nums">{monsterHP}<span className="text-red-700">/100</span></span>
            <span className="text-red-400 font-black text-xs md:text-sm truncate tracking-wide"
              style={{ textShadow: '0 0 14px rgba(239,68,68,1),0 0 28px rgba(239,68,68,0.5)' }}>
              {monster.name}
            </span>
          </div>
          <div className="relative h-5 md:h-6 bg-black/90 rounded-full overflow-hidden"
            style={{
              border: '1px solid rgba(239,68,68,0.5)',
              boxShadow: '0 0 18px rgba(239,68,68,0.35), inset 0 0 8px rgba(0,0,0,0.6)',
            }}>
            {/* Ghost bar */}
            <div className="absolute inset-y-0 right-0 rounded-full"
              style={{
                width: `${monsterHPGhost}%`,
                background: 'rgba(255,255,255,0.18)',
                transition: 'width 950ms cubic-bezier(0.4,0,0.2,1)',
              }} />
            {/* Actual bar */}
            <div className="absolute inset-y-0 right-0 rounded-full transition-all duration-300"
              style={{
                width: `${monsterHP}%`,
                background: `linear-gradient(270deg, rgba(127,29,29,0.9), ${monsterHPColor}, rgba(252,165,165,0.9))`,
                boxShadow: `0 0 16px ${monsterHPColor}, 0 0 4px rgba(255,255,255,0.4), inset 0 1px 0 rgba(255,255,255,0.35)`,
              }} />
            {/* Scan line shimmer */}
            <div className="absolute inset-0 rounded-full pointer-events-none overflow-hidden" style={{ transform: 'scaleX(-1)' }}>
              <div className="absolute inset-y-0 w-8 bg-white/20 blur-sm" style={{ animation: 'bsScan 2.6s linear infinite' }} />
            </div>
            {/* Top gloss */}
            <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ════ BATTLE ARENA ═══════════════════════════════════════════════════ */}
      <div
        className="relative z-10 w-full max-w-7xl h-[42vh] flex items-end justify-between px-4 sm:px-10 md:px-20 pb-4 transition-transform duration-500"
        style={{
          transform: cameraZoom ? 'scale(1.07)' : 'scale(1)',
          transformOrigin: 'center bottom',
        }}
      >
        {/* Hero — left */}
        <div style={{
          transform:          heroTransformX,
          transitionProperty: 'transform',
          transitionTimingFunction: 'ease-in-out',
          transitionDuration: `${heroMoveDur}ms`,
          willChange:         'transform',
        }}>
          <DynamicSprite
            key={heroAction}
            folder={heroData.folder} action={heroAction}
            frames={heroFrames}     isHero={true}
            type="sheet"            flipped={heroFlipped}
            facesRight={heroConfig.facesRight}
          />
        </div>

        {/* Monster — right + impact flash */}
        <div className="relative">
          {showImpact && (
            <div className="absolute inset-0 z-20 pointer-events-none">
              <div className="absolute inset-0 rounded-xl bg-white/70" style={{ animation: 'bsFlash 0.22s ease forwards' }} />
              <span className="absolute top-[15%] left-[8%]  text-4xl" style={{ animation: 'bsPop 0.35s ease forwards' }}>💥</span>
              <span className="absolute top-[38%] right-[8%] text-2xl" style={{ animation: 'bsPop 0.35s 0.06s ease both', opacity: 0 }}>⭐</span>
              <span className="absolute bottom-[25%] left-[35%] text-xl" style={{ animation: 'bsPop 0.35s 0.12s ease both', opacity: 0 }}>✨</span>
              <span className="absolute top-[55%] left-[20%] text-lg" style={{ animation: 'bsPop 0.3s 0.18s ease both', opacity: 0 }}>⚡</span>
            </div>
          )}
          <div style={{
            transform:          monTransformX,
            transitionProperty: 'transform',
            transitionTimingFunction: 'ease-in-out',
            transitionDuration: `${monMoveDur}ms`,
            willChange:         'transform',
          }}>
            <DynamicSprite
              key={monsterAction}
              folder={monster.folder} action={monsterAction}
              frames={monster.frames} isHero={false}
              type={monster.type}     flipped={monsterFlipped}
              facesRight={monster.facesRight}
            />
          </div>
        </div>
      </div>

      {/* ════ QUESTION PANEL ═════════════════════════════════════════════════ */}
      <div className="relative z-20 w-full max-w-5xl mx-auto px-2 pb-2">
        <div
          className="rounded-3xl border shadow-2xl overflow-hidden"
          style={{
            background:       'linear-gradient(135deg, rgba(6,182,212,0.07) 0%, rgba(0,0,0,0.88) 50%, rgba(6,182,212,0.04) 100%)',
            backdropFilter:   'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
            borderColor:      'rgba(6,182,212,0.22)',
            boxShadow:        '0 0 60px rgba(6,182,212,0.12), 0 0 120px rgba(6,182,212,0.06), 0 24px 80px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        >
          {/* Top accent line */}
          <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.8), transparent)' }} />

          <div className="p-5 md:p-8">
            {/* Question text */}
            <div className="relative mb-6">
              <div className="absolute -left-1 top-0 bottom-0 w-0.5 rounded-full" style={{ background: 'linear-gradient(180deg, rgba(6,182,212,0.9), transparent)' }} />
              <h3 className="text-center text-sm sm:text-base md:text-xl font-bold text-white leading-relaxed pl-3" dir="rtl"
                style={{ textShadow: '0 0 30px rgba(6,182,212,0.3)' }}>
                {island.question.text}
              </h3>
            </div>

            {/* Answer options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {island.question.options.map((opt, i) => (
                <button key={i} onClick={() => handleAnswer(i)} disabled={isLocked} dir="rtl"
                  className="group relative p-4 md:p-5 rounded-2xl text-sm md:text-base font-bold text-right border transition-all duration-250 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 overflow-hidden"
                  style={{
                    background:  'rgba(255,255,255,0.04)',
                    borderColor: 'rgba(255,255,255,0.09)',
                  }}
                >
                  {/* Hover background fill */}
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-250"
                    style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(6,182,212,0.04))' }} />
                  {/* Hover border glow */}
                  <div className="absolute inset-0 rounded-2xl border border-transparent group-hover:border-cyan-400/60 transition-all duration-250" />
                  {/* Hover inner glow */}
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-250"
                    style={{ boxShadow: 'inset 0 0 28px rgba(6,182,212,0.22), 0 0 20px rgba(6,182,212,0.18)' }} />
                  {/* Left accent bar on hover */}
                  <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-250"
                    style={{ background: 'rgba(6,182,212,0.9)' }} />
                  <div className="relative flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 transition-all duration-250 border border-white/10 group-hover:border-cyan-400/60 group-hover:text-cyan-200"
                      style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(6,182,212,0.85)' }}>
                      {i + 1}
                    </span>
                    <span className="text-white/90 group-hover:text-cyan-50 transition-colors duration-250">{opt}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Bottom accent line */}
          <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.4), transparent)' }} />
        </div>
      </div>

      {/* Back button */}
      <button onClick={onBack}
        className="absolute top-3 left-3 z-30 px-4 py-2 bg-black/60 hover:bg-red-900/80 rounded-full text-white font-bold border border-white/20 text-xs md:text-sm backdrop-blur-sm transition-all"
      >🏳️ انسحاب</button>

      {/* Answer flash emoji */}
      {showResult !== 'none' && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className={`text-7xl md:text-9xl font-black drop-shadow-2xl ${showResult === 'correct' ? 'text-green-400' : 'text-red-400'}`}
            style={{ animation: 'bsPop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
            {showResult === 'correct' ? '✅' : '❌'}
          </div>
        </div>
      )}

      {/* ════ VICTORY OVERLAY ════════════════════════════════════════════════ */}
      {gameResult === 'victory' && (
        <EpicModal
          type="victory"
          monsterName={monster.name}
          correct={correctAnswers}
          wrong={wrongAnswers}
          damageDealt={damageDealt}
          damageReceived={damageReceived}
          onAction={onVictory}
        />
      )}

      {/* ════ DEFEAT OVERLAY ════════════════════════════════════════════════ */}
      {gameResult === 'defeat' && (
        <EpicModal
          type="defeat"
          monsterName={monster.name}
          correct={correctAnswers}
          wrong={wrongAnswers}
          damageDealt={damageDealt}
          damageReceived={damageReceived}
          onAction={onDefeat}
        />
      )}

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
          15% { transform:translate(-7px,3px) rotate(-0.5deg); }
          30% { transform:translate(7px,-3px) rotate(0.5deg); }
          45% { transform:translate(-5px,4px) rotate(-0.3deg); }
          60% { transform:translate(5px,-2px) rotate(0.3deg); }
          75% { transform:translate(-3px,2px); }
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
          0%   { left: -8%; }
          100% { left: 108%; }
        }
        @keyframes bsModalIn {
          0%   { opacity:0; transform: scale(0.88) translateY(24px); }
          60%  { opacity:1; transform: scale(1.03) translateY(-4px); }
          100% { opacity:1; transform: scale(1)    translateY(0); }
        }
        @keyframes bsParticle {
          0%   { opacity:1; transform: translateY(0) scale(1); }
          100% { opacity:0; transform: translateY(-60px) scale(0.3); }
        }
        @keyframes bsGlowPulse {
          0%,100% { opacity:0.6; }
          50%     { opacity:1; }
        }
        @keyframes bsStarsFloat {
          0%,100% { transform: translateY(0) rotate(0deg); opacity:0.7; }
          50%     { transform: translateY(-10px) rotate(180deg); opacity:1; }
        }
      `}</style>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Epic full-screen Victory / Defeat overlay
// ─────────────────────────────────────────────────────────────────────────────
interface EpicModalProps {
  type:           'victory' | 'defeat';
  monsterName:    string;
  correct:        number;
  wrong:          number;
  damageDealt:    number;
  damageReceived: number;
  onAction:       () => void;
}

const EpicModal = ({ type, monsterName, correct, wrong, damageDealt, damageReceived, onAction }: EpicModalProps) => {
  const isVictory = type === 'victory';
  const accent    = isVictory ? '#eab308' : '#ef4444';
  const accentRgb = isVictory ? '234,179,8' : '239,68,68';
  const accuracy  = correct + wrong > 0 ? Math.round((correct / (correct + wrong)) * 100) : 0;

  const particles = isVictory
    ? ['⭐','✨','🌟','💫','⭐','✨','🏆','⭐']
    : ['💀','🩸','☠️','💀','🩸','☠️','💀','🩸'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      style={{ background: `radial-gradient(ellipse at center, rgba(${accentRgb},0.18) 0%, rgba(0,0,0,0.94) 70%)` }}>

      {/* Backdrop blur */}
      <div className="absolute inset-0 backdrop-blur-xl" />

      {/* Floating particles */}
      {particles.map((p, i) => (
        <span key={i}
          className="absolute text-2xl pointer-events-none select-none"
          style={{
            left:      `${8 + (i * 12.5)}%`,
            bottom:    `${15 + (i % 3) * 12}%`,
            animation: `bsParticle ${1.8 + (i * 0.25)}s ${i * 0.15}s ease-out infinite`,
            opacity:   0,
          }}>
          {p}
        </span>
      ))}

      {/* Ambient glow orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-96 h-96 rounded-full blur-3xl -top-20 -left-20"
          style={{ background: `rgba(${accentRgb},0.12)`, animation: 'bsGlowPulse 3s ease-in-out infinite' }} />
        <div className="absolute w-96 h-96 rounded-full blur-3xl -bottom-20 -right-20"
          style={{ background: `rgba(${accentRgb},0.10)`, animation: 'bsGlowPulse 3.5s 0.5s ease-in-out infinite' }} />
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-lg mx-4 rounded-3xl border overflow-hidden"
        style={{
          borderColor: `rgba(${accentRgb},0.35)`,
          background:  `linear-gradient(145deg, rgba(${accentRgb},0.12) 0%, rgba(0,0,0,0.96) 60%, rgba(${accentRgb},0.06) 100%)`,
          boxShadow:   `0 0 100px rgba(${accentRgb},0.35), 0 0 200px rgba(${accentRgb},0.12), 0 40px 80px rgba(0,0,0,0.8)`,
          animation:   'bsModalIn 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards',
        }}>

        {/* Top glow line */}
        <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />

        <div className="p-8 text-center">
          {/* Big emoji */}
          <div className="text-7xl mb-2" style={{ animation: 'bsStarsFloat 3s ease-in-out infinite' }}>
            {isVictory ? '🏆' : '💀'}
          </div>

          {/* Title */}
          <h2 className="text-4xl md:text-5xl font-black mb-1 tracking-tight"
            style={{ color: accent, textShadow: `0 0 40px rgba(${accentRgb},1), 0 0 80px rgba(${accentRgb},0.6)` }}>
            {isVictory ? 'انتصار!' : 'هُزِمت!'}
          </h2>

          {/* Sub */}
          <p className="text-white/50 mb-6 text-sm" dir="rtl">
            {isVictory ? `لقد أسقطت ${monsterName}!` : `${monsterName} كان أقوى هذه المرة…`}
          </p>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <StatCard label="إجابات صحيحة" value={correct}          color="#4ade80" icon="✅" />
            <StatCard label="إجابات خاطئة"  value={wrong}            color="#f87171" icon="❌" />
            <StatCard label="ضرر ألحقته"    value={`${damageDealt}%`}   color={accent}   icon="⚔️" />
            <StatCard label="ضرر تلقيته"    value={`${damageReceived}%`} color="#f97316" icon="🛡️" />
          </div>

          {/* Accuracy bar */}
          <div className="mb-6 p-3 rounded-2xl border border-white/10 bg-white/5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white/50 text-xs" dir="rtl">الدقة</span>
              <span className="font-black text-sm" style={{ color: accuracy >= 70 ? '#4ade80' : accuracy >= 40 ? '#f59e0b' : '#f87171' }}>
                {accuracy}%
              </span>
            </div>
            <div className="h-2 bg-black/60 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{
                  width: `${accuracy}%`,
                  background: accuracy >= 70 ? 'linear-gradient(90deg,#16a34a,#4ade80)' : accuracy >= 40 ? 'linear-gradient(90deg,#92400e,#f59e0b)' : 'linear-gradient(90deg,#7f1d1d,#f87171)',
                  boxShadow: `0 0 10px ${accuracy >= 70 ? '#4ade80' : accuracy >= 40 ? '#f59e0b' : '#f87171'}`,
                }} />
            </div>
          </div>

          {/* Action button */}
          <button onClick={onAction}
            className="w-full py-4 rounded-2xl font-black text-lg tracking-wide active:scale-95 transition-all duration-150 relative overflow-hidden group"
            style={{
              background: isVictory
                ? 'linear-gradient(135deg,#92400e,#ca8a04,#eab308,#fde047)'
                : 'linear-gradient(135deg,#7f1d1d,#b91c1c,#ef4444,#f87171)',
              boxShadow: `0 0 40px rgba(${accentRgb},0.7), 0 8px 24px rgba(0,0,0,0.5)`,
              color: isVictory ? '#000' : '#fff',
            }}>
            {/* Hover shimmer */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent)', animation: 'bsScan 1s linear infinite' }} />
            <span className="relative">{isVictory ? '🚀 متابعة المغامرة' : '↩ حاول مجدداً'}</span>
          </button>
        </div>

        {/* Bottom glow line */}
        <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, transparent, rgba(${accentRgb},0.5), transparent)` }} />
      </div>
    </div>
  );
};

const StatCard = ({ label, value, color, icon }: { label: string; value: string | number; color: string; icon: string }) => (
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
