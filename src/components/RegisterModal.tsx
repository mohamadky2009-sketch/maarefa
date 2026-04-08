import { useState } from 'react';
import { CHARACTERS, playSound } from '@/lib/gameState';
import { useGame } from '@/context/GameContext';

const RegisterModal = ({ onClose }: { onClose: () => void }) => {
  const { registerPlayer } = useGame();
  const [step, setStep] = useState(0);
  const [charId, setCharId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const next = () => { playSound('click'); setStep(s => s + 1); };
  const submit = () => {
    if (!name.trim() || !charId) return;
    playSound('victory');
    registerPlayer(name.trim(), email.trim(), charId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl p-6 md:p-8 w-full max-w-lg animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-foreground">تسجيل لاعب جديد</h2>
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div key={i} className={`w-3 h-3 rounded-full ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>
        </div>

        {step === 0 && (
          <div>
            <p className="text-muted-foreground mb-4">اختر شخصيتك</p>
            <div className="grid grid-cols-3 gap-3">
              {CHARACTERS.map(c => (
                <button
                  key={c.id}
                  onClick={() => { playSound('click'); setCharId(c.id); }}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                    charId === c.id
                      ? 'border-primary bg-primary/10 scale-105 animate-float'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <span className="text-4xl">{c.emoji}</span>
                  <span className="text-sm font-semibold text-foreground">{c.name}</span>
                </button>
              ))}
            </div>
            <button
              disabled={!charId}
              onClick={next}
              className="mt-6 w-full py-3 rounded-xl font-bold bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/80 transition-all"
            >
              التالي ←
            </button>
          </div>
        )}

        {step === 1 && (
          <div>
            <p className="text-muted-foreground mb-4">اكتب اسمك في اللعبة</p>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="اسم اللاعب..."
              className="w-full p-4 rounded-xl bg-secondary border border-border text-foreground text-lg placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              disabled={!name.trim()}
              onClick={next}
              className="mt-6 w-full py-3 rounded-xl font-bold bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/80 transition-all"
            >
              التالي ←
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="text-muted-foreground mb-4">بريدك الإلكتروني (اختياري)</p>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              type="email"
              placeholder="example@email.com"
              dir="ltr"
              className="w-full p-4 rounded-xl bg-secondary border border-border text-foreground text-lg placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={submit}
              className="mt-6 w-full py-3 rounded-xl font-bold bg-accent text-accent-foreground hover:bg-accent/80 transition-all text-lg"
            >
              🚀 ابدأ المغامرة
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegisterModal;
