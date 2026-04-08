import { useEffect, useState } from 'react';

const FloatingAstronaut = () => {
  const [pos, setPos] = useState({ x: 50, y: 30 });
  const [target, setTarget] = useState({ x: 70, y: 60 });

  useEffect(() => {
    const interval = setInterval(() => {
      setTarget({ x: 10 + Math.random() * 80, y: 10 + Math.random() * 80 });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setPos(p => ({
        x: p.x + (target.x - p.x) * 0.02,
        y: p.y + (target.y - p.y) * 0.02,
      }));
    }, 50);
    return () => clearInterval(interval);
  }, [target]);

  return (
    <div
      className="fixed text-4xl md:text-6xl z-0 pointer-events-none opacity-30 transition-transform"
      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
    >
      🧑‍🚀
    </div>
  );
};

export default FloatingAstronaut;
