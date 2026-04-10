import { useState, useEffect, useMemo } from 'react';
import { useGame } from '@/context/GameContext'; 
import { ISLANDS, CHARACTERS } from '@/lib/gameState';

interface Props {
  planetId: number;
  islandId: number;
  onBack: () => void;
  onVictory: () => void;
  onDefeat: () => void;
}

type ActionState = 'idle' | 'attack' | 'hurt' | 'death';

const BattleScreen = ({ islandId, onBack, onVictory, onDefeat }: Props) => {
  const { currentPlayer } = useGame();
  
  // البحث عن البيانات الأساسية
  const island = ISLANDS.find(is => is.id === islandId);
  const heroData = CHARACTERS.find(c => c.id === currentPlayer?.characterId);

  const [heroHP, setHeroHP] = useState(100);
  const [monsterHP, setMonsterHP] = useState(100);
  const [heroAction, setHeroAction] = useState<ActionState>('idle');
  const [monsterAction, setMonsterAction] = useState<ActionState>('idle');
  const [heroDash, setHeroDash] = useState(false);
  const [showResult, setShowResult] = useState<'none' | 'correct' | 'wrong'>('none');

  // إعدادات الوحوش الدقيقة بناءً على مجلداتك
  const monsterData = useMemo(() => {
    const cycleIndex = (islandId - 1) % 4;
    const configs = [
      { id: 'm1', name: 'ساحر النار', folder: 'monster1', frames: { idle: 5, attack: 8, hurt: 3, death: 5 }, type: 'sheet' },
      { id: 'm2', name: 'جالب الموت', folder: 'monster2', frames: { idle: 8, attack: 10, hurt: 3, death: 10 }, type: 'individual' },
      { id: 'm3', name: 'سيد الظلام', folder: 'monster3', frames: { idle: 8, attack: 8, hurt: 3, death: 7 }, type: 'sheet' },
      { id: 'm4', name: 'الفارس المتمرد', folder: 'monster4', frames: { idle: 8, attack: 7, hurt: 4, death: 8 }, type: 'sheet' }
    ];
    return configs[cycleIndex];
  }, [islandId]);

  const heroFrames = useMemo(() => {
    if (heroData?.folder === 'hero1') return { idle: 8, attack: 8, hurt: 4, death: 7 };
    if (heroData?.folder === 'hero2') return { idle: 8, attack: 6, hurt: 4, death: 11 };
    return { idle: 8, attack: 8, hurt: 4, death: 6 }; // hero3
  }, [heroData]);

  // 🛡️ حماية الشاشة السوداء: إظهار رسالة خطأ واضحة بدلاً من الشاشة الفارغة
  if (!currentPlayer) return <div className="min-h-screen bg-black text-white flex items-center justify-center text-2xl">خطأ: بيانات اللاعب غير موجودة!</div>;
  if (!island) return <div className="min-h-screen bg-black text-white flex items-center justify-center text-2xl">خطأ: الجزيرة غير موجودة!</div>;
  if (!heroData) return <div className="min-h-screen bg-black text-white flex items-center justify-center text-2xl">خطأ: بيانات البطل غير موجودة!</div>;

  const handleAnswer = (index: number) => {
    if (heroAction !== 'idle' || monsterAction !== 'idle' || heroHP <= 0 || monsterHP <= 0) return;
    
    const questionData = island.question as any;
    const isCorrect = index === (questionData.correctAnswerIndex ?? questionData.correctOption ?? 0);

    if (isCorrect) executeHeroAttack();
    else executeMonsterAttack();
  };

  const executeHeroAttack = () => {
    setShowResult('correct');
    setHeroDash(true);
    
    setTimeout(() => {
      setHeroAction('attack');
      // تشغيل أنميشن الـ Hurt للوحش
      setTimeout(() => {
        setMonsterAction('hurt');
        setMonsterHP(prev => Math.max(0, prev - 50));
      }, 300);
    }, 400);

    setTimeout(() => {
      setHeroAction('idle');
      setMonsterAction('idle');
      setHeroDash(false);
      setShowResult('none');
    }, 2000); 
  };

  const executeMonsterAttack = () => {
    setShowResult('wrong');
    setMonsterAction('attack');
    
    setTimeout(() => {
      setHeroAction('hurt');
      setHeroHP(prev => Math.max(0, prev - 25));
    }, 600);

    setTimeout(() => {
      setMonsterAction('idle');
      setHeroAction('idle');
      setShowResult('none');
    }, 2000);
  };

  useEffect(() => {
    if (monsterHP <= 0) {
      setMonsterAction('death');
      setTimeout(onVictory, 2000);
    }
    if (heroHP <= 0) {
      setHeroAction('death');
      setTimeout(onDefeat, 2000);
    }
  }, [monsterHP, heroHP, onVictory, onDefeat]);

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-between p-6 overflow-hidden bg-black bg-cover bg-center transition-all duration-1000"
      style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('/src/assets/combat/monster4/islands/island${islandId}.png')` }}
    >
      {/* شريط الطاقة والأسماء */}
      <div className="w-full max-w-6xl flex justify-between items-center bg-black/70 backdrop-blur-md p-6 rounded-3xl border border-white/20 shadow-2xl">
        <div className="flex-1">
          <p className="text-cyan-400 font-bold mb-2 uppercase">{currentPlayer.name}</p>
          <div className="h-4 bg-gray-900 rounded-full overflow-hidden border border-cyan-500/30">
            <div className="h-full bg-cyan-500 transition-all duration-500" style={{ width: `${heroHP}%` }} />
          </div>
        </div>
        <div className="px-8 text-white font-black text-2xl">VS</div>
        <div className="flex-1 text-right">
          <p className="text-red-500 font-bold mb-2 uppercase">{monsterData.name}</p>
          <div className="h-4 bg-gray-900 rounded-full overflow-hidden border border-red-500/30">
            <div className="h-full bg-red-600 transition-all duration-500" style={{ width: `${monsterHP}%` }} />
          </div>
        </div>
      </div>

      {/* ساحة المعركة (البطل يسار والوحش يمين) */}
      <div className="relative w-full max-w-7xl h-[45vh] flex items-end justify-between px-10 md:px-32 pb-10">
        {/* البطل */}
        <div className={`transition-transform duration-500 ease-out ${heroDash ? 'translate-x-[200px] md:translate-x-[400px]' : 'translate-x-0'}`}>
          <DynamicSprite folder={heroData.folder} action={heroAction} frames={heroFrames} isHero={true} type="sheet" />
        </div>

        {/* الوحش */}
        <div className="relative">
          <DynamicSprite folder={monsterData.folder} action={monsterAction} frames={monsterData.frames} isHero={false} type={monsterData.type as any} />
        </div>
      </div>

      {/* لوحة السؤال */}
      <div className="w-full max-w-5xl bg-black/80 backdrop-blur-2xl border-t-4 border-cyan-500/50 rounded-t-[50px] p-8 md:p-12 shadow-2xl z-30">
        <h3 className="text-center text-2xl font-bold mb-10 text-white">{island.question.text}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {island.question.options.map((opt, i) => (
            <button key={i} onClick={() => handleAnswer(i)} className="p-5 bg-white/10 hover:bg-cyan-600 border border-white/20 rounded-2xl text-xl font-bold transition-all text-right active:scale-95">
              <span className="text-cyan-400 ml-4">{i + 1}.</span> {opt}
            </button>
          ))}
        </div>
      </div>

      <button onClick={onBack} className="absolute top-6 left-6 px-6 py-3 bg-black/60 hover:bg-red-600 rounded-full text-white font-bold transition-all border border-white/20">
        🏳️ انسحاب
      </button>

      {/* نتيجة الإجابة */}
      {showResult !== 'none' && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none bg-black/40 backdrop-blur-sm">
          <div className={`text-9xl font-black animate-bounce ${showResult === 'correct' ? 'text-green-400' : 'text-red-500'}`}>
            {showResult === 'correct' ? '🎯' : '❌'}
          </div>
        </div>
      )}
    </div>
  );
};

// محرك الأنميشن الاحترافي لمعالجة مسارات الصور
const DynamicSprite = ({ folder, action, frames, isHero, type }: any) => {
  const [frame, setFrame] = useState(1);
  const totalFrames = frames[action] || 1;

  useEffect(() => {
    setFrame(1); // العودة للفريم الأول عند تغيير الحركة
    const timer = setInterval(() => {
      setFrame(prev => (prev % totalFrames) + 1);
    }, 120);
    return () => clearInterval(timer);
  }, [action, totalFrames]);

  const getPath = () => {
    // 1. معالجة وحش 2 (إطارات منفصلة)
    if (type === 'individual') {
      const actionName = action === 'hurt' ? 'Hurt' : (action === 'idle' ? 'Idle' : (action === 'attack' ? 'Attack' : 'Death'));
      return `/src/assets/combat/${folder}/Individual Sprite/${actionName}/Bringer-of-Death_${actionName}_${frame}.png`;
    }

    // 2. معالجة باقي الشخصيات (أشرطة Sprite Sheets)
    let fileName = 'Idle.png';
    const sub = (folder === 'hero3' || folder.startsWith('monster')) ? 'Sprites/' : '';
    
    if (action === 'attack') {
      fileName = folder === 'hero2' ? 'Attack_1.png' : (folder === 'monster1' ? 'Attack.png' : 'Attack1.png');
    } else if (action === 'hurt') {
      if (folder === 'hero1' || folder === 'hero2') fileName = 'Hit.png';
      else if (folder === 'monster3') fileName = 'Take hit.png'; // حرف h صغير حسب التقرير
      else fileName = 'Take Hit.png';
    } else if (action === 'death') {
      fileName = 'Death.png';
    }
    
    return `/src/assets/combat/${folder}/${sub}${fileName}`;
  };

  const posX = ((frame - 1) / (totalFrames - 1)) * 100;

  return (
    <div 
      className={`w-64 h-64 md:w-80 md:h-80 ${!isHero ? 'scale-x-[-1]' : ''}`}
      style={{
        backgroundImage: `url('${getPath()}')`,
        backgroundSize: type === 'individual' ? 'contain' : `${totalFrames * 100}% 100%`,
        backgroundPosition: type === 'individual' ? 'center' : `${totalFrames > 1 ? posX : 0}% center`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated'
      }}
    />
  );
};

export default BattleScreen;
