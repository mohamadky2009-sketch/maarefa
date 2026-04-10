import { useState, useEffect, useMemo } from 'react';
import { useGame } from '@/context/GameContext';
import { ISLANDS, CHARACTERS, PLANETS } from '@/lib/gameState';

interface Props {
  planetId: number;
  islandId: number;
  onBack: () => void;
  onVictory: () => void;
  onDefeat: () => void;
}

type ActionState = 'idle' | 'attack' | 'hurt' | 'death';

// ─────────────────────────────────────────────────────────────
// Monster configs — built from the REAL folder structure
// ─────────────────────────────────────────────────────────────
const MONSTER_CONFIGS = [
  {
    name: 'ساحر النار',
    folder: 'monster1',
    type: 'sheet' as const,
    sub: 'Sprites/',
    frames: { idle: 8, attack: 8, hurt: 3, death: 5 },
    fileNames: { idle: 'Idle.png', attack: 'Attack.png', hurt: 'Take Hit.png', death: 'Death.png' },
  },
  {
    name: 'جالب الموت',
    folder: 'monster2',
    type: 'individual' as const,
    sub: 'Individual Sprite/',
    frames: { idle: 8, attack: 10, hurt: 3, death: 10 },
    fileNames: { idle: 'Idle', attack: 'Attack', hurt: 'Hurt', death: 'Death' },
  },
  {
    name: 'سيد الظلام',
    folder: 'monster3',
    type: 'sheet' as const,
    sub: 'Sprites/',
    frames: { idle: 8, attack: 8, hurt: 3, death: 7 },
    // monster3 uses lowercase 'h' in 'Take hit.png' — exact filename!
    fileNames: { idle: 'Idle.png', attack: 'Attack1.png', hurt: 'Take hit.png', death: 'Death.png' },
  },
  {
    name: 'الفارس المتمرد',
    folder: 'monster4',
    type: 'sheet' as const,
    sub: 'Sprites/',
    frames: { idle: 11, attack: 7, hurt: 4, death: 11 },
    fileNames: { idle: 'Idle.png', attack: 'Attack1.png', hurt: 'Take Hit.png', death: 'Death.png' },
  },
];

// Hero sprite config — all are sprite sheets
const HERO_CONFIGS: Record<string, {
  sub: string;
  frames: Record<ActionState, number>;
  fileNames: Record<ActionState, string>;
}> = {
  hero1: {
    sub: '',
    frames: { idle: 6, attack: 8, hurt: 4, death: 7 },
    fileNames: { idle: 'Idle.png', attack: 'Attack1.png', hurt: 'Hit.png', death: 'Death.png' },
  },
  hero2: {
    sub: '',
    frames: { idle: 6, attack: 6, hurt: 4, death: 11 },
    fileNames: { idle: 'Idle.png', attack: 'Attack_1.png', hurt: 'Hit.png', death: 'Death.png' },
  },
  hero3: {
    sub: 'Sprites/',
    frames: { idle: 8, attack: 8, hurt: 4, death: 6 },
    // hero3 uses 'Take Hit.png' (capital T and H)
    fileNames: { idle: 'Idle.png', attack: 'Attack1.png', hurt: 'Take Hit.png', death: 'Death.png' },
  },
};

