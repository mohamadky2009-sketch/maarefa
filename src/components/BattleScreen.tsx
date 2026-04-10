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
// Position state — controls translateX movement; 'atEnemy' keeps hero near monster during attack
type CharPos     = 'home' | 'charging' | 'atEnemy' | 'returning';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const FRAME_MS   = 110;
const CHARGE_MS  = 520;
const RETURN_MS  = 480;

// ─────────────────────────────────────────────────────────────────────────────
// Sprite configs — frame counts measured from actual PNG dimensions
// ─────────────────────────────────────────────────────────────────────────────
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
    frames: { idle: 8,  run: 8,  attack: 8,  attack2: 8,  hurt: 4, death: 5  } },
  { name: 'جالب الموت',     folder: 'monster2', type: 'individual',
    frames: { idle: 8,  run: 8,  attack: 10, attack2: 9,  hurt: 3, death: 10 } },
  { name: 'سيد الظلام',     folder: 'monster3', type: 'sheet',
    frames: { idle: 8,  run: 8,  attack: 8,  attack2: 8,  hurt: 3, death: 7  } },
  { name: 'الفارس المتمرد', folder: 'monster4', type: 'sheet',
    frames: { idle: 11, run: 8,  attack: 7,  attack2: 7,  hurt: 4, death: 11 } },
];

// ─────────────────────────────────────────────────────────────────────────────
// Path resolver (original getPath logic — file names / folders untouched)
// ─────────────────────────────────────────────────────────────────────────────
function getSpritePath(folder: string, type: string, action: ActionState, frame: number): string {
  if (type === 'individual') {
    const nameMap: Partial<Record<ActionState, string>> = {
      idle:    'Idle',
      run:     'Idle',      // monster2 has no run — reuse idle
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
// Preloader — loads ALL sprite images into browser cache before battle starts
// ─────────────────────────────────────────────────────────────────────────────
function preloadImage(src: string): Promise<void> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = img.onerror = () => resolve();
    img.src = src;
  });
}

