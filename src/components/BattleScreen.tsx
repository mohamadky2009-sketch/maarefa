import { useState, useEffect, useMemo } from 'react';
import { CHARACTERS, GUARDS, ISLANDS, playSound, Question } from '@/lib/gameState';
import { useGame } from '@/context/GameContext';

interface Props {
  planetId: number;
  islandId: number;
  onBack: () => void;
  onVictory: () => void;
}

const BattleScreen = ({ planetId, islandId, onBack, onVictory }: Props) => {
  const { state, currentPlayer, updatePlayer } = useGame();
  if (!currentPlayer) return null;

  const char = CHARACTERS.find(c => c.id === currentPlayer.characterId)!;
  const guardEmoji = GUARDS[islandId % GUARDS.length];
  const islandName = ISLANDS[islandId]?.name || 'جزيرة';

  const questions = useMemo(() => {
    const qs = state.questions.filter(q => q.planetId === planetId && q.islandId === islandId);
    return qs.length > 0 ? qs : state.questions.filter(q => q.planetId === planetId).slice(0, 5);
  }, [state.questions, planetId, islandId]);

  const questionsNeeded = state.battleSettings.questionsPerGuard[String(islandId)] || 3;
  const guardMaxHp = questionsNeeded * state.battleSettings.playerAttack;
  
  const [qIndex, setQIndex] = useState(0);
  const [guardHp, setGuardHp] = useState(guardMaxHp);
  const [playerHp, setPlayerHp] = useState(currentPlayer.hp);
  const [playerAnim, setPlayerAnim] = useState('');
  const [guardAnim, setGuardAnim] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [dead, setDead] = useState(false);
  const [won, setWon] = useState(false);
  const [cracked, setCracked] = useState(false);
  const [removedOptions, setRemovedOptions] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const currentQ: Question | null = questions[qIndex % questions.length] || null;

  useEffect(() => {
    if (!currentQ?.hasTimer) { setTimeLeft(null); return; }
    setTimeLeft(30);
    const t = setInterval(() => setTimeLeft(p => {
      if (p === null || p <= 1) { clearInterval(t); handleAnswer(-1); return null; }
      return p - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [qIndex]);

  const handleAnswer = (idx: number) => {
    if (feedback || dead || won) return;
    
    if (idx === currentQ?.correctIndex) {
      // Correct
      playSound('correct');
      setFeedback('correct');
      setPlayerAnim('animate-attack-right');
      const newGuardHp = Math.max(0, guardHp - state.battleSettings.playerAttack);
      setGuardHp(newGuardHp);
      const gold = 10;
      const xp = 15;
      const updated = { ...currentPlayer, gold: currentPlayer.gold + gold, xp: currentPlayer.xp + xp };
      updatePlayer(updated);

      setTimeout(() => {
        setPlayerAnim('');
        if (newGuardHp <= 0) {
          playSound('victory');
          setWon(true);
        } else {
          setFeedback(null);
          setRemovedOptions([]);
          setQIndex(q => q + 1);
        }
      }, 800);
    } else {
      // Wrong
      playSound('wrong');
      setFeedback('wrong');
      setGuardAnim('animate-attack-left');
      const newPlayerHp = Math.max(0, playerHp - state.battleSettings.guardAttack);
      setPlayerHp(newPlayerHp);

      setTimeout(() => {
        setGuardAnim('');
        if (newPlayerHp <= 0) {
          playSound('death');
          setDead(true);
          setCracked(true);
          setTimeout(() => {
            updatePlayer({ ...currentPlayer, hp: currentPlayer.maxHp });
            onBack();
          }, 3000);
        } else {
          setFeedback(null);
          setRemovedOptions([]);
          setQIndex(q => q + 1);
        }
      }, 800);
    }
  };

  const useItem = (itemId: string) => {
    const item = state.shopItems.find(i => i.id === itemId);
    if (!item || currentPlayer.gold < item.price) { playSound('wrong'); return; }
    playSound('click');
    
    if (itemId === 'remove2' && currentQ) {
      const wrong = currentQ.options.map((_, i) => i).filter(i => i !== currentQ.correctIndex);
      const toRemove = wrong.sort(() => Math.random() - 0.5).slice(0, 2);
      setRemovedOptions(toRemove);
    } else if (itemId === 'skip') {
      setQIndex(q => q + 1);
      setRemovedOptions([]);
    } else if (itemId === 'hint' && currentQ) {
      const wrong = currentQ.options.map((_, i) => i).filter(i => i !== currentQ.correctIndex);
      setRemovedOptions([wrong[0]]);
    } else if (itemId === 'heal') {
      setPlayerHp(currentPlayer.maxHp);
    }
    updatePlayer({ ...currentPlayer, gold: currentPlayer.gold - item.price });
  };

  if (!currentQ) return (
    <div className="min-h-screen flex items-center justify-center z-10 relative">
      <div className="bg-card p-8 rounded-2xl border border-border text-center">
        <p className="text-xl font-bold text-foreground mb-4">لا توجد أسئلة لهذه الجزيرة بعد!</p>
        <button onClick={onBack} className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold">العودة</button>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen relative flex flex-col z-10 ${cracked ? 'animate-shake' : ''}`}>
      {/* Crack overlay */}
      {cracked && (
        <div className="fixed inset-0 z-50 pointer-events-none animate-crack flex items-center justify-center">
          <div className="text-9xl">{guardEmoji}</div>
          <div className="absolute inset-0" style={{
            background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,0,0,0.1) 10px, rgba(255,0,0,0.1) 20px)',
          }} />
        </div>
      )}

      {/* Victory overlay */}
      {won && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center animate-scale-in">
            <div className="text-8xl mb-4">🎉</div>
            <h2 className="text-3xl font-black text-accent mb-2">نصر!</h2>
            <p className="text-foreground mb-6">لقد هزمت حارس {islandName}!</p>
            <button onClick={onVictory} className="px-8 py-3 bg-accent text-accent-foreground rounded-xl font-bold text-lg hover:scale-105 transition-all">
              استمر →
            </button>
          </div>
        </div>
      )}

      {/* Battle area */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Combatants */}
          <div className="flex items-end justify-between mb-4 px-4">
            {/* Player */}
            <div className={`text-center ${playerAnim}`}>
              <span className="text-6xl md:text-7xl block mb-2">{char.emoji}</span>
              <p className="text-xs font-bold text-foreground mb-1">{currentPlayer.name}</p>
              <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-space-green rounded-full transition-all" style={{ width: `${(playerHp / currentPlayer.maxHp) * 100}%` }} />
              </div>
              <span className="text-xs text-muted-foreground">{playerHp}/{currentPlayer.maxHp}</span>
            </div>

            <span className="text-2xl font-black text-accent mb-8">⚔️</span>

            {/* Guard */}
            <div className={`text-center ${guardAnim}`}>
              <span className="text-6xl md:text-7xl block mb-2">{guardEmoji}</span>
              <p className="text-xs font-bold text-foreground mb-1">حارس {islandName}</p>
              <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-destructive rounded-full transition-all" style={{ width: `${(guardHp / guardMaxHp) * 100}%` }} />
              </div>
              <span className="text-xs text-muted-foreground">{guardHp}/{guardMaxHp}</span>
            </div>
          </div>

          {/* Question */}
          <div className="bg-card border border-border rounded-2xl p-5 mt-4">
            {timeLeft !== null && (
              <div className="text-center mb-3">
                <span className={`text-lg font-bold ${timeLeft <= 5 ? 'text-destructive' : 'text-accent'}`}>⏱ {timeLeft}</span>
              </div>
            )}
            <p className="text-lg font-bold text-foreground mb-4 text-center leading-relaxed">{currentQ.text}</p>
            <div className="grid grid-cols-1 gap-3">
              {currentQ.options.map((opt, i) => {
                if (removedOptions.includes(i)) return null;
                const isCorrect = feedback && i === currentQ.correctIndex;
                const isWrong = feedback === 'wrong' && i !== currentQ.correctIndex;
                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(i)}
                    disabled={!!feedback}
                    className={`p-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                      isCorrect ? 'border-space-green bg-space-green/20 text-foreground' :
                      isWrong ? 'border-border opacity-50' :
                      'border-border hover:border-primary bg-secondary/50 text-foreground hover:bg-primary/10'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {/* Items */}
            <div className="flex gap-2 mt-4 justify-center flex-wrap">
              {state.shopItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => useItem(item.id)}
                  disabled={currentPlayer.gold < item.price || !!feedback}
                  className="text-xs px-3 py-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 disabled:opacity-30 transition-all"
                  title={`${item.name} (${item.price} 🪙)`}
                >
                  {item.emoji} {item.price}
                </button>
              ))}
            </div>
          </div>

          <button onClick={onBack} className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-all block mx-auto">
            ← العودة
          </button>
        </div>
      </div>
    </div>
  );
};

export default BattleScreen;
