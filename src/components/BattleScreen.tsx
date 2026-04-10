import { useState, useCallback, useMemo } from 'react';
import { CHARACTERS, ISLANDS, Island, IslandQuestion, playSound } from '@/lib/gameState';
import { useGame } from '@/context/GameContext';

// ─── Sprite helpers ───────────────────────────────────────────────
const getHeroImage = (folder: string, action: 'idle' | 'attack'): string => {
  const base = `/src/assets/combat/${folder}`;
  if (folder === 'hero3') return action === 'attack' ? `${base}/Sprites/Attack1.png` : `${base}/Sprites/Idle.png`;
  if (folder === 'hero2') return action === 'attack' ? `${base}/Attack_1.png` : `${base}/Idle.png`;
  return action === 'attack' ? `${base}/Attack1.png` : `${base}/Idle.png`;
};

const getMonsterImage = (folder: string, action: 'idle' | 'attack'): string => {
  const base = `/src/assets/combat/${folder}`;
  if (folder === 'monster2') {
    return action === 'attack'
      ? `${base}/Individual Sprite/Attack/Bringer-of-Death_Attack_1.png`
      : `${base}/Individual Sprite/Idle/Bringer-of-Death_Idle_1.png`;
  }
  if (folder === 'monster1') return action === 'attack' ? `${base}/Sprites/Attack.png` : `${base}/Sprites/Idle.png`;
  return action === 'attack' ? `${base}/Sprites/Attack1.png` : `${base}/Sprites/Idle.png`;
};

// ─── Props ────────────────────────────────────────────────────────
interface Props {
  planetId: number;
  islandId: number;
  onVictory: () => void;
  onDefeat: () => void;
  onBack: () => void;
}

