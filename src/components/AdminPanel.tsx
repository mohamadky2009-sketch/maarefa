import { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { PLANETS, ISLANDS, CHARACTERS, playSound, Question } from '@/lib/gameState';

const AdminPanel = ({ onBack }: { onBack: () => void }) => {
  const { state, updateState } = useGame();
  const [tab, setTab] = useState<'questions' | 'players' | 'battle' | 'shop'>('questions');

  // Question form
  const [qPlanet, setQPlanet] = useState(0);
  const [qIsland, setQIsland] = useState(0);
  const [qText, setQText] = useState('');
  const [qOpts, setQOpts] = useState(['', '', '', '']);
  const [qCorrect, setQCorrect] = useState(0);
  const [qTimer, setQTimer] = useState(false);

  const addQuestion = () => {
    if (!qText.trim() || qOpts.some(o => !o.trim())) return;
    playSound('correct');
    const q: Question = {
      id: crypto.randomUUID(),
      planetId: qPlanet,
      islandId: qIsland,
      text: qText.trim(),
      options: qOpts.map(o => o.trim()),
      correctIndex: qCorrect,
      hasTimer: qTimer,
    };
    updateState(s => ({ ...s, questions: [...s.questions, q] }));
    setQText(''); setQOpts(['', '', '', '']); setQCorrect(0);
  };

  const deleteQuestion = (id: string) => {
    playSound('click');
    updateState(s => ({ ...s, questions: s.questions.filter(q => q.id !== id) }));
  };

  const toggleBan = (playerId: string) => {
    playSound('click');
    updateState(s => ({
      ...s,
      players: s.players.map(p => p.id === playerId ? { ...p, banned: !p.banned } : p),
    }));
  };

  const tabs = [
    { id: 'questions' as const, label: '📝 الأسئلة' },
    { id: 'players' as const, label: '👥 اللاعبون' },
    { id: 'battle' as const, label: '⚔️ القتال' },
    { id: 'shop' as const, label: '🏪 المتجر' },
  ];

  return (
    <div className="min-h-screen p-4 relative z-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-foreground">⚙️ لوحة الأدمن</h1>
          <button onClick={() => { playSound('click'); onBack(); }}
            className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground font-bold hover:bg-secondary/80 transition-all">
            ← رجوع
          </button>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map(t => (
            <button key={t.id} onClick={() => { playSound('click'); setTab(t.id); }}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${tab === t.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'questions' && (
          <div className="space-y-6">
            {/* Add question form */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-bold text-foreground mb-4">إضافة سؤال جديد</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <select value={qPlanet} onChange={e => setQPlanet(+e.target.value)}
                  className="p-3 rounded-xl bg-secondary border border-border text-foreground">
                  {PLANETS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select value={qIsland} onChange={e => setQIsland(+e.target.value)}
                  className="p-3 rounded-xl bg-secondary border border-border text-foreground">
                  {ISLANDS.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              <textarea value={qText} onChange={e => setQText(e.target.value)}
                placeholder="نص السؤال..." rows={2}
                className="w-full p-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground mb-3" />
              {qOpts.map((o, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <input type="radio" checked={qCorrect === i} onChange={() => setQCorrect(i)} className="accent-space-green" />
                  <input value={o} onChange={e => setQOpts(opts => opts.map((x, j) => j === i ? e.target.value : x))}
                    placeholder={`الخيار ${i + 1}`}
                    className="flex-1 p-2 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground" />
                </div>
              ))}
              <div className="flex items-center gap-3 mt-3">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" checked={qTimer} onChange={e => setQTimer(e.target.checked)} className="accent-primary" />
                  مؤقت زمني
                </label>
                <button onClick={addQuestion}
                  className="mr-auto px-6 py-2 rounded-xl bg-accent text-accent-foreground font-bold hover:scale-105 transition-all">
                  + إضافة
                </button>
              </div>
            </div>

            {/* Questions list */}
            <div className="space-y-2">
              {state.questions.map(q => (
                <div key={q.id} className="flex items-center justify-between p-3 bg-card border border-border rounded-xl">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground">{q.text}</p>
                    <p className="text-xs text-muted-foreground">{PLANETS[q.planetId]?.name} → {ISLANDS[q.islandId]?.name}</p>
                  </div>
                  <button onClick={() => deleteQuestion(q.id)} className="text-destructive text-sm px-3 py-1 hover:bg-destructive/10 rounded-lg transition-all">حذف</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'players' && (
          <div className="space-y-2">
            {state.players.length === 0 && <p className="text-center text-muted-foreground py-8">لا يوجد لاعبون</p>}
            {state.players.map(p => {
              const char = CHARACTERS.find(c => c.id === p.characterId);
              return (
                <div key={p.id} className={`flex items-center justify-between p-4 rounded-xl border ${p.banned ? 'bg-destructive/10 border-destructive/30' : 'bg-card border-border'}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{char?.emoji}</span>
                    <div>
                      <p className="font-bold text-foreground text-sm">{p.name} {p.banned && '(محظور)'}</p>
                      <p className="text-xs text-muted-foreground">XP: {p.xp} | 🪙 {p.gold}</p>
                    </div>
                  </div>
                  <button onClick={() => toggleBan(p.id)}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${p.banned ? 'bg-space-green/20 text-foreground' : 'bg-destructive/20 text-destructive'}`}>
                    {p.banned ? 'إلغاء الحظر' : 'حظر'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'battle' && (
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-foreground">إعدادات القتال</h3>
            <div>
              <label className="text-sm text-muted-foreground">قوة هجوم اللاعب</label>
              <input type="number" value={state.battleSettings.playerAttack}
                onChange={e => updateState(s => ({ ...s, battleSettings: { ...s.battleSettings, playerAttack: +e.target.value } }))}
                className="w-full p-3 rounded-xl bg-secondary border border-border text-foreground mt-1" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">قوة هجوم الحارس</label>
              <input type="number" value={state.battleSettings.guardAttack}
                onChange={e => updateState(s => ({ ...s, battleSettings: { ...s.battleSettings, guardAttack: +e.target.value } }))}
                className="w-full p-3 rounded-xl bg-secondary border border-border text-foreground mt-1" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">عدد الأسئلة لكل جزيرة</label>
              {ISLANDS.map(island => (
                <div key={island.id} className="flex items-center gap-3 mb-2">
                  <span className="text-sm text-foreground w-32">{island.emoji} {island.name}</span>
                  <input type="number" value={state.battleSettings.questionsPerGuard[String(island.id)] || 3}
                    onChange={e => updateState(s => ({
                      ...s, battleSettings: {
                        ...s.battleSettings,
                        questionsPerGuard: { ...s.battleSettings.questionsPerGuard, [String(island.id)]: +e.target.value }
                      }
                    }))}
                    className="w-20 p-2 rounded-lg bg-secondary border border-border text-foreground text-sm" />
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'shop' && (
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <h3 className="font-bold text-foreground">أسعار المتجر</h3>
            {state.shopItems.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-3">
                <span className="text-xl">{item.emoji}</span>
                <span className="text-sm text-foreground flex-1">{item.name}</span>
                <input type="number" value={item.price}
                  onChange={e => updateState(s => ({
                    ...s, shopItems: s.shopItems.map((si, i) => i === idx ? { ...si, price: +e.target.value } : si)
                  }))}
                  className="w-24 p-2 rounded-lg bg-secondary border border-border text-foreground text-sm" />
                <span className="text-xs text-muted-foreground">🪙</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
