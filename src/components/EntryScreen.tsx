import { useState } from 'react';
import StarField from './StarField';
import FloatingAstronaut from './FloatingAstronaut';
import RegisterModal from './RegisterModal';
import AdminLoginModal from './AdminLoginModal';
import { playSound } from '@/lib/gameState';
import parchmentImg from '@/assets/parchment.png';
import rocketImg from '@/assets/rocket.png';

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

      {/* Floating rocket */}
      <div className="fixed bottom-10 left-10 z-0 pointer-events-none animate-float-slow opacity-60">
        <img src={rocketImg} alt="rocket" className="w-16 h-24 md:w-20 md:h-28 object-contain drop-shadow-lg" />
      </div>

      <div className="relative z-10 animate-float">
        <div className="relative max-w-md mx-4">
          {/* Parchment background */}
          <img
            src={parchmentImg}
            alt="parchment"
            className="absolute inset-0 w-full h-full object-fill drop-shadow-2xl"
          />

          {/* Content on parchment */}
          <div className="relative p-10 md:p-14 flex flex-col items-center">
            <h1 className="text-5xl md:text-6xl font-black text-center mb-2 text-amber-900 drop-shadow-lg">
              معرفة
            </h1>
            <p className="text-center text-amber-800/70 mb-8 text-sm">رحلة تعليمية في عالم اللغة العربية</p>

            <div className="space-y-4 w-full">
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
      </div>

      {showRegister && <RegisterModal onClose={() => setShowRegister(false)} />}
      {showAdmin && <AdminLoginModal onClose={() => setShowAdmin(false)} onSuccess={onAdmin} />}
    </div>
  );
};

export default EntryScreen;