function buildPreloadList(
  heroFolder: string,
  monster: MonsterConfig,
  bgUrl: string,
): string[] {
  const paths: string[] = [bgUrl];
  const sheetActions: ActionState[] = ['idle','run','attack','attack2','hurt','death'];

  // Hero (always sprite-sheet)
  sheetActions.forEach(a => paths.push(getSpritePath(heroFolder, 'sheet', a, 1)));

  if (monster.type === 'individual') {
    // Monster2 — preload every individual frame
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
// DynamicSprite — memoized, GPU-accelerated, correct background-position math
// ─────────────────────────────────────────────────────────────────────────────
interface SpriteProps {
  folder:  string;
  action:  ActionState;
  frames:  Record<ActionState, number>;
  isHero:  boolean;
  type:    'sheet' | 'individual';
  flipped: boolean;
}

const DynamicSprite = memo(({ folder, action, frames, isHero, type, flipped }: SpriteProps) => {
  const [frame, setFrame] = useState(1);
  const total = frames[action] ?? 1;

  useEffect(() => {
    setFrame(1);
    const id = setInterval(() => setFrame(f => (f % total) + 1), FRAME_MS);
    return () => clearInterval(id);
  }, [action, total]);

  // isHero=T flipped=F → faces right (normal)   isHero=T flipped=T → faces left (run back)
  // isHero=F flipped=F → faces left (vs hero)   isHero=F flipped=T → faces right (run back)
  const scaleX = (isHero ? flipped : !flipped) ? -1 : 1;

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
  const heroFrames= useMemo<Record<ActionState,number>>(
    () => HERO_FRAMES[heroData?.folder ?? 'hero1'] ?? HERO_FRAMES['hero1'],
    [heroData],
  );

  const bgUrl = `/src/assets/combat/monster4/islands/island${islandId + 1}.png`;

  // ── Preloading ────────────────────────────────────────────────────────────
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!heroData || !island) return;
    const urls = buildPreloadList(heroData.folder, monster, bgUrl);
    Promise.all(urls.map(preloadImage)).then(() => setReady(true));
  }, []); // run once on mount

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
  const [showResult,  setShowResult]  = useState<'none'|'correct'|'wrong'>('none');
  const [showImpact,  setShowImpact]  = useState(false);
  const [cameraZoom,  setCameraZoom]  = useState(false);
  const [screenShake, setScreenShake] = useState(false);
  const [gameResult,  setGameResult]  = useState<GameResult>('none');

  // ── Stats ─────────────────────────────────────────────────────────────────
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [wrongAnswers,   setWrongAnswers]   = useState(0);

  // ── Timer management ──────────────────────────────────────────────────────
  const timers     = useRef<ReturnType<typeof setTimeout>[]>([]);
  const gameOver   = useRef(false);
  const addTimer   = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
  }, []);
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  // ── Ghost HP ──────────────────────────────────────────────────────────────
  useEffect(() => { const t = setTimeout(() => setHeroHPGhost(heroHP),    900); return () => clearTimeout(t); }, [heroHP]);
  useEffect(() => { const t = setTimeout(() => setMonsterHPGhost(monsterHP), 900); return () => clearTimeout(t); }, [monsterHP]);

  // ── Death detection ───────────────────────────────────────────────────────
  useEffect(() => {
    if (monsterHP <= 0 && !gameOver.current) {
      gameOver.current = true;
      setMonsterAction('death');
      addTimer(() => setGameResult('victory'), monster.frames.death * FRAME_MS + 300);
    }
  }, [monsterHP]);

  useEffect(() => {
    if (heroHP <= 0 && !gameOver.current) {
      gameOver.current = true;
      setHeroAction('death');
      addTimer(() => setGameResult('defeat'), heroFrames.death * FRAME_MS + 300);
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
    setAttackVar(v => v === 'attack' ? 'attack2' : 'attack');

    setShowResult('correct');
    setCameraZoom(true);

    // 1. Run toward monster
    setHeroAction('run');
    setHeroPos('charging');
    setHeroFlipped(false);

    // 2. Arrive → play attack (hero stays at enemy position = 'atEnemy')
    addTimer(() => {
      setHeroPos('atEnemy');
      setHeroAction(variant);
    }, CHARGE_MS);

    // 3. Impact at midpoint of attack
    addTimer(() => {
      setShowImpact(true);
      setScreenShake(true);
      setMonsterAction('hurt');
      setMonsterHP(prev => Math.max(0, prev - 50));
    }, CHARGE_MS + halfAtk);

    addTimer(() => { setShowImpact(false); setScreenShake(false); }, CHARGE_MS + halfAtk + 200);
    addTimer(() => setCameraZoom(false),                            CHARGE_MS + halfAtk + 320);

    // 4. Attack done → run back (flipped)
    addTimer(() => {
      setHeroAction('run');
      setHeroFlipped(true);
      setHeroPos('returning');
    }, CHARGE_MS + atkMs);

    // 5. Home
    addTimer(() => {
      setHeroAction('idle');
      setHeroFlipped(false);
      setHeroPos('home');
      setMonsterAction('idle');
      setShowResult('none');
    }, CHARGE_MS + atkMs + RETURN_MS);
  };

  // ── Epic Monster Attack ───────────────────────────────────────────────────
  const doMonsterAttack = () => {
    const atkMs   = monster.frames.attack * FRAME_MS;
    const halfAtk = Math.floor(atkMs / 2);

    setShowResult('wrong');

    // 1. Run toward hero (monster flipped to face right)
    setMonsterAction('run');
    setMonsterFlipped(true);
    setMonsterPos('charging');

    // 2. Arrive → attack
    addTimer(() => {
      setMonsterPos('atEnemy');
      setMonsterAction('attack');
      setMonsterFlipped(true);
    }, CHARGE_MS);

    // 3. Hero takes hit
    addTimer(() => {
      setHeroAction('hurt');
      setHeroHP(prev => Math.max(0, prev - 25));
      setScreenShake(true);
    }, CHARGE_MS + halfAtk);

    addTimer(() => setScreenShake(false), CHARGE_MS + halfAtk + 200);

    // 4. Return
    addTimer(() => {
      setMonsterAction('run');
      setMonsterFlipped(false);
      setMonsterPos('returning');
    }, CHARGE_MS + atkMs);

    // 5. Home
    addTimer(() => {
      setMonsterAction('idle');
      setMonsterFlipped(false);
      setMonsterPos('home');
      setHeroAction('idle');
      setShowResult('none');
    }, CHARGE_MS + atkMs + RETURN_MS);
  };

  // ── Position → CSS ────────────────────────────────────────────────────────
  const CHARGE_DIST = 'clamp(110px, 27vw, 370px)';

  const heroTransformX  = (heroPos  === 'charging' || heroPos  === 'atEnemy')  ? `translateX(${CHARGE_DIST})`  : 'translateX(0)';
  const heroTransition  = heroPos   === 'charging'  ? `transform ${CHARGE_MS}ms ease-in-out`
                        : heroPos   === 'returning'  ? `transform ${RETURN_MS}ms ease-in-out`
                        : 'none';

  const monTransformX   = (monsterPos === 'charging' || monsterPos === 'atEnemy') ? `translateX(-${CHARGE_DIST})` : 'translateX(0)';
  const monTransition   = monsterPos === 'charging'  ? `transform ${CHARGE_MS}ms ease-in-out`
                        : monsterPos === 'returning'  ? `transform ${RETURN_MS}ms ease-in-out`
                        : 'none';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      dir="ltr"
      className="relative min-h-screen flex flex-col items-center justify-between overflow-hidden"
      style={screenShake ? { animation: 'bsShake 0.35s ease both' } : undefined}
    >
      {/* ── Background ── */}
      <div
        className="absolute inset-0 bg-center bg-cover"
        style={{
          backgroundImage: `url('${bgUrl}')`,
          animation: 'bsBgZoom 24s ease-in-out infinite alternate',
          transform: 'scale(1.12)',
        }}
      />
      <div className="absolute inset-0 bg-black/50" />

      {/* ── Cinematic vignette ── */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-500"
        style={{ boxShadow: cameraZoom ? 'inset 0 0 160px rgba(0,0,0,0.78)' : 'none' }}
      />

      {/* ════════════════════════════════════════════════════════════════════
          HP BARS
      ═════════════════════════════════════════════════════════════════════ */}
      <div className="relative z-20 w-full max-w-6xl flex items-center gap-3 p-3 md:p-5">

        {/* Hero */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-1">
            <span className="text-cyan-300 font-bold text-xs md:text-sm truncate"
              style={{ textShadow: '0 0 10px rgba(6,182,212,0.9)' }}>{currentPlayer.name}</span>
            <span className="text-cyan-400/70 font-mono text-xs ml-2 shrink-0">{heroHP}/100</span>
          </div>
          <div className="relative h-4 md:h-5 bg-black/80 rounded-full overflow-hidden border border-cyan-500/40"
            style={{ boxShadow: '0 0 12px rgba(6,182,212,0.22)' }}>
            <div className="absolute inset-y-0 left-0 rounded-full bg-white/20"
              style={{ width: `${heroHPGhost}%`, transition: 'width 900ms ease-out' }} />
            <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
              style={{ width: `${heroHP}%`,
                background: 'linear-gradient(90deg,#0e7490,#22d3ee,#a5f3fc)',
                boxShadow: '0 0 10px rgba(6,182,212,0.9),inset 0 1px 0 rgba(255,255,255,0.3)' }} />
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent rounded-full pointer-events-none" />
          </div>
        </div>

        <span className="text-white text-lg font-black shrink-0 px-1"
          style={{ textShadow: '0 0 14px rgba(255,255,255,0.6)' }}>⚔️</span>

        {/* Monster */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-1">
            <span className="text-red-400/70 font-mono text-xs mr-2 shrink-0">{monsterHP}/100</span>
            <span className="text-red-400 font-bold text-xs md:text-sm truncate"
              style={{ textShadow: '0 0 10px rgba(239,68,68,0.9)' }}>{monster.name}</span>
          </div>
          <div className="relative h-4 md:h-5 bg-black/80 rounded-full overflow-hidden border border-red-500/40"
            style={{ boxShadow: '0 0 12px rgba(239,68,68,0.22)' }}>
            <div className="absolute inset-y-0 right-0 rounded-full bg-white/20"
              style={{ width: `${monsterHPGhost}%`, transition: 'width 900ms ease-out' }} />
            <div className="absolute inset-y-0 right-0 rounded-full transition-all duration-300"
              style={{ width: `${monsterHP}%`,
                background: 'linear-gradient(270deg,#7f1d1d,#ef4444,#fca5a5)',
                boxShadow: '0 0 10px rgba(239,68,68,0.9),inset 0 1px 0 rgba(255,255,255,0.3)' }} />
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent rounded-full pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          BATTLE ARENA
      ═════════════════════════════════════════════════════════════════════ */}
      <div
        className="relative z-10 w-full max-w-7xl h-[42vh] flex items-end justify-between px-4 sm:px-10 md:px-20 pb-4 transition-transform duration-500"
        style={{
          transform: cameraZoom ? 'scale(1.06)' : 'scale(1)',
          transformOrigin: 'center bottom',
        }}
      >
        {/* Hero — left */}
        <div style={{ transform: heroTransformX, transition: heroTransition, willChange: 'transform' }}>
          <DynamicSprite
            folder={heroData.folder} action={heroAction}
            frames={heroFrames}     isHero={true}
            type="sheet"            flipped={heroFlipped}
          />
        </div>

        {/* Monster — right + impact flash */}
        <div className="relative">
          {showImpact && (
            <div className="absolute inset-0 z-20 pointer-events-none">
              <div className="absolute inset-0 rounded-xl bg-white/65" style={{ animation: 'bsFlash 0.2s ease forwards' }} />
              <span className="absolute top-[18%] left-[12%] text-3xl" style={{ animation: 'bsPop 0.3s ease forwards' }}>💥</span>
              <span className="absolute top-[40%] right-[10%] text-2xl" style={{ animation: 'bsPop 0.3s 0.05s ease both', opacity: 0 }}>⭐</span>
              <span className="absolute bottom-[28%] left-[38%] text-xl" style={{ animation: 'bsPop 0.3s 0.1s ease both', opacity: 0 }}>✨</span>
            </div>
          )}
          <div style={{ transform: monTransformX, transition: monTransition, willChange: 'transform' }}>
            <DynamicSprite
              folder={monster.folder} action={monsterAction}
              frames={monster.frames} isHero={false}
              type={monster.type}     flipped={monsterFlipped}
            />
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          QUESTION PANEL
      ═════════════════════════════════════════════════════════════════════ */}
      <div className="relative z-20 w-full max-w-5xl mx-auto px-2 pb-2">
        <div
          className="rounded-3xl p-5 md:p-9 border border-white/10 shadow-2xl"
          style={{
            background:       'linear-gradient(135deg,rgba(6,182,212,0.09),rgba(0,0,0,0.84),rgba(6,182,212,0.05))',
            backdropFilter:   'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            boxShadow:        '0 0 50px rgba(6,182,212,0.1),0 24px 60px rgba(0,0,0,0.78),inset 0 1px 0 rgba(255,255,255,0.1)',
          }}
        >
          <h3 className="text-center text-sm sm:text-base md:text-xl font-bold mb-5 text-white leading-relaxed" dir="rtl">
            {island.question.text}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {island.question.options.map((opt, i) => (
              <button key={i} onClick={() => handleAnswer(i)} disabled={isLocked} dir="rtl"
                className="group relative p-4 md:p-5 rounded-2xl text-sm md:text-base font-bold text-right border transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.10)' }}
              >
                {/* hover glow */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: 'linear-gradient(135deg,rgba(6,182,212,0.18),rgba(6,182,212,0.04))' }} />
                <div className="absolute inset-0 rounded-2xl border border-transparent group-hover:border-cyan-400/55 transition-all duration-300" />
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

      {/* Back */}
      <button onClick={onBack}
        className="absolute top-3 left-3 z-30 px-4 py-2 bg-black/60 hover:bg-red-900/80 rounded-full text-white font-bold border border-white/20 text-xs md:text-sm backdrop-blur-sm transition-all"
      >🏳️ انسحاب</button>

      {/* Answer flash */}
      {showResult !== 'none' && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className={`text-6xl md:text-9xl font-black drop-shadow-2xl ${showResult === 'correct' ? 'text-green-400' : 'text-red-400'}`}
            style={{ animation: 'bsPop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
            {showResult === 'correct' ? '✅' : '❌'}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          VICTORY MODAL
      ═════════════════════════════════════════════════════════════════════ */}
      {gameResult === 'victory' && (
        <Modal color="yellow" emoji="🏆" title="انتصار!" sub={`لقد هزمت ${monster.name}`}
          correct={correctAnswers} wrong={wrongAnswers}
          btnLabel="متابعة المغامرة ←" btnGrad="linear-gradient(135deg,#ca8a04,#eab308,#fde047)"
          btnShadow="0 0 34px rgba(234,179,8,0.6),0 4px 18px rgba(0,0,0,0.4)"
          btnColor="#000" onAction={onVictory}
        />
      )}

      {/* DEFEAT MODAL */}
      {gameResult === 'defeat' && (
        <Modal color="red" emoji="💀" title="هُزِمت!" sub={`${monster.name} كان أقوى هذه المرة`}
          correct={correctAnswers} wrong={wrongAnswers}
          btnLabel="حاول مجدداً ↩" btnGrad="linear-gradient(135deg,#7f1d1d,#ef4444,#f87171)"
          btnShadow="0 0 34px rgba(239,68,68,0.48),0 4px 18px rgba(0,0,0,0.4)"
          btnColor="#fff" onAction={onDefeat}
        />
      )}

      <style>{`
        @keyframes bsBgZoom {
          0%   { transform: scale(1.12) translate(0%,0%); }
          50%  { transform: scale(1.18) translate(0.5%,0.4%); }
          100% { transform: scale(1.12) translate(-0.5%,-0.4%); }
        }
        @keyframes bsPop {
          0%   { transform: scale(0.15) rotate(-14deg); opacity:0; }
          65%  { transform: scale(1.22) rotate(4deg);   opacity:1; }
          100% { transform: scale(1)    rotate(0deg);   opacity:1; }
        }
        @keyframes bsShake {
          0%,100% { transform:translate(0,0); }
          20%  { transform:translate(-5px,2px); }
          40%  { transform:translate(5px,-2px); }
          60%  { transform:translate(-4px,3px); }
          80%  { transform:translate(4px,-1px); }
        }
        @keyframes bsFlash {
          0%   { opacity:0.72; }
          100% { opacity:0; }
        }
      `}</style>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────────────────────────
const Err = ({ msg }: { msg: string }) => (
  <div className="min-h-screen bg-black text-white flex items-center justify-center text-xl">{msg}</div>
);

interface ModalProps {
  color: 'yellow' | 'red';
  emoji: string; title: string; sub: string;
  correct: number; wrong: number;
  btnLabel: string; btnGrad: string; btnShadow: string; btnColor: string;
  onAction: () => void;
}
const Modal = ({ color, emoji, title, sub, correct, wrong, btnLabel, btnGrad, btnShadow, btnColor, onAction }: ModalProps) => {
  const isGold = color === 'yellow';
  const accent = isGold ? 'rgba(234,179,8,' : 'rgba(239,68,68,';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/78 backdrop-blur-xl">
      <div className="relative max-w-md w-full mx-4 rounded-3xl p-8 text-center border overflow-hidden"
        style={{
          borderColor: `${accent}0.3)`,
          background:  `linear-gradient(135deg,${accent}0.14) 0%,rgba(0,0,0,0.93) 65%)`,
          boxShadow:   `0 0 80px ${accent}0.3),0 0 160px ${accent}0.08)`,
          animation:   'bsPop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards',
        }}>
        <div className="text-6xl mb-3">{emoji}</div>
        <h2 className="text-3xl font-black mb-1" style={{ color: isGold ? '#facc15' : '#f87171', textShadow: `0 0 26px ${accent}0.95)` }}>{title}</h2>
        <p className="text-white/55 mb-5 text-sm" dir="rtl">{sub}</p>
        <div className="grid grid-cols-2 gap-3 mb-5">
          <Stat label="إجابات صحيحة" value={correct} valueColor="#4ade80" />
          <Stat label="إجابات خاطئة"  value={wrong}   valueColor="#f87171" />
        </div>
        <button onClick={onAction} className="w-full py-4 rounded-2xl font-black text-lg active:scale-95 transition-all"
          style={{ background: btnGrad, boxShadow: btnShadow, color: btnColor }}>{btnLabel}</button>
      </div>
    </div>
  );
};

const Stat = ({ label, value, valueColor }: { label: string; value: number; valueColor: string }) => (
  <div className="rounded-2xl p-4 border border-white/10 bg-white/5">
    <div className="text-2xl font-black" style={{ color: valueColor }}>{value}</div>
    <div className="text-white/50 text-xs mt-1" dir="rtl">{label}</div>
  </div>
);

export default BattleScreen;
