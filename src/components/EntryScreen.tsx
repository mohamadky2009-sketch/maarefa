import { useState } from 'react';
import StarField from './StarField';
import FloatingAstronaut from './FloatingAstronaut';
import RegisterModal from './RegisterModal';
import AdminLoginModal from './AdminLoginModal';
import { playSound } from '@/lib/gameState';

interface Props {
  onAdmin: () => void;
}

const EntryScreen = ({ onAdmin }: Props) => {
  const [showRegister, setShowRegister] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <StarField />
      <FloatingAstronaut />

      <div className="relative z-10 animate-float">
        <div className="relative bg-gradient-to-b from-amber-900/80 to-amber-800/60 border-2 border-amber-700/50 rounded-2xl p-8 md:p-12 shadow-2xl backdrop-blur-sm max-w-md mx-4"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence baseFrequency=\'0.9\' type=\'fractalNoise\'/%3E%3C/filter%3E%3Crect width=\'100\' height=\'100\' filter=\'url(%23n)\' opacity=\'0.08\'/%3E%3C/svg%3E")' }}>
          
          <h1 className="text-5xl md:text-6xl font-black text-center mb-2 text-accent drop-shadow-lg">
            معرفة
          </h1>
          <p className="text-center text-amber-200/70 mb-8 text-sm">رحلة تعليمية في عالم اللغة العربية</p>

          <div className="space-y-4">
            <button
              onClick={() => { playSound('click'); setShowRegister(true); }}
              className="w-full py-3 px-6 rounded-xl font-bold text-lg bg-primary hover:bg-primary/80 text-primary-foreground transition-all duration-200 hover:scale-105 shadow-lg shadow-primary/30"
            >
              🚀 تسجيل كلاعب
            </button>
            <button
              onClick={() => { playSound('click'); setShowAdmin(true); }}
              className="w-full py-3 px-6 rounded-xl font-bold text-lg bg-destructive hover:bg-destructive/80 text-destructive-foreground transition-all duration-200 hover:scale-105 shadow-lg shadow-destructive/30"
            >
              🔐 دخول كأدمن
            </button>
          </div>
        </div>
      </div>

      {showRegister && <RegisterModal onClose={() => setShowRegister(false)} />}
      {showAdmin && <AdminLoginModal onClose={() => setShowAdmin(false)} onSuccess={onAdmin} />}
    </div>
  );
};

export default EntryScreen;
