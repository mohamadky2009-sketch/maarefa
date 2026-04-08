import { useGame } from '@/context/GameContext';
import { CHARACTERS } from '@/lib/gameState';

const Leaderboard = ({ onClose }: { onClose: () => void }) => {
  const { state } = useGame();
  const sorted = [...state.players].filter(p => !p.banned).sort((a, b) => b.xp - a.xp || b.gold - a.gold);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md animate-scale-in max-h-[80vh] overflow-auto scrollbar-hide" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-foreground mb-4">🏆 لوحة المتصدرين</h2>
        {sorted.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">لا يوجد لاعبون بعد</p>
        ) : (
          <div className="space-y-2">
            {sorted.map((p, i) => {
              const char = CHARACTERS.find(c => c.id === p.characterId);
              return (
                <div key={p.id} className={`flex items-center gap-3 p-3 rounded-xl ${i < 3 ? 'bg-accent/10 border border-accent/30' : 'bg-secondary/30'}`}>
                  <span className="font-black text-lg text-muted-foreground w-8 text-center">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                  </span>
                  <span className="text-xl">{char?.emoji}</span>
                  <div className="flex-1">
                    <p className="font-bold text-foreground text-sm">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{char?.name}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-primary">XP {p.xp}</p>
                    <p className="text-xs text-accent">🪙 {p.gold}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
