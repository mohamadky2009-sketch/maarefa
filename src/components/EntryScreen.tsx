import { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { CHARACTERS, createPlayer, playSound } from '@/lib/gameState';
import StarField from './StarField';
import FloatingAstronaut from './FloatingAstronaut';
import FloatingRocket from './FloatingRocket';
import AdminLoginModal from './AdminLoginModal';

const getHeroIdlePath = (folder: string): string => {
  if (folder === 'hero3') return `/src/assets/combat/${folder}/Sprites/Idle.png`;
  return `/src/assets/combat/${folder}/Idle.png`;
};

const HeroSelectionCard = ({ character, isSelected, onClick }: any) => {
  return (
    <div
      onClick={onClick}
      className={`relative cursor-pointer p-4 rounded-2xl transition-all duration-300 border-2 ${
        isSelected
          ? 'bg-yellow-500/20 border-yellow-500 scale-105 shadow-[0_0_30px_rgba(234,179,8,0.4)]'
          : 'bg-white/5 border-transparent hover:bg-white/10 hover:scale-105'
      }`}
    >
      <div className="w-24 h-24 md:w-32 md:h-32 mx-auto">
        <img
          src={getHeroIdlePath(character.folder)}
          alt={character.name}
          className="w-full h-full object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `/src/assets/combat/${character.folder}/Idle.png`;
          }}
        />
      </div>
      <h3 className={`text-center mt-2 font-bold text-xs md:text-sm ${isSelected ? 'text-yellow-500' : 'text-white'}`}>
        {character.name}
      </h3>
    </div>
  );
};

const EntryScreen = ({ onAdmin }: { onAdmin: () => void }) => {
  const { updatePlayer } = useGame();
  const [name, setName] = useState('');
  const [selectedHero, setSelectedHero] = useState(CHARACTERS[0].id);
  const [showAdmin, setShowAdmin] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const handleStart = () => {
    if (!name.trim()) {
      playSound('wrong');
      alert('يا بطل، اكتب اسمك أولاً!');
      return;
    }

    playSound('victory');
    setIsStarting(true);

    const newPlayer = createPlayer(name, `${name}@marifa.com`, selectedHero);

    setTimeout(() => {
      updatePlayer(newPlayer);
    }, 800);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black text-white">
      <StarField />
      <FloatingAstronaut />
      <FloatingRocket />

      <div className="relative z-10 w-full max-w-4xl px-4 flex flex-col items-center">

        <div className="text-center mb-8">
          <h1 className="text-7xl md:text-9xl font-black italic tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
            MAARE<span className="text-yellow-500">FA</span>
          </h1>
          <div className="h-1 w-32 bg-yellow-500 mx-auto mt-2 rounded-full shadow-[0_0_10px_#eab308]" />
          <p className="mt-4 text-blue-400 font-bold tracking-[0.4em] text-[10px] md:text-xs uppercase">
            Mission: Neptune to the Sun
          </p>
        </div>

        <div className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-[40px] p-8 md:p-12 shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

            <div className="space-y-4">
              <h2 className="text-xl font-bold text-center md:text-right mb-6">اختر بطلك:</h2>
              <div className="grid grid-cols-3 gap-3">
                {CHARACTERS.map((char) => (
                  <HeroSelectionCard
                    key={char.id}
                    character={char}
                    isSelected={selectedHero === char.id}
                    onClick={() => { playSound('click'); setSelectedHero(char.id); }}
                  />
                ))}
              </div>
              <p className="text-[10px] text-gray-400 text-center italic mt-4">
                * كل بطل يمتلك حركات قتالية فريدة ستراها داخل الجزر
              </p>
            </div>

            <div className="flex flex-col gap-6">
              <div className="space-y-3">
                <label className="text-blue-300 text-xs font-bold block text-right ml-2">
                  اسم رائد الفضاء:
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                  placeholder="ادخل اسمك هنا..."
                  className="w-full bg-white/10 border border-white/20 h-14 text-center text-xl text-white rounded-2xl focus:border-yellow-500 focus:outline-none transition-all placeholder:text-white/30 px-4"
                />
              </div>

              <button
                onClick={handleStart}
                disabled={isStarting}
                className="h-16 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-70 text-black font-black text-2xl rounded-2xl shadow-[0_0_40px_rgba(234,179,8,0.3)] active:scale-95 transition-all"
              >
                {isStarting ? 'جاري تجهيز الصاروخ...' : 'انطلق للمجرات 🚀'}
              </button>

              <button
                onClick={() => { playSound('click'); setShowAdmin(true); }}
                className="text-[10px] text-gray-600 hover:text-blue-400 transition-colors mt-2"
              >
                🔐 لوحة التحكم (Admin)
              </button>
            </div>

          </div>
        </div>
      </div>

      {showAdmin && <AdminLoginModal onClose={() => setShowAdmin(false)} onSuccess={onAdmin} />}
    </div>
  );
};

export default EntryScreen;
