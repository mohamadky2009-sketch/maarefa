// 1. تعريف الأبطال (ثلاث شخصيات باختيارات مختلفة)
export interface Character {
  id: string;
  name: string;
  folder: string; // مجلد الأنميشن اللي رتبه الـ Agent
  description: string;
}

export const CHARACTERS: Character[] = [
  { id: 'hero1', name: 'الساحر العظيم', folder: 'hero1', description: 'يستخدم السحر لهزيمة الأعداء' },
  { id: 'hero2', name: 'الملك المحارب', folder: 'hero2', description: 'قوي جداً في المواجهات المباشرة' },
  { id: 'hero3', name: 'البطل الأسطوري', folder: 'hero3', description: 'يتميز بالسرعة والمهارة العالية' },
];

// 2. تعريف اللاعب
export interface Player {
  id: string;
  name: string;
  email: string;
  characterId: string;
  xp: number;
  gold: number;
  hp: number;
  maxHp: number;
  currentPlanet: number;
  currentIsland: number;
  unlockedPlanets: number[];
  unlockedIslands: Record<number, number[]>;
  banned: boolean;
}

// 3. تعريف الكواكب الـ 9 بالترتيب الجديد (من نبتون إلى الشمس)
export const PLANETS = [
  { id: 0, name: 'نبتون', image: '/src/assets/planets/planet9.png', islandCount: 4, monster: 4, color: '#1e40af' },
  { id: 1, name: 'أورانوس', image: '/src/assets/planets/planet8.png', islandCount: 4, monster: 4, color: '#0d9488' },
  { id: 2, name: 'زحل', image: '/src/assets/planets/planet7.png', islandCount: 4, monster: 3, color: '#ca8a04' },
  { id: 3, name: 'المشتري', image: '/src/assets/planets/planet6.png', islandCount: 3, monster: 3, color: '#ea580c' },
  { id: 4, name: 'المريخ', image: '/src/assets/planets/planet5.png', islandCount: 3, monster: 3, color: '#dc2626' },
  { id: 5, name: 'الأرض', image: '/src/assets/planets/planet4.png', islandCount: 3, monster: 2, color: '#16a34a' },
  { id: 6, name: 'الزهرة', image: '/src/assets/planets/planet3.png', islandCount: 3, monster: 2, color: '#d97706' },
  { id: 7, name: 'عطارد', image: '/src/assets/planets/planet2.png', islandCount: 3, monster: 1, color: '#6b7280' },
  { id: 8, name: 'الشمس', image: '/src/assets/planets/planet1.png', islandCount: 4, monster: 1, color: '#eab308' },
];

// 4. أسماء الـ 31 جزيرة (مرتبة لتناسب مسار الرحلة الجديد)
const ISLAND_TITLES = [
  "بقعة الظلام", "رياح الصوت", "عرش تريتون", "نهاية المجرة", // نبتون
  "هاوية الميثان", "العملاق الجليدي", "جزر الكوبالت", "صدع الشمال", // أورانوس
  "حلقات الكريستال", "عاصفة السداسي", "قمر تيتان", "منجم الألماس", // زحل
  "عين الإعصار", "أحزمة الغاز", "قمر الجاذبية", // المشتري
  "رمال الصدأ", "قمة أوليمبوس", "أودية القنوات", // المريخ
  "وادي الحياة", "مرتفعات الأوكسجين", "ملاذ النجاة", // الأرض
  "ضباب الكبريت", "جبال المطر", "بركان ماعت", // الزهرة
  "فوهة الجليد", "سهول الصمت", "منحدرات المعادن", // عطارد
  "شرارة الاندماج", "قلب الهيليوم", "منطقة الإشعاع", "تاج النور" // الشمس
];

// 5. بناء نظام الجزر الـ 31 تلقائياً
export const ISLANDS = (() => {
  const islands = [];
  let islandIndex = 0;
  PLANETS.forEach((planet) => {
    for (let i = 0; i < planet.islandCount; i++) {
      islands.push({
        id: islandIndex,
        planetId: planet.id,
        name: ISLAND_TITLES[islandIndex] || `جزيرة ${islandIndex + 1}`,
        image: `/src/assets/islands/island${islandIndex + 1}.png`,
        enemyFolder: `monster${planet.monster}`, // ربط الوحش بصعوبة الكوكب
        background: "/src/assets/islands/islands-bg.png"
      });
      islandIndex++;
    }
  });
  return islands;
})();

// 6. الأنظمة المساعدة
export interface Question {
  id: string;
  planetId: number;
  islandId: number;
  text: string;
  options: string[];
  correctIndex: number;
  hasTimer: boolean;
}

export interface ShopItem {
  id: string;
  name: string;
  emoji: string;
  description: string;
  price: number;
}

export interface GameState {
  players: Player[];
  currentPlayerId: string | null;
  questions: Question[];
  shopItems: ShopItem[];
}

const DEFAULT_QUESTIONS: Question[] = [
  { id: '1', planetId: 0, islandId: 0, text: 'ما هو أبعد كوكب عن الشمس؟', options: ['نبتون', 'أورانوس', 'زحل', 'المشتري'], correctIndex: 0, hasTimer: false },
  { id: '2', planetId: 0, islandId: 0, text: 'ما هو الكوكب الذي يمتلك حلقات مذهلة؟', options: ['زحل', 'الأرض', 'المريخ', 'عطارد'], correctIndex: 0, hasTimer: false },
];

export function loadGameState(): GameState {
  const saved = localStorage.getItem('marifa_game');
  if (saved) {
    try { return JSON.parse(saved); } catch { }
  }
  return {
    players: [],
    currentPlayerId: null,
    questions: DEFAULT_QUESTIONS,
    shopItems: [
      { id: 'heal', name: 'علاج فضائي', emoji: '🧪', description: 'استعادة نقاط الحياة كاملة', price: 40 },
      { id: 'boost', name: 'درع طاقة', emoji: '🛡️', description: 'زيادة الدفاع ضد الوحوش', price: 80 }
    ],
  };
}

export function saveGameState(state: GameState) {
  localStorage.setItem('marifa_game', JSON.stringify(state));
}

export function createPlayer(name: string, email: string, characterId: string): Player {
  // جلب أول جزيرة تابعة لنبتون (البداية)
  const startIsland = ISLANDS.find(is => is.planetId === 0)?.id || 0;
  
  return {
    id: crypto.randomUUID(),
    name, email, characterId,
    xp: 0, gold: 100, hp: 100, maxHp: 100,
    currentPlanet: 0, currentIsland: startIsland,
    unlockedPlanets: [0],
    unlockedIslands: { 0: [startIsland] },
    banned: false,
  };
}

export function playSound(type: 'click' | 'correct' | 'wrong' | 'victory' | 'attack' | 'death') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    
    if (type === 'correct') {
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
    } else if (type === 'wrong') {
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(50, ctx.currentTime + 0.2);
    }
    
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) { }
}
