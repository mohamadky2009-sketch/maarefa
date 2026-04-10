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

// ──────────────────────────────────────────────────────────────
// Sprite engine — handles both sprite sheets and individual frames
// ──────────────────────────────────────────────────────────────
const DynamicSprite = ({
  folder,
  action,
  frames,
  isHero,
  type,
  size = 'md',
}: {
  folder: string;
  action: ActionState;
  frames: Record<ActionState, number>;
  isHero: boolean;
  type: 'sheet' | 'individual';
  size?: 'sm' | 'md';
}) => {
  const [frame, setFrame] = useState(1);
  const totalFrames = frames[action] ?? 8;

  useEffect(() => {
    setFrame(1);
    const timer = setInterval(() => {
      setFrame(prev => (prev % totalFrames) + 1);
    }, 120);
    return () => clearInterval(timer);
  }, [action, totalFrames]);

  const getPath = (): string => {
    // monster2 — individual PNG files
    if (type === 'individual') {
      const map: Record<ActionState, string> = {
        idle: 'Idle', attack: 'Attack', hurt: 'Hurt', death: 'Death',
      };
      const aName = map[action] ?? 'Idle';
      return `/src/assets/combat/${folder}/Individual Sprite/${aName}/Bringer-of-Death_${aName}_${frame}.png`;
    }

    // Sprite sheets
    const sub = (folder === 'hero3' || folder.startsWith('monster')) ? 'Sprites/' : '';

    let fileName = 'Idle.png';
    if (action === 'attack') {
      if (folder === 'hero2') fileName = 'Attack_1.png';
      else if (folder === 'monster1') fileName = 'Attack.png';
      else fileName = 'Attack1.png';
    } else if (action === 'hurt') {
      if (folder === 'hero1' || folder === 'hero2') fileName = 'Hit.png';
      else if (folder === 'monster3') fileName = 'Take hit.png';
      else fileName = 'Take Hit.png';
    } else if (action === 'death') {
      fileName = 'Death.png';
    }

    return `/src/assets/combat/${folder}/${sub}${fileName}`;
  };

  const posX = totalFrames > 1 ? ((frame - 1) / (totalFrames - 1)) * 100 : 0;
  const sizeClass = size === 'sm'
    ? 'w-36 h-36 md:w-52 md:h-52'
    : 'w-44 h-44 md:w-72 md:h-72';

  return (
    <div
      className={`${sizeClass} ${!isHero ? 'scale-x-[-1]' : ''} drop-shadow-2xl`}
      style={{
        backgroundImage: `url('${getPath()}')`,
        backgroundSize: type === 'individual' ? 'contain' : `${totalFrames * 100}% 100%`,
        backgroundPosition: type === 'individual' ? 'center' : `${posX}% center`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
      }}
    />
  );
};

// ──────────────────────────────────────────────────────────────
// HP Bar
// ──────────────────────────────────────────────────────────────
const HpBar = ({ value, max = 100, color, label }: { value: number; max?: number; color: string; label: string }) => (
  <div className="flex-1 min-w-0">
    <p className="font-black mb-1 text-sm uppercase truncate" style={{ color }}>{label}</p>
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
    <p className="text-xs text-white/40 mt-0.5 text-left">{value}/{max}</p>
  </div>
);

