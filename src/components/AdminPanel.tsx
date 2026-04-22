import { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { ISLANDS, PLANETS, CHARACTERS, Island, IslandQuestion, playSound, Question, MONSTER_NAMES } from '@/lib/gameState';
import { ISLAND_QUESTIONS } from '@/lib/islandQuestions';

type Tab = 'islands' | 'bank' | 'questions' | 'players' | 'battle' | 'shop';

// ─── Island editor row ────────────────────────────────────────────
interface IslandEditorProps {
  island: Island;
  onSave: (updated: Island) => void;
}

const IslandEditor = ({ island, onSave }: IslandEditorProps) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(island.question.text);
  const [options, setOptions] = useState<string[]>([...island.question.options]);
  const [correctIndex, setCorrectIndex] = useState(island.question.correctIndex);

  const save = () => {
    if (!text.trim() || options.some(o => !o.trim())) return;
    playSound('correct');
    onSave({ ...island, question: { text: text.trim(), options: options.map(o => o.trim()), correctIndex } });
    setOpen(false);
  };

  const reset = () => {
    setText(island.question.text);
    setOptions([...island.question.options]);
    setCorrectIndex(island.question.correctIndex);
    setOpen(false);
  };

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 transition-all text-right"
      >
        <span className="text-xs text-white/40">{island.question.text.slice(0, 60)}…</span>
        <span className="font-bold text-white text-sm">{island.name}</span>
      </button>

      {/* Edit form */}
      {open && (
        <div className="p-4 space-y-3 bg-black/40" dir="rtl">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={2}
            placeholder="نص السؤال..."
            className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-yellow-500/60 resize-none"
          />
          <div className="space-y-2">
            {options.map((opt, i) => (
              <label key={i} className="flex items-center gap-3">
                <input
                  type="radio"
                  name={`correct-${island.id}`}
                  checked={correctIndex === i}
                  onChange={() => setCorrectIndex(i)}
                  className="accent-green-500 w-4 h-4 shrink-0"
                />
                <input
                  value={opt}
                  onChange={e => setOptions(prev => prev.map((x, j) => j === i ? e.target.value : x))}
                  placeholder={`الخيار ${i + 1}`}
                  className="flex-1 p-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-blue-500/60"
                />
                {correctIndex === i && <span className="text-green-400 text-xs font-bold shrink-0">✓ صحيح</span>}
              </label>
            ))}
          </div>
          <div className="flex gap-2 justify-start">
            <button onClick={save} className="px-5 py-2 rounded-xl bg-green-600 hover:bg-green-500 font-bold text-sm text-white transition-all">
              حفظ
            </button>
            <button onClick={reset} className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 font-bold text-sm text-white transition-all">
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Admin Panel ──────────────────────────────────────────────────
const AdminPanel = ({ onBack }: { onBack: () => void }) => {
  const { state, updateState } = useGame();
  const [tab, setTab] = useState<Tab>('islands');
  const [expandedPlanet, setExpandedPlanet] = useState<number | null>(0);

  // ── Island tab state ──
  const [addingIsland, setAddingIsland] = useState(false);
  const [newIslandPlanet, setNewIslandPlanet] = useState(0);
  const [newIslandName, setNewIslandName] = useState('');
  const [newIslandQ, setNewIslandQ] = useState('');
  const [newIslandOpts, setNewIslandOpts] = useState(['', '', '', '']);
  const [newIslandCorrect, setNewIslandCorrect] = useState(0);

  // ── Questions tab state ──
  const [qPlanet, setQPlanet] = useState(0);
  const [qIsland, setQIsland] = useState(0);
  const [qText, setQText] = useState('');
  const [qOpts, setQOpts] = useState(['', '', '', '']);
  const [qCorrect, setQCorrect] = useState(0);

  // ── Bank tab state ──
  const [bankIslandId, setBankIslandId] = useState<number>(0);
  const [editingBankIdx, setEditingBankIdx] = useState<number | null>(null);
  const [bankDraft, setBankDraft] = useState<IslandQuestion>({ text: '', options: ['', '', '', ''], correctIndex: 0 });

  // ─── Handlers ────────────────────────────────────────────────────
  const handleSaveIsland = (updated: Island) => {
    const isCustom = state.customIslands.some(ci => ci.id === updated.id);
    if (isCustom) {
      updateState(s => ({ ...s, customIslands: s.customIslands.map(ci => ci.id === updated.id ? updated : ci) }));
    } else {
      // Save override into state — we keep customIslands only for truly new islands
      // For built-in islands, persist edits as a custom island replacement
      updateState(s => ({
        ...s,
        customIslands: s.customIslands.some(ci => ci.id === updated.id)
          ? s.customIslands.map(ci => ci.id === updated.id ? updated : ci)
          : [...s.customIslands, updated],
      }));
    }
  };

  const handleAddIsland = () => {
    if (!newIslandName.trim() || !newIslandQ.trim() || newIslandOpts.some(o => !o.trim())) return;
    playSound('correct');

    const allIds = [...ISLANDS, ...state.customIslands].map(i => i.id);
    const newId = Math.max(...allIds, 30) + 1;

    const newIsland: Island = {
      id: newId,
      planetId: newIslandPlanet,
      name: newIslandName.trim(),
      image: `/src/assets/islands/island${(newId % 31) + 1}.png`,
      enemyFolder: `monster${PLANETS.find(p => p.id === newIslandPlanet)?.monster ?? 1}`,
      background: '/src/assets/islands/islands-bg.png',
      question: {
        text: newIslandQ.trim(),
        options: newIslandOpts.map(o => o.trim()),
        correctIndex: newIslandCorrect,
      },
    };

    updateState(s => ({ ...s, customIslands: [...s.customIslands, newIsland] }));
    setNewIslandName(''); setNewIslandQ(''); setNewIslandOpts(['', '', '', '']); setNewIslandCorrect(0);
    setAddingIsland(false);
  };

  const handleDeleteCustomIsland = (id: number) => {
    playSound('click');
    updateState(s => ({ ...s, customIslands: s.customIslands.filter(ci => ci.id !== id) }));
  };

  const addAdminQuestion = () => {
    if (!qText.trim() || qOpts.some(o => !o.trim())) return;
    playSound('correct');
    const q: Question = {
      id: crypto.randomUUID(),
      planetId: qPlanet,
      islandId: qIsland,
      text: qText.trim(),
      options: qOpts.map(o => o.trim()),
      correctIndex: qCorrect,
      hasTimer: false,
    };
    updateState(s => ({ ...s, questions: [...s.questions, q] }));
    setQText(''); setQOpts(['', '', '', '']); setQCorrect(0);
  };

  const deleteAdminQuestion = (id: string) => {
    updateState(s => ({ ...s, questions: s.questions.filter(q => q.id !== id) }));
  };

  // ── Bank handlers ──
  const getBankFor = (islandId: number): IslandQuestion[] => {
    const overrides = state.customIslandQuestions?.[islandId];
    if (overrides && overrides.length > 0) return overrides;
    return ISLAND_QUESTIONS[islandId] ?? [];
  };

  const writeBank = (islandId: number, list: IslandQuestion[]) => {
    updateState(s => ({
      ...s,
      customIslandQuestions: { ...s.customIslandQuestions, [islandId]: list },
    }));
  };

  const startEditBank = (idx: number) => {
    const list = getBankFor(bankIslandId);
    const q = list[idx];
    if (!q) return;
    setBankDraft({ text: q.text, options: [...q.options], correctIndex: q.correctIndex });
    setEditingBankIdx(idx);
  };

  const startNewBankQuestion = () => {
    setBankDraft({ text: '', options: ['', '', '', ''], correctIndex: 0 });
    setEditingBankIdx(-1);
  };

  const cancelBankEdit = () => {
    setEditingBankIdx(null);
    setBankDraft({ text: '', options: ['', '', '', ''], correctIndex: 0 });
  };

  const saveBankDraft = () => {
    if (!bankDraft.text.trim() || bankDraft.options.some(o => !o.trim())) return;
    playSound('correct');
    const list = [...getBankFor(bankIslandId)];
    const cleaned: IslandQuestion = {
      text: bankDraft.text.trim(),
      options: bankDraft.options.map(o => o.trim()),
      correctIndex: bankDraft.correctIndex,
    };
    if (editingBankIdx === -1 || editingBankIdx === null) {
      list.push(cleaned);
    } else {
      list[editingBankIdx] = cleaned;
    }
    writeBank(bankIslandId, list);
    cancelBankEdit();
  };

  const deleteBankQuestion = (idx: number) => {
    playSound('click');
    const list = getBankFor(bankIslandId).filter((_, i) => i !== idx);
    writeBank(bankIslandId, list);
    if (editingBankIdx === idx) cancelBankEdit();
  };

  const resetBankToDefault = () => {
    if (!confirm('استعادة بنك أسئلة هذه الجزيرة إلى القيم الأصلية؟ سيتم حذف أي تعديلات.')) return;
    playSound('click');
    updateState(s => {
      const next = { ...s.customIslandQuestions };
      delete next[bankIslandId];
      return { ...s, customIslandQuestions: next };
    });
    cancelBankEdit();
  };

  const toggleBan = (playerId: string) => {
    updateState(s => ({
      ...s,
      players: s.players.map(p => p.id === playerId ? { ...p, banned: !p.banned } : p),
    }));
  };

  // ─── All islands (static + custom, merged & editable) ────────────
  const allIslands = [...ISLANDS, ...state.customIslands];

  const tabs: { id: Tab; label: string }[] = [
    { id: 'islands',   label: '🏝️ الجزر' },
    { id: 'bank',      label: '🏦 بنك الأسئلة' },
    { id: 'questions', label: '➕ أسئلة إضافية' },
    { id: 'players',  label: '👥 اللاعبون' },
    { id: 'battle',   label: '⚔️ القتال' },
    { id: 'shop',     label: '🏪 المتجر' },
  ];

  const inputCls = 'w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-yellow-500/50 text-sm';
  const btnPrimary = 'px-5 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-black text-sm transition-all';

  return (
    <div className="min-h-screen p-4 relative z-10 text-white" dir="rtl">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black">⚙️ لوحة الأدمن</h1>
          <button
            onClick={() => { playSound('click'); onBack(); }}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 font-bold text-sm transition-all"
          >
            ← رجوع
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => { playSound('click'); setTab(t.id); }}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${tab === t.id ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Islands & Questions tab ─────────────────────────────── */}
        {tab === 'islands' && (
          <div className="space-y-4">

            {/* Add new island button */}
            <div className="flex justify-between items-center">
              <h3 className="font-black text-lg">تصفح الكواكب والجزر</h3>
              <button
                onClick={() => setAddingIsland(a => !a)}
                className={btnPrimary}
              >
                {addingIsland ? '✕ إلغاء' : '+ جزيرة جديدة'}
              </button>
            </div>

            {/* New island form */}
            {addingIsland && (
              <div className="bg-white/5 border border-yellow-500/30 rounded-2xl p-5 space-y-3">
                <h4 className="font-bold text-yellow-400">إضافة جزيرة جديدة</h4>
                <select
                  value={newIslandPlanet}
                  onChange={e => setNewIslandPlanet(+e.target.value)}
                  className={inputCls}
                >
                  {PLANETS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input
                  value={newIslandName}
                  onChange={e => setNewIslandName(e.target.value)}
                  placeholder="اسم الجزيرة..."
                  className={inputCls}
                />
                <textarea
                  value={newIslandQ}
                  onChange={e => setNewIslandQ(e.target.value)}
                  placeholder="نص السؤال..."
                  rows={2}
                  className={`${inputCls} resize-none`}
                />
                {newIslandOpts.map((opt, i) => (
                  <label key={i} className="flex items-center gap-3">
                    <input
                      type="radio"
                      checked={newIslandCorrect === i}
                      onChange={() => setNewIslandCorrect(i)}
                      className="accent-green-500 w-4 h-4 shrink-0"
                    />
                    <input
                      value={opt}
                      onChange={e => setNewIslandOpts(prev => prev.map((x, j) => j === i ? e.target.value : x))}
                      placeholder={`الخيار ${i + 1}`}
                      className="flex-1 p-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none"
                    />
                    {newIslandCorrect === i && <span className="text-green-400 text-xs font-bold shrink-0">✓ صحيح</span>}
                  </label>
                ))}
                <button onClick={handleAddIsland} className={btnPrimary}>
                  ✓ إضافة الجزيرة
                </button>
              </div>
            )}

            {/* Planets accordion */}
            {PLANETS.map(planet => {
              const planetIslands = allIslands.filter(is => is.planetId === planet.id);
              const isExpanded = expandedPlanet === planet.id;
              return (
                <div key={planet.id} className="border border-white/10 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => { playSound('click'); setExpandedPlanet(isExpanded ? null : planet.id); }}
                    className="w-full flex items-center justify-between px-5 py-4 bg-white/5 hover:bg-white/10 transition-all"
                  >
                    <span className="text-white/50 text-sm">{planetIslands.length} جزيرة</span>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-base" style={{ color: planet.color }}>{planet.name}</span>
                      <span className="text-white/40">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-4 space-y-2 bg-black/30">
                      {planetIslands.length === 0 && (
                        <p className="text-center text-white/40 py-3 text-sm">لا توجد جزر في هذا الكوكب</p>
                      )}
                      {planetIslands.map(island => {
                        const isCustom = state.customIslands.some(ci => ci.id === island.id);
                        const displayIsland: Island = state.customIslands.find(ci => ci.id === island.id) ?? island;
                        return (
                          <div key={island.id} className="relative">
                            <IslandEditor island={displayIsland} onSave={handleSaveIsland} />
                            {isCustom && (
                              <button
                                onClick={() => handleDeleteCustomIsland(island.id)}
                                className="absolute top-2 left-2 text-red-400 hover:text-red-300 text-xs font-bold px-2 py-1 rounded-lg hover:bg-red-500/10 transition-all"
                                title="حذف الجزيرة المضافة"
                              >
                                حذف
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Question bank tab ───────────────────────────────────── */}
        {tab === 'bank' && (() => {
          const bank = getBankFor(bankIslandId);
          const isOverridden = !!state.customIslandQuestions?.[bankIslandId];
          const selectedIsland = allIslands.find(is => is.id === bankIslandId);
          return (
            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <h3 className="font-bold">🏦 بنك الأسئلة لكل جزيرة</h3>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={startNewBankQuestion} className={btnPrimary}>+ سؤال جديد</button>
                    {isOverridden && (
                      <button
                        onClick={resetBankToDefault}
                        className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold text-sm transition-all"
                      >
                        ↺ استعادة الأصلي
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-white/40 text-xs">
                  هذه الأسئلة تظهر للاعب بشكل عشوائي عند دخوله للمعركة في الجزيرة المختارة.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={PLANETS.find(p => allIslands.some(is => is.planetId === p.id && is.id === bankIslandId))?.id ?? 0}
                    onChange={e => {
                      const planetId = +e.target.value;
                      const first = allIslands.find(is => is.planetId === planetId);
                      if (first) { setBankIslandId(first.id); cancelBankEdit(); }
                    }}
                    className={inputCls}
                  >
                    {PLANETS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <select
                    value={bankIslandId}
                    onChange={e => { setBankIslandId(+e.target.value); cancelBankEdit(); }}
                    className={inputCls}
                  >
                    {allIslands
                      .filter(is => is.planetId === (PLANETS.find(p => allIslands.some(island => island.planetId === p.id && island.id === bankIslandId))?.id ?? 0))
                      .map(is => <option key={is.id} value={is.id}>{is.name}</option>)}
                  </select>
                </div>

                <div className="flex items-center justify-between text-xs text-white/50">
                  <span>{isOverridden ? '✏️ معدّل' : '📚 الأصلي'}</span>
                  <span>عدد الأسئلة: {bank.length}</span>
                </div>
              </div>

              {/* Editor form */}
              {editingBankIdx !== null && (
                <div className="bg-white/5 border border-yellow-500/40 rounded-2xl p-5 space-y-3">
                  <h4 className="font-bold text-yellow-400">
                    {editingBankIdx === -1 ? '➕ إضافة سؤال جديد' : `✏️ تعديل السؤال رقم ${editingBankIdx + 1}`}
                    {selectedIsland && <span className="text-white/40 text-xs font-normal mr-2">— {selectedIsland.name}</span>}
                  </h4>
                  <textarea
                    value={bankDraft.text}
                    onChange={e => setBankDraft(d => ({ ...d, text: e.target.value }))}
                    rows={2}
                    placeholder="نص السؤال..."
                    className={`${inputCls} resize-none`}
                  />
                  {bankDraft.options.map((opt, i) => (
                    <label key={i} className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="bank-correct"
                        checked={bankDraft.correctIndex === i}
                        onChange={() => setBankDraft(d => ({ ...d, correctIndex: i }))}
                        className="accent-green-500 w-4 h-4 shrink-0"
                      />
                      <input
                        value={opt}
                        onChange={e => setBankDraft(d => ({
                          ...d,
                          options: d.options.map((x, j) => j === i ? e.target.value : x),
                        }))}
                        placeholder={`الخيار ${i + 1}`}
                        className="flex-1 p-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none"
                      />
                      {bankDraft.correctIndex === i && <span className="text-green-400 text-xs font-bold shrink-0">✓ صحيح</span>}
                    </label>
                  ))}
                  <div className="flex gap-2">
                    <button onClick={saveBankDraft} className="px-5 py-2 rounded-xl bg-green-600 hover:bg-green-500 font-bold text-sm text-white transition-all">
                      حفظ
                    </button>
                    <button onClick={cancelBankEdit} className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 font-bold text-sm text-white transition-all">
                      إلغاء
                    </button>
                  </div>
                </div>
              )}

              {/* List of bank questions */}
              <div className="space-y-2">
                {bank.length === 0 && (
                  <p className="text-center text-white/40 py-10 text-sm">لا توجد أسئلة في هذه الجزيرة بعد</p>
                )}
                {bank.map((q, idx) => (
                  <div key={idx} className="border border-white/10 rounded-xl bg-white/5 p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => startEditBank(idx)}
                          className="px-3 py-1 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 text-xs font-bold transition-all"
                        >
                          ✏️ تعديل
                        </button>
                        <button
                          onClick={() => deleteBankQuestion(idx)}
                          className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold transition-all"
                        >
                          حذف
                        </button>
                      </div>
                      <div className="flex-1 text-right">
                        <p className="text-sm font-bold leading-relaxed">{idx + 1}. {q.text}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {q.options.map((opt, i) => (
                        <div
                          key={i}
                          className={`p-2 rounded-lg text-right ${
                            i === q.correctIndex
                              ? 'bg-green-500/15 border border-green-500/40 text-green-300'
                              : 'bg-white/5 border border-white/10 text-white/70'
                          }`}
                        >
                          {i === q.correctIndex && '✓ '}{opt}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ── Extra questions tab ─────────────────────────────────── */}
        {tab === 'questions' && (
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
              <h3 className="font-bold">إضافة سؤال إضافي لجزيرة</h3>
              <p className="text-white/40 text-xs">الأسئلة المضافة هنا تُضاف إلى سؤال الجزيرة الأصلي في المعركة</p>
              <div className="grid grid-cols-2 gap-3">
                <select value={qPlanet} onChange={e => setQPlanet(+e.target.value)} className={inputCls}>
                  {PLANETS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select value={qIsland} onChange={e => setQIsland(+e.target.value)} className={inputCls}>
                  {allIslands.filter(is => is.planetId === qPlanet).map(i => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
              </div>
              <textarea value={qText} onChange={e => setQText(e.target.value)} placeholder="نص السؤال..." rows={2} className={`${inputCls} resize-none`} />
              {qOpts.map((o, i) => (
                <label key={i} className="flex items-center gap-3">
                  <input type="radio" checked={qCorrect === i} onChange={() => setQCorrect(i)} className="accent-green-500 w-4 h-4 shrink-0" />
                  <input value={o} onChange={e => setQOpts(opts => opts.map((x, j) => j === i ? e.target.value : x))} placeholder={`الخيار ${i + 1}`} className="flex-1 p-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none" />
                </label>
              ))}
              <button onClick={addAdminQuestion} className={btnPrimary}>+ إضافة السؤال</button>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-sm text-white/60">الأسئلة المضافة ({state.questions.length})</h3>
              {state.questions.length === 0 && <p className="text-center text-white/40 py-6 text-sm">لا توجد أسئلة مضافة</p>}
              {state.questions.map(q => {
                const isl = allIslands.find(is => is.id === q.islandId);
                return (
                  <div key={q.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
                    <div className="flex-1 text-right">
                      <p className="text-sm font-bold">{q.text}</p>
                      <p className="text-xs text-white/40">{PLANETS[q.planetId]?.name} ← {isl?.name ?? `جزيرة ${q.islandId}`}</p>
                    </div>
                    <button onClick={() => deleteAdminQuestion(q.id)} className="text-red-400 text-sm px-3 py-1 hover:bg-red-500/10 rounded-lg transition-all shrink-0 mr-2">
                      حذف
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Players tab ─────────────────────────────────────────── */}
        {tab === 'players' && (
          <div className="space-y-2">
            {state.players.length === 0 && <p className="text-center text-white/40 py-10">لا يوجد لاعبون بعد</p>}
            {state.players.map(p => {
              const char = CHARACTERS.find(c => c.id === p.characterId);
              return (
                <div key={p.id} className={`flex items-center justify-between p-4 rounded-xl border ${p.banned ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-white/10'}`}>
                  <button onClick={() => toggleBan(p.id)} className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${p.banned ? 'bg-green-600/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {p.banned ? 'رفع الحظر' : 'حظر'}
                  </button>
                  <div className="text-right">
                    <p className="font-bold text-sm">{p.name} {p.banned ? '🚫' : ''}</p>
                    <p className="text-xs text-white/40">XP: {p.xp} | 🪙 {p.gold} | ❤️ {p.hp}/{p.maxHp}</p>
                    <p className="text-xs text-white/30">{char?.name}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Battle settings tab ─────────────────────────────────── */}
        {tab === 'battle' && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-6">
            <h3 className="font-bold">إعدادات المعركة</h3>

            <div>
              <label className="text-xs text-white/50 block mb-2">قوة هجوم الافتراضية (يُستخدم إذا لم يكن للبطل/الوحش قيمة محددة)</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-white/50 block mb-1">قوة البطل الافتراضية</label>
                  <input type="number" value={state.battleSettings.playerAttack}
                    onChange={e => updateState(s => ({ ...s, battleSettings: { ...s.battleSettings, playerAttack: +e.target.value } }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 block mb-1">قوة الوحش الافتراضية</label>
                  <input type="number" value={state.battleSettings.guardAttack}
                    onChange={e => updateState(s => ({ ...s, battleSettings: { ...s.battleSettings, guardAttack: +e.target.value } }))}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            {/* Per-hero attack strength */}
            <div>
              <label className="text-xs text-white/50 block mb-2">⚔️ قوة هجوم كل بطل</label>
              <div className="space-y-2">
                {CHARACTERS.map(hero => (
                  <div key={hero.id} className="flex items-center gap-3 justify-between bg-white/5 border border-white/10 rounded-xl p-3">
                    <input
                      type="number"
                      min={0}
                      value={state.battleSettings.heroAttack[hero.folder] ?? state.battleSettings.playerAttack}
                      onChange={e => updateState(s => ({
                        ...s,
                        battleSettings: {
                          ...s.battleSettings,
                          heroAttack: { ...s.battleSettings.heroAttack, [hero.folder]: +e.target.value },
                        },
                      }))}
                      className="w-20 p-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm text-center focus:outline-none focus:border-yellow-500/50"
                    />
                    <div className="text-right flex-1">
                      <p className="text-sm font-bold">🦸 {hero.name}</p>
                      <p className="text-xs text-white/40">{hero.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Per-monster attack strength */}
            <div>
              <label className="text-xs text-white/50 block mb-2">👹 قوة هجوم كل وحش</label>
              <div className="space-y-2">
                {Object.entries(MONSTER_NAMES).map(([folder, name]) => {
                  const planetsUsing = PLANETS.filter(p => `monster${p.monster}` === folder).map(p => p.name);
                  return (
                    <div key={folder} className="flex items-center gap-3 justify-between bg-white/5 border border-white/10 rounded-xl p-3">
                      <input
                        type="number"
                        min={0}
                        value={state.battleSettings.monsterAttack[folder] ?? state.battleSettings.guardAttack}
                        onChange={e => updateState(s => ({
                          ...s,
                          battleSettings: {
                            ...s.battleSettings,
                            monsterAttack: { ...s.battleSettings.monsterAttack, [folder]: +e.target.value },
                          },
                        }))}
                        className="w-20 p-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm text-center focus:outline-none focus:border-red-500/50"
                      />
                      <div className="text-right flex-1">
                        <p className="text-sm font-bold">{name}</p>
                        <p className="text-xs text-white/40">
                          {planetsUsing.length > 0 ? `يظهر في: ${planetsUsing.join('، ')}` : 'غير مستخدم حالياً'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs text-white/50 block mb-2">عدد الإجابات الصحيحة المطلوبة للفوز — لكل جزيرة</label>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {allIslands.map(island => (
                  <div key={island.id} className="flex items-center gap-3 justify-between">
                    <input
                      type="number"
                      min={1}
                      value={state.battleSettings.questionsPerGuard[String(island.id)] ?? 3}
                      onChange={e => updateState(s => ({
                        ...s,
                        battleSettings: {
                          ...s.battleSettings,
                          questionsPerGuard: { ...s.battleSettings.questionsPerGuard, [String(island.id)]: +e.target.value },
                        },
                      }))}
                      className="w-16 p-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm text-center focus:outline-none"
                    />
                    <span className="text-sm text-white/70 flex-1 text-right">{island.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Shop tab ────────────────────────────────────────────── */}
        {tab === 'shop' && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
            <h3 className="font-bold">أسعار المتجر</h3>
            {state.shopItems.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-3 justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={item.price}
                    onChange={e => updateState(s => ({
                      ...s,
                      shopItems: s.shopItems.map((si, i) => i === idx ? { ...si, price: +e.target.value } : si),
                    }))}
                    className="w-24 p-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm text-center focus:outline-none"
                  />
                  <span className="text-xs text-white/40">🪙</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold">{item.emoji} {item.name}</span>
                  <p className="text-xs text-white/40">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminPanel;
