import { useEffect, useRef } from 'react';
import rocketImg from '@/assets/rocket.png';

const FloatingRocket = () => {
  const ref = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: 80, y: 70 });
  const velRef = useRef({ x: -0.25, y: -0.15 });

  useEffect(() => {
    let raf: number;
    const update = () => {
      const pos = posRef.current;
      const vel = velRef.current;

      pos.x += vel.x;
      pos.y += vel.y;

      if (pos.x > 90 || pos.x < 5) vel.x *= -1;
      if (pos.y > 85 || pos.y < 5) vel.y *= -1;

      vel.x += (Math.random() - 0.5) * 0.015;
      vel.y += (Math.random() - 0.5) * 0.015;

      vel.x = Math.max(-0.35, Math.min(0.35, vel.x));
      vel.y = Math.max(-0.25, Math.min(0.25, vel.y));

      if (ref.current) {
        const angle = Math.atan2(vel.y, vel.x) * (180 / Math.PI) + 90;
        ref.current.style.left = `${pos.x}%`;
        ref.current.style.top = `${pos.y}%`;
        ref.current.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
      }

      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      ref={ref}
      className="fixed z-0 pointer-events-none opacity-50"
      style={{ left: '80%', top: '70%' }}
    >
      <img src={rocketImg} alt="rocket" className="w-14 h-20 md:w-18 md:h-24 object-contain drop-shadow-lg" />
    </div>
  );
};

export default FloatingRocket;
