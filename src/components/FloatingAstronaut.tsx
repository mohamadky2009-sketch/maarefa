import { useEffect, useRef } from 'react';
const astronautImg = '/src/assets/ui/astronaut.png';

const FloatingAstronaut = () => {
  const ref = useRef<HTMLDivElement>(null);
  
  const posRef = useRef({ x: 50, y: 50 });
  const velRef = useRef({ x: 0.2, y: 0.15 });
  const rotRef = useRef(0);

  useEffect(() => {
    let raf: number;
    const update = () => {
      const pos = posRef.current;
      const vel = velRef.current;

      pos.x += vel.x;
      pos.y += vel.y;

      // الارتداد عند الحواف
      if (pos.x > 85 || pos.x < 5) vel.x *= -1;
      if (pos.y > 80 || pos.y < 5) vel.y *= -1;

      rotRef.current += 0.5;

      if (ref.current) {
        ref.current.style.left = `${pos.x}%`;
        ref.current.style.top = `${pos.y}%`;
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
      {/* التعديل هنا: تحديد طول وعرض ثابتين ومنع الانكماش نهائياً */}
      <img 
        src={astronautImg} 
        alt="astronaut" 
        className="w-32 h-[128px] max-w-none max-h-none shrink-0 object-contain drop-shadow-2xl" 
      />
    </div>
  );
};

export default FloatingAstronaut;
