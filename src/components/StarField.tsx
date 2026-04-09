import { useEffect, useRef } from 'react';

const StarField = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // ألوان النجوم لإعطاء واقعية وجمال أكثر
    const colors = ['255, 255, 255', '200, 220, 255', '240, 200, 255'];

    // زيادة عدد النجوم لأبعاد مختلفة
    const stars = Array.from({ length: 250 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.5,
      speed: Math.random() * 0.015 + 0.005,
      phase: Math.random() * Math.PI * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    let frame: number;
    const draw = (t: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach(s => {
        // حساب شفافية النجمة لتبدو كأنها تلمع
        const opacity = 0.2 + 0.8 * Math.abs(Math.sin(t * s.speed + s.phase));
        
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        
        // إضافة توهج خفيف للنجوم
        ctx.shadowBlur = s.r * 2;
        ctx.shadowColor = `rgba(${s.color}, ${opacity})`;
        ctx.fillStyle = `rgba(${s.color}, ${opacity})`;
        
        ctx.fill();
      });
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-slate-950">
      {/* سديم فضائي (Nebula) ملون ومتحرك ليعطي عمقاً خيالياً */}
      <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-purple-900/40 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }}></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-blue-900/30 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '10s' }}></div>
      <div className="absolute top-[20%] left-[30%] w-[50%] h-[50%] bg-indigo-900/20 rounded-full blur-[100px] mix-blend-screen"></div>

      {/* طبقة النجوم */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
    </div>
  );
};

export default StarField;
