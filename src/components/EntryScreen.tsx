import { useState } from 'react';
import StarField from './StarField';
import FloatingAstronaut from './FloatingAstronaut';
import FloatingRocket from './FloatingRocket';
import RegisterModal from './RegisterModal';
import AdminLoginModal from './AdminLoginModal';
import { playSound } from '@/lib/gameState';
import parchmentImg from '@/assets/parchment.png';

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
      <FloatingRocket />

      <div className="relative z-10 animate-float">
        <div className="relative w-[320px] md:w-[380px] mx-4 aspect-[4/5]">
          {/* Parchment background */}
          <img
            src={parchmentImg}
            alt="parchment"
            className="absolute inset-0 w-full h-full object-fill drop-shadow-2xl"
          />

          {/* Content positioned inside the parchment */}
          <div className="absolute inset-0 flex flex-col items-center justify-center px-12 py-16 md:px-14 md:py-20">
            <h1 className="text-4xl md:text-5xl font-black text-center mb-1 text-amber-900 drop-shadow-lg">
              معرفة
            </h1>
            <p className="text-center text-amber-800/70 mb-6 text-xs md:text-sm">رحلة تعليمية في عالم اللغة العربية</p>

            <div className="space-y-3 w-full">
              <button
                onClick={() => { playSound('click'); setShowRegister(true); }}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-sm md:text-base bg-primary hover:bg-primary/80 text-primary-foreground transition-all duration-200 hover:scale-105 shadow-lg shadow-primary/30"
              >
                🚀 تسجيل كلاعب
              </button>
              <button
                onClick={() => { playSound('click'); setShowAdmin(true); }}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-sm md:text-base bg-destructive hover:bg-destructive/80 text-destructive-foreground transition-all duration-200 hover:scale-105 shadow-lg shadow-destructive/30"
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
