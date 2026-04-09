import { useEffect, useState } from 'react';
import astronautImg from '@/assets/astronaut.png';

const FloatingAstronaut = () => {
  const [pos, setPos] = useState({ x: 50, y: 30 });
  const [target, setTarget] = useState({ x: 70, y: 60 });
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTarget({ x: 5 + Math.random() * 90, y: 5 + Math.random() * 90 });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setPos(p => {
        const dx = target.x - p.x;
        const dy = target.y - p.y;
        setRotation(Math.atan2(dy, dx) * (180 / Math.PI) * 0.15);
        return {
          x: p.x + dx * 0.03,
          y: p.y + dy * 0.03,
        };
      });
    }, 30);
    return () => clearInterval(interval);
  }, [target]);

  return (
    <div
      className="fixed z-0 pointer-events-none opacity-40"
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        transition: 'transform 0.3s ease-out',
      }}
    >
      <img src={astronautImg} alt="astronaut" className="w-20 h-24 md:w-28 md:h-32 object-contain drop-shadow-lg" />
    </div>
  );
};

export default FloatingAstronaut;
