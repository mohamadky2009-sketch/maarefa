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
        {/* تم تكبير عرض الصحيفة هنا لـ 400px على الموبايل و 500px على الشاشات الأكبر */}
        <div className="relative w-[400px] md:w-[500px] mx-4 aspect-[4/5]">
          {/* Parchment background */}
          <img
            src={parchmentImg}
            alt="parchment"
            className="absolute inset-0 w-full h-full object-fill drop-shadow-2xl"
          />

          {/* تم زيادة الهوامش الداخلية (px و py) لإبقاء الأزرار داخل حدود الصحيفة تماماً */}
          <div className="absolute inset-0 flex flex-col items-center justify-center px-16 py-24 md:px-24 md:py-32">
            <h1 className="text-5xl md:text-6xl font-black text-center mb-2 text-amber-900 drop-shadow-lg">
              معرفة
            </h1>
            <p className="text-center text-amber-800/80 mb-8 text-sm md:text-base font-bold">رحلة تعليمية في عالم اللغة العربية</p>

            <div className="space-y-4 w-full px-2">
              <button
                onClick={() => { playSound('click'); setShowRegister(true); }}
                className="w-full py-3 px-4 rounded-xl font-bold text-base md:text-lg bg-primary hover:bg-primary/80 text-primary-foreground transition-all duration-200 hover:scale-105 shadow-lg shadow-primary/30"
              >
                🚀 تسجيل كلاعب
              </button>
              <button
                onClick={() => { playSound('click'); setShowAdmin(true); }}
                className="w-full py-3 px-4 rounded-xl font-bold text-base md:text-lg bg-destructive hover:bg-destructive/80 text-destructive-foreground transition-all duration-200 hover:scale-105 shadow-lg shadow-destructive/30"
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
