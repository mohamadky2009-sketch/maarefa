import { useState } from 'react';
import { playSound } from '@/lib/gameState';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const AdminLoginModal = ({ onClose, onSuccess }: Props) => {
  const [pass, setPass] = useState('');
  const [error, setError] = useState(false);

  const login = () => {
    if (pass === 'admin123') {
      playSound('victory');
      onSuccess();
      onClose();
    } else {
      playSound('wrong');
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl p-6 md:p-8 w-full max-w-sm animate-scale-in" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-foreground mb-4">🔐 دخول الأدمن</h2>
        <input
          type="password"
          value={pass}
          onChange={e => { setPass(e.target.value); setError(false); }}
          onKeyDown={e => e.key === 'Enter' && login()}
          placeholder="كلمة السر..."
          className={`w-full p-4 rounded-xl bg-secondary border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary ${error ? 'border-destructive' : 'border-border'}`}
        />
        {error && <p className="text-destructive text-sm mt-2">كلمة السر خاطئة!</p>}
        <button
          onClick={login}
          className="mt-4 w-full py-3 rounded-xl font-bold bg-destructive text-destructive-foreground hover:bg-destructive/80 transition-all"
        >
          دخول
        </button>
      </div>
    </div>
  );
};

export default AdminLoginModal;
