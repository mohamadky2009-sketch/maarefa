import { useEffect, useRef } from 'react';
import astronautImg from '@/assets/astronaut.png';

const FloatingAstronaut = () => {
  const ref = useRef<HTMLDivElement>(null);
  // يبدأ من منتصف الشاشة
  const posRef = useRef({ x: 50, y: 50 });
  const velRef = useRef({ x: 0.5, y: 0.4 });

  useEffect(() => {
    let raf: number;
    const update = () => {
      const pos = posRef.current;
      const vel = velRef.current;

      pos.x += vel.x;
      pos.y += vel.y;

      // يخليه يسبح بكل مساحة الشاشة (من 0 لـ 90%)
      if (pos.x > 90 || pos.x < 0) vel.x *= -1;
      if (pos.y > 90 || pos.y < 0) vel.y *= -1;

      // حركة عشوائية أقوى عشان يبين كأنه طايف بالفضاء
      vel.x += (Math.random() - 0.5) * 0.04;
      vel.y += (Math.random() - 0.5) * 0.04;

      // تحديد سرعة الطفو عشان ما يطير بسرعة كبيرة
      vel.x = Math.max(-0.5, Math.min(0.5, vel.x));
      vel.y = Math.max(-0.4, Math.min(0.4, vel.y));

      if (ref.current) {
        // دوران بيعتمد على اتجاه حركته
        const rotation = vel.x * 20 + vel.y * 10;
        ref.current.style.left = `${pos.x}%`;
        ref.current.style.top = `${pos.y}%`;
        ref.current.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
      }

      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      ref={ref}
      className="fixed z-20 pointer-events-none"
      style={{ left: '50%', top: '50%' }}
    >
      <img 
        src={astronautImg} 
        alt="astronaut" 
        className="w-24 h-28 md:w-32 md:h-36 object-contain drop-shadow-2xl" 
      />
    </div>
  );
};

export default FloatingAstronaut;