// ─────────────────────────────────────────────────────────────
// DynamicSprite — handles both sprite sheets and individual PNGs
// ─────────────────────────────────────────────────────────────
const DynamicSprite = ({
  folder,
  action,
  heroConfig,
  monsterConfig,
  isHero,
  size = 'md',
}: {
  folder: string;
  action: ActionState;
  heroConfig?: typeof HERO_CONFIGS[string];
  monsterConfig?: typeof MONSTER_CONFIGS[number];
  isHero: boolean;
  size?: 'sm' | 'md';
}) => {
  const [frame, setFrame] = useState(1);

  const config = isHero ? heroConfig : monsterConfig;
  const totalFrames = config?.frames[action] ?? 8;

  useEffect(() => {
    setFrame(1);
    const timer = setInterval(() => {
      setFrame(prev => (prev % totalFrames) + 1);
    }, 120);
    return () => clearInterval(timer);
  }, [action, totalFrames]);

  const getPath = (): string => {
    if (!isHero && monsterConfig?.type === 'individual') {
      // monster2: Individual Sprite / ActionFolder / Bringer-of-Death_Action_N.png
      const actionFolder = (monsterConfig.fileNames as Record<ActionState, string>)[action];
      return `/src/assets/combat/${folder}/Individual Sprite/${actionFolder}/Bringer-of-Death_${actionFolder}_${frame}.png`;
    }

    const sub = isHero ? (heroConfig?.sub ?? '') : (monsterConfig?.sub ?? 'Sprites/');
    const fileName = isHero
      ? (heroConfig?.fileNames[action] ?? 'Idle.png')
      : ((monsterConfig?.fileNames as Record<ActionState, string>)[action] ?? 'Idle.png');

    return `/src/assets/combat/${folder}/${sub}${fileName}`;
  };

  const posX = totalFrames > 1 ? ((frame - 1) / (totalFrames - 1)) * 100 : 0;
  const isIndividual = !isHero && monsterConfig?.type === 'individual';

  const sizeClass = size === 'sm'
    ? 'w-36 h-36 md:w-48 md:h-48'
    : 'w-44 h-44 md:w-72 md:h-72';

  return (
    <div
      className={`${sizeClass} ${!isHero ? 'scale-x-[-1]' : ''} drop-shadow-2xl`}
      style={{
        backgroundImage: `url('${getPath()}')`,
        backgroundSize: isIndividual ? 'contain' : `${totalFrames * 100}% 100%`,
        backgroundPosition: isIndividual ? 'center' : `${posX}% center`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
      }}
    />
  );
};

