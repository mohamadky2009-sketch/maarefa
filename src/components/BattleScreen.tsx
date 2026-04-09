import { useState, useEffect, useMemo, useCallback } from 'react';
import { CHARACTERS, ISLANDS, playSound, Question } from '@/lib/gameState';
import { useGame } from '@/context/GameContext';

// الصور الأساسية
import heroIdle from '@/assets/combat/martial-hero-idle.png';
import heroAttack from '@/assets/combat/martial-hero-attack.png';
import wizardIdle from '@/assets/combat/evil-wizard-idle.png';
import wizardAttack from '@/assets/combat/evil-wizard-attack.png';

const BattleScreen = ({ planetId, islandId, onBack, onVictory }: { planetId: number, islandId: number, onBack: () => void, onVictory: () => void }) => {
  const { state, currentPlayer, updatePlayer } = useGame();
  const islandName = ISLANDS[islandId]?.name || 'جزيرة';

  const questions = useMemo(() => {
    const qs = state.questions.filter(q => q.planetId === planetId && q.islandId === islandId);
    return qs.length > 0 ? qs : state.questions.filter(q => q.planetId === planetId).slice(0, 5);
  }, [state.questions, planetId, islandId]);

  const questionsNeeded = state.battleSettings.questionsPerGuard[String(islandId)] || 3;
  const guardMaxHp = questionsNeeded * state.battleSettings.playerAttack;

  const [qIndex, setQIndex] = useState(0);
  const [guardHp, setGuardHp] = useState(guardMaxHp);
  const [playerHp, setPlayerHp] = useState(currentPlayer?.hp ?? 100);
  const [playerAction, setPlayerAction] = useState<'idle' | 'attack'>('idle');
  const [guardAction, setGuardAction] = useState<'idle' | 'attack'>('idle');
  const [playerPos, setPlayerPos] = useState(0);
  const [guardPos, setGuardPos] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const currentQ: Question | null = questions[qIndex % questions.length] || null;

  const handleAnswer = useCallback((idx: number) => {
    if (!currentPlayer || !currentQ || feedback) return;

    if (idx === currentQ.correctIndex) {
      playSound('correct');
      setFeedback('correct');
      setPlayerPos(180); // اندفاع
      
      setTimeout(() => {
        setPlayerAction('attack');
        const newGuardHp = Math.max(0, guardHp - state.battleSettings.playerAttack);
        setGuardHp(newGuardHp);
        
        if (newGuardHp <= 0) {
          setTimeout(() => { playSound('victory'); onVictory(); }, 800);
        }
      }, 300);

      setTimeout(() => {
        setPlayerAction('idle');
        setPlayerPos(0);
        if (guardHp > state.battleSettings.playerAttack) {
          setFeedback(null);
          setQIndex(q => q + 1);
        }
      }, 1000);

      updatePlayer({ ...currentPlayer, gold: currentPlayer.gold + 10, xp: currentPlayer.xp + 15 });
    } else {
      playSound('wrong');
      setFeedback('wrong');
      setGuardPos(-180); // اندفاع الوحش
      
      setTimeout(() => {
        setGuardAction('attack');
        const newPlayerHp = Math.max(0, playerHp - state.battleSettings.guardAttack);
        setPlayerHp(newPlayerHp);
        
        if (newPlayerHp <= 0) {
          setTimeout(() => { playSound('death'); onBack(); }, 800);
        }
      }, 300);

      setTimeout(() => {
        setGuardAction('idle');
        setGuardPos(0);
        if (playerHp > state.battleSettings.guardAttack) {
          setFeedback(null);
          setQIndex(q => q + 1);
        }
      }, 1000);
    }
  }, [currentPlayer, currentQ, feedback, guardHp, playerHp, state.battleSettings, updatePlayer, onVictory, onBack]);

  if (!currentPlayer || !currentQ) return null;

  return (
    <div className="min-h-screen relative flex flex-col z-10 overflow-hidden bg-[#0a0a1a]">
      <style>{`
        @keyframes play-sprite { from { background-position: 0px; } to { background-position: -1024px; } }
        .sprite-entity {
          width: 128px; height: 128px;
          background-size: 1024px 128px;
          image-rendering: pixelated;
          transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .hero-idle { background-image: url(${heroIdle}); animation: play-sprite 0.8s steps(8) infinite; }
        .hero-attack { background-image: url(${heroAttack}); animation: play-sprite 0.6s steps(6) forwards; }
        .wizard-idle { background-image: url(${wizardIdle}); animation: play-sprite 0.8s steps(8) infinite; transform: scaleX(-1); }
        .wizard-attack { background-image: url(${wizardAttack}); animation: play-sprite 0.6s steps(8) forwards; transform: scaleX(-1); }
        
        .arena-floor {
          position: absolute; bottom: 0; left: -50%; width: 200%; height: 350px;
          background: radial-gradient(circle at 50% 100%, #1e293b 0%, transparent 80%);
          transform: perspective(600px) rotateX(45deg); z-index: -1;
          border-top: 2px solid rgba(59, 130, 246, 0.2);
        }
        .floor-lines {
          width: 100%; height: 100%;
          background-image: linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px);
          background-size: 50px 50px;
        }
      `}</style>

      {/* الخلفية */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#101025] to-[#050510]" />
        <div className="arena-floor"><div className="floor-lines" /></div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 z-10">
        <div className="relative w-full max-w-4xl h-72 flex items-end justify-between px-20">
          {/* اللاعب */}
          <div className="flex flex-col items-center" style={{ transform: `translateX(${playerPos}px)` }}>
            <div className={`sprite-entity ${playerAction === 'attack' ? 'hero-attack' : 'hero-idle'}`} />
            <div className="w-24 h-2 bg-gray-900 rounded-full border border-blue-500/30 mt-2 overflow-hidden shadow-[0_0_10px_rgba(59,130,246,0.3)]">
              <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${(playerHp/currentPlayer.maxHp)*100}%` }} />
            </div>
            <p className="text-[10px] text-blue-300 font-black mt-1 uppercase tracking-widest">{currentPlayer.name}</p>
          </div>

          <div className="text-3xl font-black text-white/5 italic select-none">BATTLE AREA</div>

          {/* الوحش */}
          <div className="flex flex-col items-center" style={{ transform: `translateX(${guardPos}px)` }}>
            <div className={`sprite-entity ${guardAction === 'attack' ? 'wizard-attack' : 'wizard-idle'} ${feedback === 'correct' ? 'animate-pulse' : ''}`} />
            <div className="w-24 h-2 bg-gray-900 rounded-full border border-red-500/30 mt-2 overflow-hidden shadow-[0_0_10px_rgba(239,68,68,0.3)]">
              <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${(guardHp/guardMaxHp)*100}%` }} />
            </div>
            <p className="text-[10px] text-red-400 font-black mt-1 uppercase tracking-widest">حارس الجزيرة</p>
          </div>
        </div>

        {/* صندوق الأسئلة */}
        <div className="w-full max-w-xl bg-black/40 backdrop-blur-3xl border border-white/5 rounded-[3rem] p-10 shadow-2xl mt-8">
          <h2 className="text-2xl font-bold text-white text-center mb-8 drop-shadow-md">{currentQ.text}</h2>
          <div className="grid grid-cols-1 gap-4">
            {currentQ.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={!!feedback}
                className={`py-4 px-8 rounded-2xl border-2 font-bold text-lg transition-all duration-300 transform active:scale-95 ${
                  feedback && i === currentQ.correctIndex ? 'border-green-500 bg-green-500/20 text-white shadow-[0_0_20px_rgba(34,197,94,0.3)]' :
                  feedback === 'wrong' ? 'border-red-500/20 opacity-40' :
                  'border-white/5 bg-white/5 text-gray-300 hover:bg-blue-500/10 hover:border-blue-500/50 hover:text-white'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BattleScreen;
