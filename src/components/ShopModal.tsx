import { useGame } from '@/context/GameContext';
import { playSound } from '@/lib/gameState';

const ShopModal = ({ onClose }: { onClose: () => void }) => {
  const { state, currentPlayer, updatePlayer } = useGame();
  if (!currentPlayer) return null;

  const buy = (itemId: string) => {
    const item = state.shopItems.find(i => i.id === itemId);
    if (!item || currentPlayer.gold < item.price) { playSound('wrong'); return; }
    playSound('correct');
    if (itemId === 'heal') {
      updatePlayer({ ...currentPlayer, gold: currentPlayer.gold - item.price, hp: currentPlayer.maxHp });
    } else {
      updatePlayer({ ...currentPlayer, gold: currentPlayer.gold - item.price });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md animate-scale-in" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-foreground mb-2">🏪 المتجر</h2>
        <p className="text-sm text-accent mb-4">رصيدك: 🪙 {currentPlayer.gold}</p>
        <div className="space-y-3">
          {state.shopItems.map(item => (
            <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{item.emoji}</span>
                <div>
                  <p className="font-bold text-foreground text-sm">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </div>
              <button
                onClick={() => buy(item.id)}
                disabled={currentPlayer.gold < item.price}
                className="px-4 py-2 rounded-lg bg-accent text-accent-foreground font-bold text-sm disabled:opacity-40 hover:scale-105 transition-all"
              >
                🪙 {item.price}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ShopModal;
