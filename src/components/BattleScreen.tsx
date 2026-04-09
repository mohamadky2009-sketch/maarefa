import { useState, useEffect, useMemo, useCallback } from 'react';
import { CHARACTERS, ISLANDS, playSound, Question } from '@/lib/gameState';
import { useGame } from '@/context/GameContext';

// تبديل الصور: الساحر صار هو البطل والمقاتل صار هو الوحش
import playerIdle from '@/assets/combat/evil-wizard-idle.png';
import playerAttack from '@/assets/combat/evil-wizard-attack.png';
import monsterIdle from '@/assets/combat/martial-hero-idle.png';
import monsterAttack from '@/assets/combat/martial-hero-attack.png';

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
      setPlayerPos(250); 
      
      setTimeout(() => {
        setPlayerAction('attack');
        setGuardHp(prev => Math.max(0, prev - state.battleSettings.playerAttack));
      }, 300);

      setTimeout(() => {
        setPlayerAction('idle');
        setPlayerPos(0);
        if (guardHp > state.battleSettings.playerAttack) {
          setFeedback(null);
          setQIndex(q => q + 1);
        } else {
          setTimeout(() => { playSound('victory'); onVictory(); }, 500);
        }
      }, 1000);

      updatePlayer({ ...currentPlayer, gold: currentPlayer.gold + 10, xp: currentPlayer.xp + 15 });
    } else {
      playSound('wrong');
      setFeedback('wrong');
      setGuardPos(-250); 
      
      setTimeout(() => {
        setGuardAction('attack');
        setPlayerHp(prev => Math.max(0, prev - state.battleSettings.guardAttack));
      }, 300);

      setTimeout(() => {
        setGuardAction('idle');
        setGuardPos(0);
        if (playerHp > state.battleSettings.guardAttack) {
          setFeedback(null);
          setQIndex(q => q + 1);
        } else {
          setTimeout(() => { playSound('death'); onBack(); }, 500);
        }
      }, 1000);
    }
  }, [currentPlayer, currentQ, feedback, guardHp, playerHp, state.battleSettings, updatePlayer, onVictory, onBack]);

  if (!currentPlayer || !currentQ) return null;

  return (
    <div className="min-h-screen relative flex flex-col z-10 overflow-hidden bg-[#050510]">
      <style>{`
        @keyframes play-sprite { from { background-position: 0px; } to { background-position: -2048px; } }
        
        .sprite-player {
          width: 256px; height: 256px;
          background-size: 2048px 256px;
          image-rendering: pixelated;
          transition: transform 0.4s ease-out;
          /* الساحر عادةً ينظر لليسار في الملف الأصلي، لذا سنقلبه لينظر لليمين (البطولة) */
          transform: scaleX(-1); 
        }
        .player-idle { background-image: url(${playerIdle}); animation: play-sprite 0.8s steps(8) infinite; }
        .player-attack { background-image: url(${playerAttack}); animation: play-sprite 0.6s steps(8) forwards; }

        .sprite-monster {
          width: 256px; height: 256px;
          background-size: 2048px 256px;
          image-rendering: pixelated;
          transition: transform 0.4s ease-out;
          /* المقاتل ينظر لليمين، سنتركه كما هو ليرى البطل (أو نقلبه لو لزم) */
        }
        .monster-idle { background-image: url(${monsterIdle}); animation: play-sprite 0.8s steps(8) infinite; }
        .monster-attack { background-image: url(${monsterAttack}); animation: play-sprite 0.6s steps(8) forwards; }
        
        .arena-bg {
          position: absolute; inset: 0;
          background: radial-gradient(circle at 50% 80%, #1e1e3f 0%, #050510 70%);
          z-index: -1;
        }
        .floor {
          position: absolute; bottom: 0; width: 100%; height: 300px;
          background: linear-gradient(transparent, rgba(59,130,246,0.1));
          border-top: 1px solid rgba(59,130,246,0.2);
          transform: perspective(500px) rotateX(40deg);
        }
      `}</style>

      <div className="arena-bg"><div className="floor" /></div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 z-10">
        <div className="relative w-full max-w-6xl h-[450px] flex items-end justify-between px-10">
          
          {/* الساحر البطل - يسار */}
          <div className="flex flex-col items-center" style={{ transform: `translateX(${playerPos}px)` }}>
            <div className={`sprite-player ${playerAction === 'attack' ? 'player-attack' : 'player-idle'}`} />
            <div className="w-32 h-2.5 bg-gray-900 rounded-full border border-blue-500/50 mt-4 overflow-hidden">
              <div className="h-full bg-blue-500 transition-all shadow-[0_0_15px_#3b82f6]" style={{ width: `${(playerHp/currentPlayer.maxHp)*100}%` }} />
            </div>
            <p className="text-sm text-blue-300 font-black mt-2 uppercase">{currentPlayer.name}</p>
          </div>

          {/* المقاتل الوحش - يمين */}
          <div className="flex flex-col items-center" style={{ transform: `translateX(${guardPos}px)` }}>
            <div className={`sprite-monster ${guardAction === 'attack' ? 'monster-attack' : 'monster-idle'} ${feedback === 'correct' ? 'brightness-150' : ''}`} />
            <div className="w-32 h-2.5 bg-gray-900 rounded-full border border-red-500/50 mt-4 overflow-hidden">
              <div className="h-full bg-red-500 transition-all shadow-[0_0_15px_#ef4444]" style={{ width: `${(guardHp/guardMaxHp)*100}%` }} />
            </div>
            <p className="text-sm text-red-400 font-black mt-2 uppercase">حارس الجزيرة</p>
          </div>
        </div>

        {/* صندوق الأسئلة */}
        <div className="w-full max-w-2xl bg-[#0a0a1a]/90 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl mt-10">
          <h2 className="text-2xl font-bold text-white text-center mb-10 leading-relaxed">{currentQ.text}</h2>
          <div className="grid grid-cols-1 gap-4">
            {currentQ.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={!!feedback}
                className={`py-5 px-8 rounded-2xl border-2 font-bold text-xl transition-all duration-300 transform active:scale-95 ${
                  feedback && i === currentQ.correctIndex ? 'border-green-500 bg-green-500/20 text-white shadow-[0_0_20px_#22c55e]' :
                  feedback === 'wrong' ? 'border-red-500/20 opacity-40' :
                  'border-white/5 bg-white/5 text-gray-300 hover:bg-blue-500/20 hover:border-blue-500'
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
