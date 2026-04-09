import { useState, useEffect, useMemo, useCallback } from 'react';
import { CHARACTERS, ISLANDS, playSound, Question } from '@/lib/gameState';
import { useGame } from '@/context/GameContext';

// التأكد من المسارات الصحيحة كما رتبها Lovable
import heroIdle from '@/assets/combat/martial-hero-idle.png';
import heroAttack from '@/assets/combat/martial-hero-attack.png';
import wizardIdle from '@/assets/combat/evil-wizard-idle.png';
import wizardAttack from '@/assets/combat/evil-wizard-attack.png';

const BattleScreen = ({ planetId, islandId, onBack, onVictory }: { planetId: number, islandId: number, onBack: () => void, onVictory: () => void }) => {
  const { state, currentPlayer, updatePlayer } = useGame();
  const char = CHARACTERS.find(c => c.id === currentPlayer?.characterId);
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
  const [playerDash, setPlayerDash] = useState(false);
  const [guardDash, setGuardDash] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [won, setWon] = useState(false);

  const currentQ: Question | null = questions[qIndex % questions.length] || null;

  const handleAnswer = useCallback((idx: number) => {
    if (!currentPlayer || !currentQ || feedback || won) return;

    if (idx === currentQ.correctIndex) {
      playSound('correct');
      setFeedback('correct');
      
      // انيميشن الهجوم: اندفاع للمنتصف
      setPlayerDash(true);
      setTimeout(() => setPlayerAction('attack'), 300);

      const newGuardHp = Math.max(0, guardHp - state.battleSettings.playerAttack);
      setGuardHp(newGuardHp);

      setTimeout(() => {
        setPlayerAction('idle');
        setPlayerDash(false);
        if (newGuardHp <= 0) {
          playSound('victory');
          setWon(true);
        } else {
          setFeedback(null);
          setQIndex(q => q + 1);
        }
      }, 1000);

      updatePlayer({ ...currentPlayer, gold: currentPlayer.gold + 10, xp: currentPlayer.xp + 15 });
    } else {
      playSound('wrong');
      setFeedback('wrong');
      
      // الوحش يهجم ويندفع لليسار
      setGuardDash(true);
      setTimeout(() => setGuardAction('attack'), 300);

      const newPlayerHp = Math.max(0, playerHp - state.battleSettings.guardAttack);
      setPlayerHp(newPlayerHp);

      setTimeout(() => {
        setGuardAction('idle');
        setGuardDash(false);
        if (newPlayerHp <= 0) {
          playSound('death');
          onBack();
        } else {
          setFeedback(null);
          setQIndex(q => q + 1);
        }
      }, 1000);
    }
  }, [currentPlayer, currentQ, feedback, won, guardHp, playerHp, state.battleSettings, updatePlayer]);

  if (!currentPlayer || !currentQ) return null;

  return (
    <div className="min-h-screen relative flex flex-col z-10 overflow-hidden bg-[#050510]">
      
      <style>{`
        @keyframes play-sprite { from { background-position: 0px; } to { background-position: -1024px; } }
        .sprite-container {
          width: 128px; height: 128px;
          background-size: 1024px 128px; /* نفترض أن الشريط 8 فريمات وكل فريم 128 بكسل */
          image-rendering: pixelated;
          transition: all 0.4s ease-in-out;
        }
        .hero-idle { background-image: url(${heroIdle}); animation: play-sprite 0.8s steps(8) infinite; }
        .hero-attack { background-image: url(${heroAttack}); animation: play-sprite 0.5s steps(8) forwards; }
        .wizard-idle { background-image: url(${wizardIdle}); animation: play-sprite 0.8s steps(8) infinite; transform: scaleX(-1); }
        .wizard-attack { background-image: url(${wizardAttack}); animation: play-sprite 0.5s steps(8) forwards; transform: scaleX(-1); }
        
        .battle-arena {
          background: radial-gradient(circle at 50% 100%, #1e293b 0%, transparent 70%);
          perspective: 1000px;
        }
        .floor-grid {
          position: absolute; bottom: 0; width: 200%; height: 300px; left: -50%;
          background-image: linear-gradient(rgba(59,130,246,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.1) 1px, transparent 1px);
          background-size: 40px 40px;
          transform: rotateX(60deg); z-index: -1;
        }
      `}</style>

      {/* خلفية الساحة الاحترافية */}
      <div className="absolute inset-0 battle-arena">
        <div className="floor-grid" />
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-full h-20 bg-blue-500/5 blur-3xl rounded-full" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 z-10">
        
        {/* ساحة الاشتباك */}
        <div className="relative w-full max-w-4xl h-80 flex items-end justify-between px-20">
          
          {/* البطل - Martial Hero */}
          <div className="flex flex-col items-center" style={{ transform: playerDash ? 'translateX(180px)' : 'translateX(0)' }}>
             <div className={`sprite-container ${playerAction === 'idle' ? 'hero-idle' : 'hero-attack'}`} />
             <div className="w-24 h-1.5 bg-black/40 rounded-full mt-2 overflow-hidden border border-blue-500/30">
                <div className="h-full bg-blue-500 transition-all shadow-[0_0_10px_#3b82f6]" style={{ width: `${(playerHp/currentPlayer.maxHp)*100}%` }} />
             </div>
             <p className="text-[10px] text-blue-300 font-black mt-1 uppercase tracking-widest">{currentPlayer.name}</p>
          </div>

          <div className="text-2xl font-black text-white/10 italic">VS</div>

          {/* الوحش - Evil Wizard */}
          <div className="flex flex-col items-center" style={{ transform: guardDash ? 'translateX(-180px)' : 'translateX(0)' }}>
             <div className={`sprite-container ${guardAction === 'idle' ? 'wizard-idle' : 'wizard-attack'} ${feedback === 'correct' ? 'animate-pulse contrast-200' : ''}`} />
             <div className="w-24 h-1.5 bg-black/40 rounded-full mt-2 overflow-hidden border border-red-500/30">
                <div className="h-full bg-red-500 transition-all shadow-[0_0_10px_#ef4444]" style={{ width: `${(guardHp/guardMaxHp)*100}%` }} />
             </div>
             <p className="text-[10px] text-red-400 font-black mt-1 uppercase tracking-widest">حارس الجزيرة</p>
          </div>
        </div>

        {/* صندوق الأسئلة الزجاجي */}
        <div className="w-full max-w-xl bg-[#0a0a1a]/80 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-8 shadow-2xl mt-10">
          <h2 className="text-2xl font-bold text-white text-center mb-8 drop-shadow-lg">{currentQ.text}</h2>
          <div className="grid grid-cols-1 gap-4">
            {currentQ.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={!!feedback}
                className={`py-4 px-6 rounded-2xl border-2 font-bold text-lg transition-all duration-300 ${
                  feedback && i === currentQ.correctIndex ? 'border-green-500 bg-green-500/20 text-white' :
                  feedback === 'wrong' ? 'border-red-500/20 opacity-40' :
                  'border-white/5 bg-white/5 text-gray-300 hover:bg-blue-500/10 hover:border-blue-500/50'
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
