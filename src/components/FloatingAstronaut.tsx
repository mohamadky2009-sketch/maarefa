import { useEffect, useRef } from 'react';
import astronautImg from '@/assets/astronaut.png';

const FloatingAstronaut = () => {
  const ref = useRef<HTMLDivElement>(null);
  
  // يبدأ من منتصف الشاشة
  const posRef = useRef({ x: 50, y: 50 });
  // سرعة ثابتة ومستمرة في الاتجاهين (بدون عشوائية)
  const velRef = useRef({ x: 0.6, y: 0.4 });
  // متغير جديد مسؤول عن الدوران المستمر (مثل Among Us)
  const rotRef = useRef(0);

  useEffect(() => {
    let raf: number;
    const update = () => {
      const pos = posRef.current;
      const vel = velRef.current;

      pos.x += vel.x;
      pos.y += vel.y;

      // يرتد لما يوصل لحواف الشاشة ويستمر بحركته
      if (pos.x > 90 || pos.x < 0) vel.x *= -1;
      if (pos.y > 90 || pos.y < 0) vel.y *= -1;

      // زيادة الدوران بشكل مستمر (تقدر تزيد الرقم 1.5 لـ 3 لو بدك ياه يلف أسرع)
      rotRef.current += 1.5;

      if (ref.current) {
        ref.current.style.left = `${pos.x}%`;
        ref.current.style.top = `${pos.y}%`;
        // تطبيق الدوران المستمر مع الحركة
        ref.current.style.transform = `translate(-50%, -50%) rotate(${rotRef.current}deg)`;
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
