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

interface FloatNum { id: number; value: number; target: 'hero' | 'monster'; }

// ─────────────────────────────────────────────────────────────────────────────
// Timing
// ─────────────────────────────────────────────────────────────────────────────
const FRAME_MS  = 110;
const CHARGE_MS = 480;
const RETURN_MS = 420;

// ─────────────────────────────────────────────────────────────────────────────
// ╔══════════════════════════════════════════════════════════════════════╗
// ║  SPRITE SHEET DATA  —  exact pixel dimensions from PNG headers      ║
// ║                                                                      ║
// ║  frameH   = natural height of a single frame (px)                   ║
// ║  sheetW   = natural width of the full sprite sheet per action (px)  ║
// ║  From these two we derive: frameW = sheetW / frameCount             ║
// ║                                                                      ║
// ║  FACING DIRECTION (from visual sprite analysis):                    ║
// ║   facesRight = true  → sprite image is drawn facing RIGHT           ║
// ║   facesRight = false → sprite image is drawn facing LEFT            ║
// ║                                                                      ║
// ║   hero1  (wizard)      — attacks go RIGHT  → facesRight: true       ║
// ║   hero2  (king)        — attacks go RIGHT  → facesRight: true       ║
// ║   hero3  (samurai)     — attacks go RIGHT  → facesRight: true       ║
// ║   monster1 (fire mage) — fire goes LEFT    → facesRight: false      ║
// ║   monster2 (death)     — body faces LEFT   → facesRight: false      ║
// ║   monster3 (dark lord) — runs LEFT         → facesRight: false      ║
// ║   monster4 (knight)    — attacks go RIGHT  → facesRight: true       ║
// ╚══════════════════════════════════════════════════════════════════════╝
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
    frames:  { idle: 7,  run: 10, attack: 10, attack2: 10, hurt: 5,  death: 9  },
    sheetW:  { idle: 1386, run: 1848, attack: 1848, attack2: 1848, hurt: 924, death: 1617 },
  },
  hero2: {
    facesRight: true, frameH: 155,
    frames:  { idle: 6,  run: 8,  attack: 6,  attack2: 6,  hurt: 4,  death: 11 },
    sheetW:  { idle: 930, run: 1240, attack: 930, attack2: 930, hurt: 620, death: 1705 },
  },
  hero3: {
    facesRight: true, frameH: 200,
    frames:  { idle: 8,  run: 8,  attack: 6,  attack2: 6,  hurt: 4,  death: 6  },
    sheetW:  { idle: 1600, run: 1600, attack: 1200, attack2: 1200, hurt: 800, death: 1200 },
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

// Monster2 uses individual files (140×93 each), so sheetW is not used the same way
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
// Path resolver — UNTOUCHED (DO NOT MODIFY)
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
  const all: ActionState[] = ['idle','run','attack','attack2','hurt','death'];
  all.forEach(a => paths.push(getSpritePath(heroFolder, 'sheet', a, 1)));
  if (monster.type === 'individual') {
    const sets: [string,number][] = [['Idle',6],['Attack',10],['Cast',9],['Hurt',3],['Death',10]];
    sets.forEach(([n,c]) => { for (let i=1;i<=c;i++) paths.push(`/src/assets/combat/monster2/Individual Sprite/${n}/Bringer-of-Death_${n}_${i}.png`); });
  } else {
    all.forEach(a => paths.push(getSpritePath(monster.folder, 'sheet', a, 1)));
  }
  return paths;
}