// ─────────────────────────────────────────────────────────────
// HP Bar
// ─────────────────────────────────────────────────────────────
const HpBar = ({
  value,
  max = 100,
  color,
  label,
}: {
  value: number;
  max?: number;
  color: string;
  label: string;
}) => (
  <div className="flex-1 min-w-0">
    <p className="font-black mb-1 text-sm uppercase truncate" style={{ color }}>
      {label}
    </p>
    <div className="h-4 bg-black/60 rounded-full overflow-hidden border border-white/10">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${(value / max) * 100}%`,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          boxShadow: `0 0 12px ${color}88`,
        }}
      />
    </div>
    <p className="text-xs text-white/40 mt-0.5 text-left">
      {value}/{max}
    </p>
  </div>
);

// ─────────────────────────────────────────────────────────────
// BattleScreen
// ─────────────────────────────────────────────────────────────
const BattleScreen = ({ planetId, islandId, onBack, onVictory, onDefeat }: Props) => {
  const { currentPlayer, state } = useGame();

  const island = useMemo(
    () => [...ISLANDS, ...(state.customIslands ?? [])].find(is => is.id === islandId),
    [islandId, state.customIslands],
  );
  const planet   = PLANETS.find(p => p.id === planetId);
  const heroData = CHARACTERS.find(c => c.id === currentPlayer?.characterId);

  const monsterConfig = useMemo(
    () => MONSTER_CONFIGS[islandId % 4],
    [islandId],
  );

  const heroConfig = useMemo(
    () => HERO_CONFIGS[heroData?.folder ?? 'hero1'],
    [heroData],
  );

  const [heroHP,       setHeroHP]       = useState(100);
  const [monsterHP,    setMonsterHP]    = useState(100);
  const [heroAction,   setHeroAction]   = useState<ActionState>('idle');
  const [monsterAction, setMonsterAction] = useState<ActionState>('idle');
  const [isDashing,    setIsDashing]    = useState(false);
  const [showResult,   setShowResult]   = useState<'none' | 'correct' | 'wrong'>('none');
  const [answered,     setAnswered]     = useState(false);

  const pColor = planet?.color ?? '#1e40af';
  // island images are 1-indexed: island1.png … island31.png
  const bgUrl = `/src/assets/combat/monster4/islands/island${islandId + 1}.png`;

  if (!island || !currentPlayer || !heroData) return null;

  // ── Answer handler ──────────────────────────────────────────
  const handleAnswer = (index: number) => {
    if (answered) return;
    setAnswered(true);
    const isCorrect = index === island.question.correctIndex;
    if (isCorrect) executeHeroAttack();
    else           executeMonsterAttack();
    setTimeout(() => setAnswered(false), 2600);
  };

  const executeHeroAttack = () => {
    setShowResult('correct');
    setIsDashing(true);
    setHeroAction('attack');
    setTimeout(() => {
      setMonsterAction('hurt');
      setMonsterHP(prev => Math.max(0, prev - 50));
    }, 500);
    setTimeout(() => {
      setHeroAction('idle');
      setMonsterAction('idle');
      setIsDashing(false);
      setShowResult('none');
    }, 2500);
  };

  const executeMonsterAttack = () => {
    setShowResult('wrong');
    setMonsterAction('attack');
    setTimeout(() => {
      setHeroAction('hurt');
      setHeroHP(prev => Math.max(0, prev - 25));
    }, 500);
    setTimeout(() => {
      setMonsterAction('idle');
      setHeroAction('idle');
      setShowResult('none');
    }, 2000);
  };

  useEffect(() => {
    if (monsterHP <= 0) {
      setMonsterAction('death');
      setTimeout(onVictory, 2000);
    }
    if (heroHP <= 0) {
      setHeroAction('death');
      setTimeout(onDefeat, 2000);
    }
  }, [monsterHP, heroHP]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between p-4 overflow-hidden relative"
      style={{
        backgroundImage: `url('${bgUrl}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/45 pointer-events-none" />

      {/* ── HP Bars ─────────────────────────────────────────── */}
      <div className="w-full max-w-5xl flex justify-between gap-6 bg-black/70 backdrop-blur-md p-5 rounded-3xl border border-white/10 relative z-10">
        <HpBar value={heroHP}    color="#22d3ee" label={currentPlayer.name} />
        <div className="flex items-center px-4">
          <span className="text-white/30 text-2xl font-black">⚔</span>
        </div>
        <HpBar value={monsterHP} color="#ef4444" label={monsterConfig.name} />
      </div>

      {/* ── Arena ───────────────────────────────────────────── */}
      <div className="relative w-full max-w-6xl flex items-end justify-between px-6 md:px-24 py-4 z-10">
        {/* Ground glow */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1 rounded-full opacity-40"
          style={{ background: `linear-gradient(90deg, transparent, ${pColor}, transparent)` }}
        />

        {/* Hero */}
        <div
          className="transition-transform duration-[700ms] ease-in-out"
          style={{ transform: isDashing ? 'translateX(280px)' : 'translateX(0)' }}
        >
          <DynamicSprite
            folder={heroData.folder}
            action={heroAction}
            heroConfig={heroConfig}
            isHero={true}
          />
        </div>

        {/* Monster */}
        <div className={monsterAction === 'hurt' ? 'animate-bounce' : ''}>
          <DynamicSprite
            folder={monsterConfig.folder}
            action={monsterAction}
            monsterConfig={monsterConfig}
            isHero={false}
          />
        </div>
      </div>

      {/* ── Question panel ──────────────────────────────────── */}
      <div
        className="w-full max-w-4xl rounded-t-[40px] p-6 md:p-8 z-10 border-t-2"
        style={{
          background: 'rgba(3,3,15,0.92)',
          backdropFilter: 'blur(20px)',
          borderColor: `${pColor}66`,
        }}
      >
        <h3
          className="text-center text-xl md:text-2xl font-black mb-6 text-white leading-relaxed"
          dir="rtl"
        >
          {island.question.text}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3" dir="rtl">
          {island.question.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              disabled={answered}
              className="p-4 md:p-5 rounded-2xl text-base md:text-lg font-bold text-right border transition-all duration-200 hover:scale-[1.02] active:scale-95"
              style={{
                background: 'rgba(255,255,255,0.05)',
                borderColor: `${pColor}44`,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = `${pColor}25`;
                (e.currentTarget as HTMLElement).style.borderColor = `${pColor}99`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                (e.currentTarget as HTMLElement).style.borderColor = `${pColor}44`;
              }}
            >
              <span className="opacity-40 ml-2">{i + 1}.</span> {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Retreat */}
      <button
        onClick={onBack}
        className="absolute top-4 left-4 text-white/40 hover:text-white/80 transition-colors text-sm z-20"
      >
        🏳️ انسحاب
      </button>

      {/* Result flash */}
      {showResult !== 'none' && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div
            className="text-8xl md:text-9xl font-black animate-bounce"
            style={{
              filter: showResult === 'correct'
                ? 'drop-shadow(0 0 40px #22c55e)'
                : 'drop-shadow(0 0 40px #ef4444)',
            }}
          >
            {showResult === 'correct' ? '✅' : '❌'}
          </div>
        </div>
      )}
    </div>
  );
};

export default BattleScreen;