// ─── Main component ───────────────────────────────────────────────
const BattleScreen = ({ planetId, islandId, onVictory, onDefeat, onBack }: Props) => {
  const { state, currentPlayer, updatePlayer } = useGame();

  // Resolve the island (static or admin-added)
  const island: Island | undefined = useMemo(
    () => [...ISLANDS, ...state.customIslands].find(is => is.id === islandId),
    [islandId, state.customIslands]
  );

  // Build question pool: use admin-added questions for this island first,
  // otherwise fall back to the island's embedded default question.
  const questionPool: IslandQuestion[] = useMemo(() => {
    const adminQs = state.questions.filter(q => q.islandId === islandId);
    if (adminQs.length > 0) {
      return adminQs.map(q => ({ text: q.text, options: q.options, correctIndex: q.correctIndex }));
    }
    return island ? [island.question] : [];
  }, [state.questions, islandId, island]);

  // How many correct answers are needed to win (configurable per island)
  const totalNeeded: number = state.battleSettings.questionsPerGuard[String(islandId)] ?? 3;
  const playerAttack = state.battleSettings.playerAttack;
  const guardAttack = state.battleSettings.guardAttack;

  // ── State ────────────────────────────────────────────────────────
  const [correctCount, setCorrectCount] = useState(0);
  const [playerHp, setPlayerHp] = useState(currentPlayer?.hp ?? 100);
  const [guardHp, setGuardHp] = useState(100);
  const [qIndex, setQIndex] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [playerAction, setPlayerAction] = useState<'idle' | 'attack'>('idle');
  const [guardAction, setGuardAction] = useState<'idle' | 'attack'>('idle');
  const [playerOffset, setPlayerOffset] = useState(0);
  const [guardOffset, setGuardOffset] = useState(0);

  const currentQ = questionPool.length > 0 ? questionPool[qIndex % questionPool.length] : null;

  // ── Answer handler ───────────────────────────────────────────────
  const handleAnswer = useCallback((chosenIndex: number) => {
    if (!currentPlayer || !currentQ || feedback !== null) return;

    const correct = chosenIndex === currentQ.correctIndex;

    if (correct) {
      playSound('correct');
      setFeedback('correct');
      setPlayerOffset(220);

      setTimeout(() => {
        setPlayerAction('attack');
        const newCorrect = correctCount + 1;
        const newGuardHp = Math.max(0, guardHp - playerAttack);
        setGuardHp(newGuardHp);
        setCorrectCount(newCorrect);
        updatePlayer({ ...currentPlayer, gold: currentPlayer.gold + 10, xp: currentPlayer.xp + 15 });

        setTimeout(() => {
          setPlayerAction('idle');
          setPlayerOffset(0);

          if (newCorrect >= totalNeeded || newGuardHp <= 0) {
            setTimeout(onVictory, 400);
          } else {
            setFeedback(null);
            setQIndex(q => q + 1);
          }
        }, 700);
      }, 300);

    } else {
      playSound('wrong');
      setFeedback('wrong');
      setGuardOffset(-220);

      setTimeout(() => {
        setGuardAction('attack');
        const newHp = Math.max(0, playerHp - guardAttack);
        setPlayerHp(newHp);

        setTimeout(() => {
          setGuardAction('idle');
          setGuardOffset(0);

          if (newHp <= 0) {
            setTimeout(onDefeat, 400);
          } else {
            setFeedback(null);
            setQIndex(q => q + 1);
          }
        }, 700);
      }, 300);
    }
  }, [currentPlayer, currentQ, feedback, correctCount, guardHp, playerHp, totalNeeded, playerAttack, guardAttack, updatePlayer, onVictory, onDefeat]);

  // ── Guard ────────────────────────────────────────────────────────
  if (!currentPlayer) return null;

  if (!island || questionPool.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#050510] text-white gap-6">
        <p className="text-2xl text-yellow-400 font-bold">⚠️ لا توجد أسئلة لهذه الجزيرة بعد</p>
        <p className="text-white/60 text-sm">يمكن للأدمن إضافة أسئلة من لوحة التحكم</p>
        <button onClick={onBack} className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 font-bold transition-all">
          ← رجوع
        </button>
      </div>
    );
  }

  const heroFolder = CHARACTERS.find(c => c.id === currentPlayer.characterId)?.folder ?? 'hero1';
  const monsterFolder = island.enemyFolder;
  const guardHpPercent = Math.max(0, (guardHp / 100) * 100);
  const playerHpPercent = Math.max(0, (playerHp / currentPlayer.maxHp) * 100);

  return (
    <div className="min-h-screen relative flex flex-col z-10 overflow-hidden bg-[#050510] text-white">

      {/* Arena background */}
      <div
        className="absolute inset-0 -z-10"
        style={{ background: 'radial-gradient(circle at 50% 75%, #1a1a3f 0%, #050510 70%)' }}
      >
        <div
          className="absolute bottom-0 w-full h-60"
          style={{
            background: 'linear-gradient(transparent, rgba(59,130,246,0.08))',
            borderTop: '1px solid rgba(59,130,246,0.15)',
            transform: 'perspective(600px) rotateX(35deg)',
          }}
        />
      </div>

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 pt-4">
        <button
          onClick={onBack}
          className="text-sm text-white/50 hover:text-white transition-colors"
        >
          ← رجوع
        </button>
        <h1 className="text-lg font-black text-white/80 tracking-wide">{island.name}</h1>
        <div className="text-sm text-yellow-400 font-bold">
          {correctCount} / {totalNeeded} ✓
        </div>
      </div>

      {/* Progress bar (correct answers) */}
      <div className="mx-6 mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-yellow-500 transition-all duration-500 rounded-full shadow-[0_0_8px_#eab308]"
          style={{ width: `${(correctCount / totalNeeded) * 100}%` }}
        />
      </div>

      {/* Battle arena */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-8">
        <div className="relative w-full max-w-5xl h-72 flex items-end justify-between px-8">

          {/* Hero (left) */}
          <div
            className="flex flex-col items-center transition-all duration-300"
            style={{ transform: `translateX(${playerOffset}px)` }}
          >
            <img
              src={getHeroImage(heroFolder, playerAction)}
              alt="hero"
              className="w-40 h-40 md:w-56 md:h-56 object-contain"
              style={{ imageRendering: 'pixelated', transform: 'scaleX(-1)' }}
            />
            <div className="mt-3 w-28">
              <div className="h-2 bg-gray-800 rounded-full border border-blue-500/30 overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${playerHpPercent}%` }}
                />
              </div>
              <p className="text-xs text-blue-300 font-bold mt-1 text-center">{currentPlayer.name}</p>
            </div>
          </div>

          {/* Monster (right) */}
          <div
            className="flex flex-col items-center transition-all duration-300"
            style={{ transform: `translateX(${guardOffset}px)` }}
          >
            <img
              src={getMonsterImage(monsterFolder, guardAction)}
              alt="monster"
              className={`w-40 h-40 md:w-56 md:h-56 object-contain transition-all duration-200 ${feedback === 'correct' ? 'brightness-200 saturate-0' : ''}`}
              style={{ imageRendering: 'pixelated' }}
            />
            <div className="mt-3 w-28">
              <div className="h-2 bg-gray-800 rounded-full border border-red-500/30 overflow-hidden">
                <div
                  className="h-full bg-red-500 transition-all duration-500"
                  style={{ width: `${guardHpPercent}%` }}
                />
              </div>
              <p className="text-xs text-red-400 font-bold mt-1 text-center">حارس الجزيرة</p>
            </div>
          </div>
        </div>

        {/* Question card */}
        <div className="w-full max-w-2xl bg-[#0a0a20]/95 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">

          {/* Feedback banner */}
          {feedback === 'correct' && (
            <div className="text-center text-green-400 font-black text-xl mb-4 animate-bounce">
              ✅ إجابة صحيحة! أحسنت!
            </div>
          )}
          {feedback === 'wrong' && (
            <div className="text-center text-red-400 font-black text-xl mb-4">
              ❌ إجابة خاطئة!
            </div>
          )}

          {/* Question text */}
          <h2 className="text-xl md:text-2xl font-bold text-white text-center mb-6 leading-relaxed" dir="rtl">
            {currentQ.text}
          </h2>

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" dir="rtl">
            {currentQ.options.map((opt, i) => {
              let style = 'border-white/10 bg-white/5 text-gray-200 hover:bg-blue-500/20 hover:border-blue-500/60';
              if (feedback === 'correct' && i === currentQ.correctIndex) {
                style = 'border-green-500 bg-green-500/20 text-white shadow-[0_0_16px_rgba(34,197,94,0.4)]';
              } else if (feedback === 'wrong') {
                if (i === currentQ.correctIndex) {
                  style = 'border-green-500/60 bg-green-500/10 text-green-300';
                } else {
                  style = 'border-white/5 bg-white/3 text-white/30 opacity-40';
                }
              }

              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  disabled={feedback !== null}
                  className={`py-4 px-5 rounded-2xl border-2 font-bold text-base md:text-lg transition-all duration-200 active:scale-95 text-right ${style}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BattleScreen;
