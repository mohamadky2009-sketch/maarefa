import { useState, useEffect, useMemo, useCallback } from 'react';
import { CHARACTERS, ISLANDS, playSound, Question } from '@/lib/gameState';
import { useGame } from '@/context/GameContext';

// الصور اللي جهزناها في Assets
import heroIdle from '@/assets/combat/hero-knight-idle.png';
import heroAttack from '@/assets/combat/hero-knight-attack.png';
import wizardIdle from '@/assets/combat/evil-wizard-idle.png';
import wizardAttack from '@/assets/combat/evil-wizard-attack.png';
import goldBagsImg from '@/assets/gold-bags.png';

interface Props {
  planetId: number;
  islandId: number;
  onBack: () => void;
  onVictory: () => void;
}

const BattleScreen = ({ planetId, islandId, onBack, onVictory }: Props) => {
  const { state, currentPlayer, updatePlayer } = useGame();
  const char = CHARACTERS.find(c => c.id === currentPlayer?.characterId);
  const islandName = ISLANDS[islandId]?.name || 'جزيرة';

  const questions = useMemo(() => {
    const qs = state.questions.filter(q => q.planetId === planetId && q.islandId === islandId);
    return qs.length > 0 ? qs : state.questions.filter(q => q.planetId === planetId).slice(0, 5);
  }, [state.questions, planetId, islandId]);

  const questionsNeeded = state.battleSettings.questionsPerGuard[String(islandId)] || 3;
  const guardMaxHp = questionsNeeded * state.battleSettings.playerAttack;

  // حالات الحركة والوضعية
  const [qIndex, setQIndex] = useState(0);
  const [guardHp, setGuardHp] = useState(guardMaxHp);
  const [playerHp, setPlayerHp] = useState(currentPlayer?.hp ?? 100);
  const [playerAction, setPlayerAction] = useState<'idle' | 'attack'>('idle');
  const [guardAction, setGuardAction] = useState<'idle' | 'attack'>('idle');
  const [playerOffset, setPlayerOffset] = useState(0); // لتحريك البطل للامام
  const [guardOffset, setGuardOffset] = useState(0);  // لتحريك الوحش للامام
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [dead, setDead] = useState(false);
  const [won, setWon] = useState(false);
  const [cracked, setCracked] = useState(false);
  const [removedOptions, setRemovedOptions] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const currentQ: Question | null = questions[qIndex % questions.length] || null;

  const handleAnswer = useCallback((idx: number) => {
    if (!currentPlayer || !currentQ || feedback || dead || won) return;

    if (idx === currentQ.correctIndex) {
      playSound('correct');
      setFeedback('correct');
      
      // انيميشن الهجوم: اندفاع -> ضرب -> عودة
      setPlayerOffset(150); // يركض للمنتصف
      setTimeout(() => {
        setPlayerAction('attack');
        const newGuardHp = Math.max(0, guardHp - state.battleSettings.playerAttack);
        setGuardHp(newGuardHp);
        if (newGuardHp <= 0) { playSound('victory'); setWon(true); }
      }, 300);

      setTimeout(() => {
        setPlayerAction('idle');
        setPlayerOffset(0); // يرجع لمكانه
        setFeedback(null);
        setRemovedOptions([]);
        setQIndex(q => q + 1);
      }, 1000);

      updatePlayer({ ...currentPlayer, gold: currentPlayer.gold + 10, xp: currentPlayer.xp + 15 });
    } else {
      playSound('wrong');
      setFeedback('wrong');

      // الوحش يهجم
      setGuardOffset(-150); // الوحش يندفع لليسار
      setTimeout(() => {
        setGuardAction('attack');
        const newPlayerHp = Math.max(0, playerHp - state.battleSettings.guardAttack);
        setPlayerHp(newPlayerHp);
        if (newPlayerHp <= 0) { playSound('death'); setDead(true); setCracked(true); }
      }, 300);

      setTimeout(() => {
        setGuardAction('idle');
        setGuardOffset(0);
        setFeedback(null);
        setRemovedOptions([]);
        setQIndex(q => q + 1);
      }, 1000);
    }
  }, [currentPlayer, currentQ, feedback, dead, won, guardHp, playerHp, state.battleSettings, updatePlayer]);

  useEffect(() => {
    if (!currentQ?.hasTimer) { setTimeLeft(null); return; }
    setTimeLeft(30);
    const t = setInterval(() => setTimeLeft(p => {
      if (p === null || p <= 1) { clearInterval(t); handleAnswer(-1); return null; }
      return p - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [qIndex, currentQ?.hasTimer, handleAnswer]);

  if (!currentPlayer || !currentQ) return null;

  return (
    <div className={`min-h-screen relative flex flex-col z-10 overflow-hidden bg-[#0a0a0f] ${cracked ? 'animate-shake' : ''}`}>
      
      {/* خلفية ساحة القتال المطورة - Arena Style */}
      <div className="absolute inset-0 z-0">
         {/* سماء ليلية غامقة مع تدرج */}
         <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a2e] to-[#0a0a0f]" />
         {/* الضوء المسلط على الساحة */}
         <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[150%] h-[400px] bg-blue-500/10 blur-[120px] rounded-[100%]" />
         {/* الأرضية ثلاثية الأبعاد */}
         <div className="absolute bottom-0 left-0 w-full h-[30%] bg-[#161625] border-t-2 border-blue-500/20" 
              style={{ transform: 'perspective(500px) rotateX(40deg)', transformOrigin: 'bottom' }}>
            <div className="w-full h-full opacity-20" 
                 style={{ backgroundImage: 'linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
         </div>
      </div>

      <style>{`
        @keyframes sprite-play { from { background-position: 0%; } to { background-position: 100%; } }
        .sprite-box { width: 150px; height: 150px; background-size: auto 100%; image-rendering: pixelated; transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .hero-idle { background-image: url(${heroIdle}); animation: sprite-play 0.8s steps(8) infinite; }
        .hero-attack { background-image: url(${heroAttack}); animation: sprite-play 0.5s steps(6) forwards; }
        .wizard-idle { background-image: url(${wizardIdle}); animation: sprite-play 0.8s steps(8) infinite; transform: scaleX(-1); }
        .wizard-attack { background-image: url(${wizardAttack}); animation: sprite-play 0.5s steps(8) forwards; transform: scaleX(-1); }
        
        .hit-flash { animation: flash 0.2s ease-out; }
        @keyframes flash { 0% { filter: brightness(1); } 50% { filter: brightness(3) sepia(1) saturate(10) hue-rotate(-50deg); } 100% { filter: brightness(1); } }
      `}</style>

      <div className="flex-1 flex flex-col items-center justify-center p-4 z-10">
        
        {/* منطقة الاشتباك */}
        <div className="relative w-full max-w-4xl h-80 flex items-end justify-between px-10 mb-4">
          
          {/* البطل - يتحرك باستخدام playerOffset */}
          <div className="flex flex-col items-center" style={{ transform: `translateX(${playerOffset}px)` }}>
             <div className={`sprite-box ${playerAction === 'idle' ? 'hero-idle' : 'hero-attack'} ${feedback === 'wrong' && guardAction === 'attack' ? 'hit-flash' : ''}`} />
             <div className="w-24 h-2 bg-gray-900 rounded-full border border-white/10 mt-2 overflow-hidden">
                <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${(playerHp/currentPlayer.maxHp)*100}%` }} />
             </div>
             <p className="text-xs text-blue-300 font-bold mt-1 uppercase tracking-tighter">{currentPlayer.name}</p>
          </div>

          <div className="text-4xl opacity-20 font-black text-white italic">VS</div>

          {/* الوحش - يتحرك باستخدام guardOffset */}
          <div className="flex flex-col items-center" style={{ transform: `translateX(${guardOffset}px)` }}>
             <div className={`sprite-box ${guardAction === 'idle' ? 'wizard-idle' : 'wizard-attack'} ${feedback === 'correct' ? 'hit-flash' : ''}`} />
             <div className="w-24 h-2 bg-gray-900 rounded-full border border-white/10 mt-2 overflow-hidden">
                <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${(guardHp/guardMaxHp)*100}%` }} />
             </div>
             <p className="text-xs text-red-400 font-bold mt-1 uppercase tracking-tighter">حارس {islandName}</p>
          </div>
        </div>

        {/* صندوق الأسئلة الأنيق */}
        <div className="w-full max-w-xl bg-[#1a1a2e]/80 backdrop-blur-xl border border-blue-500/20 rounded-[2rem] p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          {timeLeft !== null && (
            <div className="flex justify-center mb-6">
              <div className="px-6 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 font-black">
                {timeLeft}s
              </div>
            </div>
          )}
          
          <h2 className="text-2xl font-bold text-white text-center mb-8 leading-relaxed drop-shadow-sm">
            {currentQ.text}
          </h2>
          
          <div className="grid grid-cols-1 gap-4">
            {currentQ.options.map((opt, i) => {
              if (removedOptions.includes(i)) return null;
              const isCorrect = feedback && i === currentQ.correctIndex;
              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  disabled={!!feedback}
                  className={`py-4 px-6 rounded-2xl border-2 font-bold text-lg transition-all duration-300 transform active:scale-95 ${
                    isCorrect ? 'border-green-500 bg-green-500/20 text-white shadow-[0_0_20px_rgba(34,197,94,0.3)]' :
                    feedback === 'wrong' ? 'border-red-500/30 opacity-40' :
                    'border-white/5 bg-white/5 text-gray-300 hover:bg-blue-500/10 hover:border-blue-500/50 hover:text-white'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>

        <button onClick={onBack} className="mt-8 text-gray-500 hover:text-white transition-all text-xs font-bold uppercase tracking-widest">
          ← الانسحاب من الساحة
        </button>
      </div>

      {/* تأثير الفوز */}
      {won && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="text-center">
            <h2 className="text-6xl font-black text-blue-500 mb-4 animate-bounce">نصر ساحق!</h2>
            <button onClick={onVictory} className="px-10 py-4 bg-blue-600 text-white rounded-full font-black text-xl hover:bg-blue-500 transition-all shadow-[0_0_30px_rgba(37,99,235,0.5)]">
              استلم الجائزة →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BattleScreen;
