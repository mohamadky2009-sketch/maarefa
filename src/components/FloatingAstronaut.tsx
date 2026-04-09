import { useEffect, useRef } from 'react';
import astronautImg from '@/assets/astronaut.png';

const FloatingAstronaut = () => {
  const ref = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: 50, y: 30 });
  const velRef = useRef({ x: 0.3, y: 0.2 });

  useEffect(() => {
    let raf: number;
    const update = () => {
      const pos = posRef.current;
      const vel = velRef.current;

      // Smooth sinusoidal wandering
      pos.x += vel.x;
      pos.y += vel.y;

      // Gentle boundary bouncing
      if (pos.x > 85 || pos.x < 5) vel.x *= -1;
      if (pos.y > 80 || pos.y < 5) vel.y *= -1;

      // Add slight random drift for natural feel
      vel.x += (Math.random() - 0.5) * 0.02;
      vel.y += (Math.random() - 0.5) * 0.02;

      // Clamp velocity for smoothness
      vel.x = Math.max(-0.4, Math.min(0.4, vel.x));
      vel.y = Math.max(-0.3, Math.min(0.3, vel.y));

      if (ref.current) {
        const rotation = vel.x * 15;
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
      className="fixed z-0 pointer-events-none opacity-20"
      style={{ left: '50%', top: '30%', transition: 'none' }}
    >
      <img src={astronautImg} alt="astronaut" className="w-24 h-28 md:w-32 md:h-36 object-contain drop-shadow-lg" />
    </div>
  );
};

export default FloatingAstronaut;