// ─────────────────────────────────────────────────────────────────────────────
// DynamicSprite  —  PIXEL-PERFECT sprite sheet rendering
//
//  Scale formula: scale = DISPLAY_H / frameH
//  bgW  = sheetW * scale  (total background image width in px)
//  bgH  = frameH * scale  = DISPLAY_H
//  bgX  = -(frame-1) * frameW * scale  (pixel offset, exact, no percentage rounding)
//
//  Flip formula: scaleX = (isHero === (facesRight !== flipped)) ? 1 : -1
//    • Hero on LEFT  must appear facing RIGHT (+X toward monster)
//    • Monster on RIGHT must appear facing LEFT  (-X toward hero)
//    • facesRight = the sprite image's NATURAL facing direction
// ─────────────────────────────────────────────────────────────────────────────
const DISPLAY_H = 256; // logical display height in px (scaled up by CSS for larger screens)

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

  // scaleX: +1 = sprite shown as-is, -1 = horizontally mirrored
  // Heroes must face RIGHT in arena; Monsters must face LEFT.
  const scaleX = (isHero === (facesRight !== flipped)) ? 1 : -1;

  const hurtFilter = isHurt ? 'brightness(10) saturate(0)' : 'none';

  // ── Individual sprite (monster2) ──────────────────────────────────────────
  if (type === 'individual') {
    const src = getSpritePath(folder, type, action, frame);
    const scale = DISPLAY_H / MONSTER2_FRAME_H;
    const dW = MONSTER2_FRAME_W * scale;
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
        willChange:         'filter',
      }} />
    );
  }

  // ── Sprite sheet (all others) — PIXEL-PERFECT ─────────────────────────────
  const src    = getSpritePath(folder, type, action, frame);
  const scale  = DISPLAY_H / frameH;
  const frameW = sheetW / frameCount;              // exact frame width (px, original)
  const dFrameW = frameW * scale;                  // displayed frame width (px)
  const dSheetW = sheetW * scale;                  // displayed full sheet width (px)
  const bgX     = -((frame - 1) * dFrameW);        // pixel offset — no percentage rounding errors

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
      willChange:         'background-position, filter',
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
    () => HERO_CONFIGS[heroData?.folder ?? 'hero1'] ?? HERO_CONFIGS['hero1'], [heroData],
  );
  const bgUrl = `/src/assets/combat/monster4/islands/island${islandId + 1}.png`;

  // ── Preloading ─────────────────────────────────────────────────────────────
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!heroData || !island) return;
    Promise.all(buildPreloadList(heroData.folder, monster, bgUrl).map(preloadImage))
      .then(() => setReady(true));
  }, []);

  // ── HP ─────────────────────────────────────────────────────────────────────
  const [heroHP,         setHeroHP]         = useState(100);
  const [monsterHP,      setMonsterHP]      = useState(100);
  const [heroHPGhost,    setHeroHPGhost]    = useState(100);
  const [monsterHPGhost, setMonsterHPGhost] = useState(100);

  // ── Animation state ────────────────────────────────────────────────────────
  const [heroAction,    setHeroAction]    = useState<ActionState>('idle');
  const [monsterAction, setMonsterAction] = useState<ActionState>('idle');
  const [heroPos,       setHeroPos]       = useState<CharPos>('home');
  const [monsterPos,    setMonsterPos]    = useState<CharPos>('home');
  const [heroFlipped,   setHeroFlipped]   = useState(false);
  const [monsterFlipped,setMonsterFlipped]= useState(false);
  const [attackVar,     setAttackVar]     = useState<'attack'|'attack2'>('attack');
  const [heroHurt,      setHeroHurt]      = useState(false);
  const [monsterHurt,   setMonsterHurt]   = useState(false);

  // ── VFX ────────────────────────────────────────────────────────────────────
  const [showResult,    setShowResult]    = useState<'none'|'correct'|'wrong'>('none');
  const [showImpact,    setShowImpact]    = useState(false);
  const [showWhiteFlash,setShowWhiteFlash]= useState(false);
  const [cameraZoom,    setCameraZoom]    = useState(false);
  const [screenShake,   setScreenShake]  = useState(false);
  const [gameResult,    setGameResult]   = useState<GameResult>('none');

  // ── Floating damage numbers ────────────────────────────────────────────────
  const [floatNums, setFloatNums] = useState<FloatNum[]>([]);
  const floatId = useRef(0);
  const spawnFloat = useCallback((value: number, target: 'hero'|'monster') => {
    const id = ++floatId.current;
    setFloatNums(prev => [...prev, { id, value, target }]);
    setTimeout(() => setFloatNums(prev => prev.filter(f => f.id !== id)), 1200);
  }, []);

  // ── Combo ──────────────────────────────────────────────────────────────────
  const [combo, setCombo] = useState(0);
  const [showCombo, setShowCombo] = useState(false);
  const comboTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [wrongAnswers,   setWrongAnswers]   = useState(0);
  const [damageDealt,    setDamageDealt]    = useState(0);
  const [damageReceived, setDamageReceived] = useState(0);

  // ── Timer management ───────────────────────────────────────────────────────
  const timers   = useRef<ReturnType<typeof setTimeout>[]>([]);
  const gameOver = useRef(false);
  const addTimer = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
  }, []);
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  // ── Ghost HP ───────────────────────────────────────────────────────────────
  useEffect(() => { const t = setTimeout(() => setHeroHPGhost(heroHP),      900); return () => clearTimeout(t); }, [heroHP]);
  useEffect(() => { const t = setTimeout(() => setMonsterHPGhost(monsterHP), 900); return () => clearTimeout(t); }, [monsterHP]);

  // ── Death detection ────────────────────────────────────────────────────────
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

  // ── Guards ─────────────────────────────────────────────────────────────────
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

  // ── Answer handler ─────────────────────────────────────────────────────────
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

  // ── Hero Attack ────────────────────────────────────────────────────────────
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

    addTimer(() => setShowWhiteFlash(false),                             CHARGE_MS + halfAtk + 70);
    addTimer(() => { setShowImpact(false); setScreenShake(false); },     CHARGE_MS + halfAtk + 220);
    addTimer(() => setMonsterHurt(false),                                CHARGE_MS + halfAtk + 300);
    addTimer(() => setCameraZoom(false),                                  CHARGE_MS + halfAtk + 400);

    const retreatAt = CHARGE_MS + Math.max(atkMs, halfAtk + hurtMs);
    addTimer(() => { setHeroAction('run'); setHeroFlipped(true); setHeroPos('returning'); }, retreatAt);
    addTimer(() => {
      setHeroAction('idle'); setHeroFlipped(false); setHeroPos('home');
      setMonsterAction('idle'); setShowResult('none');
    }, retreatAt + RETURN_MS);
  };

  // ── Monster Attack ─────────────────────────────────────────────────────────
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

    addTimer(() => setShowWhiteFlash(false),     CHARGE_MS + halfAtk + 70);
    addTimer(() => setScreenShake(false),         CHARGE_MS + halfAtk + 220);
    addTimer(() => setHeroHurt(false),            CHARGE_MS + halfAtk + 300);

    const retreatAt = CHARGE_MS + Math.max(atkMs, halfAtk + hurtMs);
    addTimer(() => { setMonsterAction('run'); setMonsterFlipped(true); setMonsterPos('returning'); }, retreatAt);
    addTimer(() => {
      setMonsterAction('idle'); setMonsterFlipped(false); setMonsterPos('home');
      setHeroAction('idle'); setShowResult('none');
    }, retreatAt + RETURN_MS);
  };

  // ── Position → CSS ─────────────────────────────────────────────────────────
  const CHARGE_DIST = 'clamp(110px,26vw,360px)';
  const heroTransX = (heroPos === 'charging' || heroPos === 'atEnemy') ? `translateX(${CHARGE_DIST})` : 'translateX(0)';
  const heroMoveDur = heroPos === 'charging' ? CHARGE_MS : heroPos === 'returning' ? RETURN_MS : 0;
  const monTransX  = (monsterPos === 'charging' || monsterPos === 'atEnemy') ? `translateX(-${CHARGE_DIST})` : 'translateX(0)';
  const monMoveDur = monsterPos === 'charging' ? CHARGE_MS : monsterPos === 'returning' ? RETURN_MS : 0;

  // HP colors (shift from cyan → amber → red as HP drops)
  const heroPct      = heroHP / 100;
  const monPct       = monsterHP / 100;
  const heroBarColor = heroPct > 0.5 ? '#22d3ee' : heroPct > 0.25 ? '#f59e0b' : '#ef4444';
  const monBarColor  = monPct  > 0.5 ? '#ef4444' : monPct  > 0.25 ? '#f97316' : '#fbbf24';

  const accuracy = correctAnswers + wrongAnswers > 0
    ? Math.round(correctAnswers / (correctAnswers + wrongAnswers) * 100) : 0;

  // Responsive scale factor: sprites render at DISPLAY_H=256px internally,
  // CSS scale enlarges them on bigger screens.
  // We use a clamp so they scale from 0.9× on mobile to 1.4× on desktop.
  const spriteScaleCss = 'clamp(0.9, 1.1 + 0.3*(100vw - 768px)/512, 1.4)';

  return (
    <div dir="ltr"
      className="relative min-h-screen flex flex-col items-center justify-between overflow-hidden"
      style={screenShake ? { animation: 'bsShake 0.38s ease both' } : undefined}
    >
      {/* Background */}
      <div className="absolute inset-0 bg-center bg-cover"
        style={{ backgroundImage:`url('${bgUrl}')`, animation:'bsBgZoom 24s ease-in-out infinite alternate', transform:'scale(1.12)' }} />
      <div className="absolute inset-0 bg-black/55" />

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none transition-all duration-500"
        style={{ boxShadow: cameraZoom ? 'inset 0 0 220px rgba(0,0,0,0.88)' : 'inset 0 0 90px rgba(0,0,0,0.42)' }} />

      {/* Full-screen white hit flash */}
      {showWhiteFlash && (
        <div className="fixed inset-0 z-40 pointer-events-none"
          style={{ background:'rgba(255,255,255,0.48)', animation:'bsWhiteFlash 0.1s ease forwards' }} />
      )}

      {/* ════ HP BARS ═════════════════════════════════════════════════════════ */}
      <div className="relative z-20 w-full max-w-6xl flex items-center gap-3 p-3 md:p-5">

        {/* Hero bar */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-1.5">
            <span className="font-black text-xs md:text-sm truncate"
              style={{ color:'#67e8f9', textShadow:'0 0 12px rgba(6,182,212,1)' }}>{currentPlayer.name}</span>
            <span className="font-mono text-xs tabular-nums shrink-0 ml-2" style={{ color: heroBarColor }}>
              {heroHP}<span className="text-white/30">/100</span>
            </span>
          </div>
          <div className="relative h-5 md:h-6 bg-black/90 rounded-full overflow-hidden"
            style={{
              border:`1px solid ${heroBarColor}55`,
              boxShadow:`0 0 18px ${heroBarColor}44`,
              animation: heroHP < 30 ? 'bsCritPulse 0.7s ease-in-out infinite' : 'none',
            }}>
            <div className="absolute inset-y-0 left-0 rounded-full"
              style={{ width:`${heroHPGhost}%`, background:'rgba(255,255,255,0.17)', transition:'width 900ms cubic-bezier(0.4,0,0.2,1)' }} />
            <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
              style={{
                width:`${heroHP}%`,
                background:`linear-gradient(90deg,rgba(14,116,144,.9),${heroBarColor},rgba(224,255,255,.9))`,
                boxShadow:`0 0 18px ${heroBarColor},inset 0 1px 0 rgba(255,255,255,.32)`,
              }} />
            <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
              <div className="absolute inset-y-0 w-10 bg-white/22 blur-sm" style={{ animation:'bsScan 2.5s linear infinite' }} />
            </div>
            <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-full pointer-events-none"
              style={{ background:'linear-gradient(to bottom,rgba(255,255,255,.2),transparent)' }} />
          </div>
        </div>

        <span className="text-xl font-black shrink-0 px-1 select-none"
          style={{ textShadow:'0 0 20px rgba(255,255,255,.7)' }}>⚔️</span>

        {/* Monster bar */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-1.5">
            <span className="font-mono text-xs tabular-nums shrink-0 mr-2" style={{ color: monBarColor }}>
              {monsterHP}<span className="text-white/30">/100</span>
            </span>
            <span className="font-black text-xs md:text-sm truncate"
              style={{ color:'#fca5a5', textShadow:'0 0 12px rgba(239,68,68,1)' }}>{monster.name}</span>
          </div>
          <div className="relative h-5 md:h-6 bg-black/90 rounded-full overflow-hidden"
            style={{
              border:`1px solid ${monBarColor}55`,
              boxShadow:`0 0 18px ${monBarColor}44`,
              animation: monsterHP < 30 ? 'bsCritPulse 0.7s ease-in-out infinite' : 'none',
            }}>
            <div className="absolute inset-y-0 right-0 rounded-full"
              style={{ width:`${monsterHPGhost}%`, background:'rgba(255,255,255,0.17)', transition:'width 900ms cubic-bezier(0.4,0,0.2,1)' }} />
            <div className="absolute inset-y-0 right-0 rounded-full transition-all duration-300"
              style={{
                width:`${monsterHP}%`,
                background:`linear-gradient(270deg,rgba(127,29,29,.9),${monBarColor},rgba(255,224,200,.9))`,
                boxShadow:`0 0 18px ${monBarColor},inset 0 1px 0 rgba(255,255,255,.32)`,
              }} />
            <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none" style={{ transform:'scaleX(-1)' }}>
              <div className="absolute inset-y-0 w-10 bg-white/22 blur-sm" style={{ animation:'bsScan 2.9s linear infinite' }} />
            </div>
            <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-full pointer-events-none"
              style={{ background:'linear-gradient(to bottom,rgba(255,255,255,.2),transparent)' }} />
          </div>
        </div>
      </div>

      {/* ════ BATTLE ARENA ════════════════════════════════════════════════════ */}
      <div
        className="relative z-10 w-full max-w-7xl h-[44vh] flex items-end justify-between px-4 sm:px-10 md:px-20 pb-4 transition-transform duration-500"
        style={{ transform: cameraZoom ? 'scale(1.07)' : 'scale(1)', transformOrigin:'center bottom' }}
      >
        {/* Floating damage numbers */}
        {floatNums.map(fn => (
          <div key={fn.id} className="absolute pointer-events-none z-30 font-black select-none"
            style={{
              fontSize: '1.75rem',
              left:     fn.target === 'hero' ? '15%' : '70%',
              bottom:   '58%',
              transform:'translateX(-50%)',
              color:    fn.target === 'hero' ? '#f87171' : '#fde047',
              textShadow: fn.target === 'hero' ? '0 0 16px #ef4444,0 2px 4px rgba(0,0,0,0.8)' : '0 0 16px #eab308,0 2px 4px rgba(0,0,0,0.8)',
              animation:'bsFloatDmg 1.1s ease-out forwards',
            }}>
            -{fn.value}
          </div>
        ))}

        {/* ── Hero (LEFT) ─────────────────────────────────────────────────── */}
        <div style={{
          transform: heroTransX,
          transitionProperty: 'transform',
          transitionTimingFunction: 'cubic-bezier(0.4,0,0.2,1)',
          transitionDuration: `${heroMoveDur}ms`,
          willChange: 'transform',
        }}>
          <div style={{ transform:`scale(var(--sprite-scale, 1))`, transformOrigin:'bottom center' }}>
            <DynamicSprite
              key={`hero-${heroAction}`}
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
        </div>

        {/* ── Monster (RIGHT) + impact flash ─────────────────────────────── */}
        <div className="relative">
          {showImpact && (
            <div className="absolute inset-0 z-20 pointer-events-none">
              <div className="absolute inset-0 rounded-xl bg-white/72" style={{ animation:'bsFlash 0.22s ease forwards' }} />
              <span className="absolute top-[12%] left-[4%]   text-4xl" style={{ animation:'bsPop 0.35s ease forwards' }}>💥</span>
              <span className="absolute top-[35%] right-[4%]  text-2xl" style={{ animation:'bsPop 0.35s 0.06s ease both', opacity:0 }}>⭐</span>
              <span className="absolute bottom-[22%] left-[30%] text-xl" style={{ animation:'bsPop 0.35s 0.11s ease both', opacity:0 }}>✨</span>
              <span className="absolute top-[55%] left-[15%] text-lg"  style={{ animation:'bsPop 0.3s 0.17s ease both', opacity:0 }}>⚡</span>
            </div>
          )}
          <div style={{
            transform: monTransX,
            transitionProperty: 'transform',
            transitionTimingFunction: 'cubic-bezier(0.4,0,0.2,1)',
            transitionDuration: `${monMoveDur}ms`,
            willChange: 'transform',
          }}>
            <div style={{ transform:'scale(var(--sprite-scale, 1))', transformOrigin:'bottom center' }}>
              <DynamicSprite
                key={`mon-${monsterAction}`}
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
          </div>
        </div>
      </div>

      {/* Combo display */}
      {showCombo && combo >= 2 && (
        <div className="fixed top-[18%] left-1/2 z-50 pointer-events-none text-center"
          style={{ transform:'translateX(-50%)', animation:'bsComboIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
          <div className="text-4xl font-black"
            style={{ color: combo >= 5 ? '#f59e0b':'#22d3ee', textShadow:`0 0 30px ${combo>=5?'#f59e0b':'#22d3ee'}` }}>
            {combo}× COMBO!
          </div>
          {combo >= 5 && <div className="text-base font-bold text-yellow-300 mt-1">🔥 رائع!</div>}
        </div>
      )}

      {/* ════ QUESTION PANEL ══════════════════════════════════════════════════ */}
      <div className="relative z-20 w-full max-w-5xl mx-auto px-2 pb-2">
        <div className="rounded-3xl border overflow-hidden"
          style={{
            background:'linear-gradient(135deg,rgba(6,182,212,0.08) 0%,rgba(0,0,0,0.9) 50%,rgba(6,182,212,0.04) 100%)',
            backdropFilter:'blur(32px)', WebkitBackdropFilter:'blur(32px)',
            borderColor:'rgba(6,182,212,0.22)',
            boxShadow:'0 0 60px rgba(6,182,212,0.1),0 24px 80px rgba(0,0,0,0.88),inset 0 1px 0 rgba(255,255,255,0.07)',
          }}>
          <div className="h-px" style={{ background:'linear-gradient(90deg,transparent,rgba(6,182,212,0.85),transparent)' }} />
          <div className="p-5 md:p-8">
            <h3 className="text-center text-sm sm:text-base md:text-xl font-bold mb-5 text-white leading-relaxed" dir="rtl"
              style={{ textShadow:'0 0 24px rgba(6,182,212,0.25)' }}>
              {island.question.text}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {island.question.options.map((opt, i) => (
                <button key={i} onClick={() => handleAnswer(i)} disabled={isLocked} dir="rtl"
                  className="group relative p-4 md:p-5 rounded-2xl text-sm md:text-base font-bold text-right border transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 overflow-hidden"
                  style={{ background:'rgba(255,255,255,0.04)', borderColor:'rgba(255,255,255,0.08)' }}>
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ background:'linear-gradient(135deg,rgba(6,182,212,0.16),rgba(6,182,212,0.03))' }} />
                  <div className="absolute inset-0 rounded-2xl border border-transparent group-hover:border-cyan-400/65 transition-all duration-200" />
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ boxShadow:'inset 0 0 30px rgba(6,182,212,0.18),0 0 22px rgba(6,182,212,0.14)' }} />
                  <div className="absolute left-0 top-2.5 bottom-2.5 w-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ background:'rgba(6,182,212,0.9)' }} />
                  <div className="relative flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 border border-white/10 group-hover:border-cyan-400/55 transition-all duration-200"
                      style={{ background:'rgba(255,255,255,0.06)', color:'rgba(6,182,212,0.85)' }}>
                      {i + 1}
                    </span>
                    <span className="text-white/90 group-hover:text-cyan-50 transition-colors duration-200">{opt}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="h-px" style={{ background:'linear-gradient(90deg,transparent,rgba(6,182,212,0.4),transparent)' }} />
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
          <div className="text-7xl md:text-9xl font-black drop-shadow-2xl"
            style={{ animation:'bsPop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards', color: showResult==='correct'?'#4ade80':'#f87171' }}>
            {showResult === 'correct' ? '✅' : '❌'}
          </div>
        </div>
      )}

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

      {/* CSS custom property for sprite scale + keyframes */}
      <style>{`
        :root { --sprite-scale: 1; }
        @media (min-width:  640px) { :root { --sprite-scale: 1.05; } }
        @media (min-width:  768px) { :root { --sprite-scale: 1.15; } }
        @media (min-width: 1024px) { :root { --sprite-scale: 1.35; } }
        @media (min-width: 1280px) { :root { --sprite-scale: 1.5;  } }

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
          0%,100% { transform:translate(0,0) rotate(0deg); }
          15% { transform:translate(-8px,3px)  rotate(-0.6deg); }
          30% { transform:translate(8px,-3px)  rotate(0.6deg); }
          45% { transform:translate(-5px,4px)  rotate(-0.3deg); }
          60% { transform:translate(5px,-2px)  rotate(0.3deg); }
          80% { transform:translate(-2px,1px); }
        }
        @keyframes bsFlash    { 0%{opacity:0.8;} 100%{opacity:0;} }
        @keyframes bsWhiteFlash { 0%{opacity:0.5;} 100%{opacity:0;} }
        @keyframes bsScan     { 0%{left:-8%;} 100%{left:108%;} }
        @keyframes bsCritPulse { 0%,100%{opacity:1;} 50%{opacity:0.55;} }
        @keyframes bsFloatDmg {
          0%   { transform:translateX(-50%) translateY(0)     scale(1.2); opacity:1; }
          30%  { transform:translateX(-50%) translateY(-28px)  scale(1);   opacity:1; }
          100% { transform:translateX(-50%) translateY(-85px)  scale(0.7); opacity:0; }
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
        @keyframes bsGlowPulse { 0%,100%{opacity:0.5;} 50%{opacity:1;} }
        @keyframes bsFloat     { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-8px);} }
      `}</style>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Epic Victory / Defeat overlay
// ─────────────────────────────────────────────────────────────────────────────
interface EpicModalProps {
  type: 'victory'|'defeat'; monsterName: string;
  correct: number; wrong: number;
  damageDealt: number; damageReceived: number;
  accuracy: number; onAction: () => void;
}
const EpicModal = ({ type, monsterName, correct, wrong, damageDealt, damageReceived, accuracy, onAction }: EpicModalProps) => {
  const isV = type === 'victory';
  const accent = isV ? '#eab308' : '#ef4444';
  const rgb    = isV ? '234,179,8' : '239,68,68';
  const parts  = isV ? ['⭐','✨','🌟','💫','🏆','⭐','✨','🌟'] : ['💀','🩸','☠️','💀','🩸','☠️','💀','🩸'];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      style={{ background:`radial-gradient(ellipse at center,rgba(${rgb},0.2) 0%,rgba(0,0,0,0.96) 70%)` }}>
      <div className="absolute inset-0" style={{ backdropFilter:'blur(22px)', WebkitBackdropFilter:'blur(22px)' }} />
      {parts.map((p,i) => (
        <span key={i} className="absolute text-2xl pointer-events-none select-none"
          style={{ left:`${6+i*13}%`, bottom:`${12+(i%4)*10}%`, animation:`bsParticle ${1.6+i*0.22}s ${i*0.14}s ease-out infinite`, opacity:0 }}>{p}</span>
      ))}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-96 h-96 rounded-full blur-3xl -top-24 -left-24" style={{ background:`rgba(${rgb},0.14)`, animation:'bsGlowPulse 3s ease-in-out infinite' }} />
        <div className="absolute w-96 h-96 rounded-full blur-3xl -bottom-24 -right-24" style={{ background:`rgba(${rgb},0.10)`, animation:'bsGlowPulse 3.5s 0.6s ease-in-out infinite' }} />
      </div>
      <div className="relative z-10 w-full max-w-lg mx-4 rounded-3xl border overflow-hidden"
        style={{
          borderColor:`rgba(${rgb},0.38)`,
          background:`linear-gradient(145deg,rgba(${rgb},0.13) 0%,rgba(0,0,0,0.97) 55%,rgba(${rgb},0.07) 100%)`,
          boxShadow:`0 0 100px rgba(${rgb},0.38),0 0 200px rgba(${rgb},0.12),0 40px 80px rgba(0,0,0,0.8)`,
          animation:'bsModalIn 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards',
        }}>
        <div className="h-0.5" style={{ background:`linear-gradient(90deg,transparent,${accent},transparent)` }} />
        <div className="p-8 text-center">
          <div className="text-7xl mb-3" style={{ animation:'bsFloat 2.5s ease-in-out infinite' }}>{isV?'🏆':'💀'}</div>
          <h2 className="text-4xl md:text-5xl font-black mb-1 tracking-tight"
            style={{ color:accent, textShadow:`0 0 40px rgba(${rgb},1),0 0 80px rgba(${rgb},0.5)` }}>
            {isV ? 'انتصار!' : 'هُزِمت!'}
          </h2>
          <p className="text-white/45 mb-6 text-sm" dir="rtl">
            {isV ? `أسقطت ${monsterName} في المعركة!` : `${monsterName} كان أقوى هذه المرة…`}
          </p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <StatCard label="إجابات صحيحة" value={correct}            color="#4ade80" icon="✅" />
            <StatCard label="إجابات خاطئة"  value={wrong}              color="#f87171" icon="❌" />
            <StatCard label="ضرر ألحقته"    value={`${damageDealt}%`}  color={accent}  icon="⚔️" />
            <StatCard label="ضرر تلقيته"    value={`${damageReceived}%`} color="#f97316" icon="🛡️" />
          </div>
          <div className="mb-6 p-3 rounded-2xl border border-white/8 bg-white/4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white/45 text-xs" dir="rtl">الدقة</span>
              <span className="font-black text-sm" style={{ color: accuracy>=70?'#4ade80':accuracy>=40?'#f59e0b':'#f87171' }}>{accuracy}%</span>
            </div>
            <div className="h-2.5 bg-black/60 rounded-full overflow-hidden">
              <div className="h-full rounded-full"
                style={{
                  width:`${accuracy}%`,
                  background: accuracy>=70?'linear-gradient(90deg,#166534,#4ade80)':accuracy>=40?'linear-gradient(90deg,#78350f,#f59e0b)':'linear-gradient(90deg,#7f1d1d,#f87171)',
                  boxShadow:`0 0 12px ${accuracy>=70?'#4ade80':accuracy>=40?'#f59e0b':'#f87171'}`,
                  transition:'width 1.2s cubic-bezier(0.4,0,0.2,1)',
                }} />
            </div>
          </div>
          <button onClick={onAction}
            className="w-full py-4 rounded-2xl font-black text-lg tracking-wide active:scale-95 transition-all duration-150 relative overflow-hidden group"
            style={{
              background: isV ? 'linear-gradient(135deg,#78350f,#ca8a04,#eab308,#fde047)' : 'linear-gradient(135deg,#7f1d1d,#b91c1c,#ef4444,#f87171)',
              boxShadow:`0 0 40px rgba(${rgb},0.65),0 8px 24px rgba(0,0,0,0.5)`,
              color: isV ? '#000' : '#fff',
            }}>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 overflow-hidden rounded-2xl">
              <div className="absolute inset-y-0 w-16 bg-white/25 blur-sm" style={{ animation:'bsScan 1s linear infinite' }} />
            </div>
            <span className="relative">{isV ? '🚀 متابعة المغامرة' : '↩ حاول مجدداً'}</span>
          </button>
        </div>
        <div className="h-0.5" style={{ background:`linear-gradient(90deg,transparent,rgba(${rgb},0.45),transparent)` }} />
      </div>
    </div>
  );
};

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