// ──────────────────────────────────────────────────────────────
// Main BattleScreen
// ──────────────────────────────────────────────────────────────
const BattleScreen = ({ planetId, islandId, onBack, onVictory, onDefeat }: Props) => {
  const { currentPlayer, state } = useGame();

  const island = useMemo(
    () => [...ISLANDS, ...(state.customIslands ?? [])].find(is => is.id === islandId),
    [islandId, state.customIslands],
  );
  const planet  = PLANETS.find(p => p.id === planetId);
  const heroData = CHARACTERS.find(c => c.id === currentPlayer?.characterId);

  const monsterConfig = useMemo(() => {
    const configs = [
      { name: 'ساحر النار',    folder: 'monster1', frames: { idle: 8, attack: 8,  hurt: 3, death: 5  }, type: 'sheet'      as const },
      { name: 'جالب الموت',   folder: 'monster2', frames: { idle: 8, attack: 10, hurt: 3, death: 10 }, type: 'individual' as const },
      { name: 'سيد الظلام',   folder: 'monster3', frames: { idle: 8, attack: 8,  hurt: 3, death: 7  }, type: 'sheet'      as const },
      { name: 'الفارس المتمرد', folder: 'monster4', frames: { idle: 11, attack: 7, hurt: 4, death: 11 }, type: 'sheet'    as const },
    ];
    return configs[(islandId) % 4];
  }, [islandId]);

  const heroFrames = useMemo<Record<ActionState, number>>(() => {
    if (heroData?.folder === 'hero1') return { idle: 6, attack: 8, hurt: 4, death: 7 };
    if (heroData?.folder === 'hero2') return { idle: 6, attack: 6, hurt: 4, death: 11 };
    return { idle: 8, attack: 8, hurt: 4, death: 6 };
  }, [heroData]);

  const [heroHP,      setHeroHP]      = useState(100);
  const [monsterHP,   setMonsterHP]   = useState(100);
  const [heroAction,  setHeroAction]  = useState<ActionState>('idle');
  const [monsterAction, setMonsterAction] = useState<ActionState>('idle');
  const [isDashing,   setIsDashing]   = useState(false);
  const [showResult,  setShowResult]  = useState<'none' | 'correct' | 'wrong'>('none');
  const [answered,    setAnswered]    = useState(false);

  const pColor = planet?.color ?? '#1e40af';

  if (!island || !currentPlayer || !heroData) return null;

  // ── Answer logic ─────────────────────────────────────────────
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

  // ── Render ────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between p-4 overflow-hidden relative"
      style={{
        background: `
          radial-gradient(ellipse at 20% 80%, ${pColor}33 0%, transparent 50%),
          radial-gradient(ellipse at 80% 20%, ${pColor}22 0%, transparent 50%),
          linear-gradient(180deg, #05050f 0%, #0a0a1a 50%, #0d0d22 100%)
        `,
      }}
    >
      {/* Floating star particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-pulse"
            style={{
              width: Math.random() * 3 + 1,
              height: Math.random() * 3 + 1,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              background: pColor,
              opacity: Math.random() * 0.5 + 0.1,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* ── HP Bars ───────────────────────────────────────────── */}
      <div className="w-full max-w-5xl flex justify-between gap-6 bg-black/60 backdrop-blur-md p-5 rounded-3xl border border-white/10 z-10">
        <HpBar value={heroHP}    color="#22d3ee" label={currentPlayer.name} />
        <div className="flex items-center px-4">
          <span className="text-white/20 text-2xl font-black">⚔</span>
        </div>
        <HpBar value={monsterHP} color="#ef4444" label={monsterConfig.name} />
      </div>

      {/* ── Arena ─────────────────────────────────────────────── */}
      <div className="relative w-full max-w-6xl flex items-end justify-between px-6 md:px-24 py-4 z-10">
        {/* Ground line */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1 rounded-full opacity-30"
          style={{ background: `linear-gradient(90deg, transparent, ${pColor}, transparent)` }}
        />

        {/* Hero */}
        <div
          className={`transition-transform duration-[700ms] ease-in-out`}
          style={{ transform: isDashing ? 'translateX(280px)' : 'translateX(0)' }}
        >
          <DynamicSprite
            folder={heroData.folder}
            action={heroAction}
            frames={heroFrames}
            isHero={true}
            type="sheet"
          />
        </div>

        {/* Monster */}
        <div className={monsterAction === 'hurt' ? 'animate-bounce' : ''}>
          <DynamicSprite
            folder={monsterConfig.folder}
            action={monsterAction}
            frames={monsterConfig.frames}
            isHero={false}
            type={monsterConfig.type}
          />
        </div>
      </div>

      {/* ── Question panel ────────────────────────────────────── */}
      <div
        className="w-full max-w-4xl rounded-t-[40px] p-6 md:p-8 z-10 border-t-2"
        style={{
          background: 'rgba(5,5,20,0.92)',
          backdropFilter: 'blur(20px)',
          borderColor: `${pColor}55`,
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
              className="p-4 md:p-5 rounded-2xl text-base md:text-lg font-bold text-right transition-all duration-200 border relative overflow-hidden group"
              style={{
                background: 'rgba(255,255,255,0.04)',
                borderColor: `${pColor}33`,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = `${pColor}22`;
                (e.currentTarget as HTMLElement).style.borderColor = `${pColor}88`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                (e.currentTarget as HTMLElement).style.borderColor = `${pColor}33`;
              }}
            >
              <span className="opacity-40 ml-2">{i + 1}.</span> {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Retreat button */}
      <button
        onClick={onBack}
        className="absolute top-4 left-4 text-white/30 hover:text-white/70 transition-colors text-sm z-20"
      >
        🏳️ انسحاب
      </button>

      {/* Result flash */}
      {showResult !== 'none' && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div
            className={`text-8xl md:text-9xl font-black animate-bounce drop-shadow-2xl`}
            style={{ filter: showResult === 'correct' ? 'drop-shadow(0 0 30px #22c55e)' : 'drop-shadow(0 0 30px #ef4444)' }}
          >
            {showResult === 'correct' ? '✅' : '❌'}
          </div>
        </div>
      )}
    </div>
  );
};

export default BattleScreen;
