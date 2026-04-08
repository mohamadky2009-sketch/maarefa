export interface Character {
  id: string;
  name: string;
  emoji: string;
}

export const CHARACTERS: Character[] = [
  { id: 'warrior', name: 'محارب', emoji: '⚔️' },
  { id: 'wizard', name: 'ساحر', emoji: '🧙' },
  { id: 'archer', name: 'رامي', emoji: '🏹' },
  { id: 'knight', name: 'فارس', emoji: '🛡️' },
  { id: 'scholar', name: 'عالم', emoji: '📚' },
  { id: 'rogue', name: 'متسلل', emoji: '🗡️' },
];

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

export interface BattleSettings {
  questionsPerGuard: Record<string, number>;
  guardAttack: number;
  playerAttack: number;
}

export interface GameState {
  players: Player[];
  currentPlayerId: string | null;
  questions: Question[];
  shopItems: ShopItem[];
  battleSettings: BattleSettings;
}

export const PLANETS = [
  { id: 0, name: 'نبتون', emoji: '🔵', color: '#1e40af' },
  { id: 1, name: 'أورانوس', emoji: '🟢', color: '#0d9488' },
  { id: 2, name: 'زحل', emoji: '🟡', color: '#ca8a04' },
  { id: 3, name: 'المشتري', emoji: '🟠', color: '#ea580c' },
  { id: 4, name: 'المريخ', emoji: '🔴', color: '#dc2626' },
  { id: 5, name: 'الأرض', emoji: '🌍', color: '#16a34a' },
  { id: 6, name: 'الزهرة', emoji: '🌕', color: '#d97706' },
  { id: 7, name: 'عطارد', emoji: '⚫', color: '#6b7280' },
  { id: 8, name: 'الشمس', emoji: '☀️', color: '#eab308' },
];

export const ISLANDS = [
  { id: 0, name: 'جزيرة الأمل', emoji: '🏝️' },
  { id: 1, name: 'جزيرة النور', emoji: '🌟' },
  { id: 2, name: 'جزيرة الحكمة', emoji: '📖' },
  { id: 3, name: 'جزيرة الشجاعة', emoji: '🦁' },
  { id: 4, name: 'جزيرة النصر', emoji: '🏆' },
];

export const GUARDS = ['👹', '👺', '🐉', '💀', '👾'];

const DEFAULT_SHOP: ShopItem[] = [
  { id: 'remove2', name: 'حذف خيارين', emoji: '✂️', description: 'يحذف خيارين خاطئين', price: 50 },
  { id: 'skip', name: 'تخطي سؤال', emoji: '⏭️', description: 'تخطي السؤال الحالي', price: 30 },
  { id: 'hint', name: 'تلميح', emoji: '💡', description: 'يعطيك تلميحاً للإجابة', price: 20 },
  { id: 'heal', name: 'استعادة القوة', emoji: '❤️‍🩹', description: 'تستعيد كل نقاط الحياة', price: 40 },
];

const DEFAULT_BATTLE: BattleSettings = {
  questionsPerGuard: { '0': 3, '1': 3, '2': 3, '3': 3, '4': 3 },
  guardAttack: 20,
  playerAttack: 25,
};

const DEFAULT_QUESTIONS: Question[] = [
  { id: '1', planetId: 0, islandId: 0, text: 'ما إعراب كلمة "الطالبُ" في جملة: الطالبُ مجتهدٌ؟', options: ['مبتدأ مرفوع', 'خبر مرفوع', 'فاعل مرفوع', 'نائب فاعل'], correctIndex: 0, hasTimer: false },
  { id: '2', planetId: 0, islandId: 0, text: 'ما نوع الفعل "كتبَ"؟', options: ['فعل ماضٍ', 'فعل مضارع', 'فعل أمر', 'اسم فعل'], correctIndex: 0, hasTimer: false },
  { id: '3', planetId: 0, islandId: 0, text: 'ما جمع كلمة "كتاب"؟', options: ['كتب', 'كتابات', 'كتّاب', 'مكتبات'], correctIndex: 0, hasTimer: false },
  { id: '4', planetId: 0, islandId: 0, text: 'أي من التالي حرف جر؟', options: ['في', 'ثم', 'لكن', 'هل'], correctIndex: 0, hasTimer: false },
  { id: '5', planetId: 0, islandId: 1, text: 'ما المفعول به في: قرأ الطالبُ الكتابَ؟', options: ['الكتابَ', 'الطالبُ', 'قرأ', 'لا يوجد'], correctIndex: 0, hasTimer: false },
  { id: '6', planetId: 0, islandId: 1, text: 'ما علامة نصب جمع المؤنث السالم؟', options: ['الكسرة', 'الفتحة', 'الياء', 'الضمة'], correctIndex: 0, hasTimer: false },
  { id: '7', planetId: 0, islandId: 1, text: 'أي الجمل التالية تحتوي على فعل مضارع مرفوع؟', options: ['يكتبُ الدرسَ', 'لن يكتبَ', 'لم يكتبْ', 'اكتبْ'], correctIndex: 0, hasTimer: false },
  { id: '8', planetId: 0, islandId: 2, text: 'ما إعراب "مجتهدٌ" في: الطالبُ مجتهدٌ؟', options: ['خبر مرفوع', 'مبتدأ', 'حال', 'نعت'], correctIndex: 0, hasTimer: false },
  { id: '9', planetId: 0, islandId: 2, text: 'ما نوع "لا" في: لا تكذبْ؟', options: ['لا ناهية', 'لا نافية', 'لا النافية للجنس', 'لا العاطفة'], correctIndex: 0, hasTimer: false },
  { id: '10', planetId: 0, islandId: 2, text: 'ما مثنى كلمة "معلم"؟', options: ['معلمان', 'معلمون', 'معلمين', 'معالم'], correctIndex: 0, hasTimer: false },
  { id: '11', planetId: 0, islandId: 3, text: 'أي الأفعال التالية فعل أمر؟', options: ['اجلسْ', 'جلسَ', 'يجلسُ', 'جالس'], correctIndex: 0, hasTimer: false },
  { id: '12', planetId: 0, islandId: 3, text: 'ما الحركة الإعرابية للفاعل؟', options: ['الرفع', 'النصب', 'الجر', 'الجزم'], correctIndex: 0, hasTimer: false },
  { id: '13', planetId: 0, islandId: 3, text: '"إنّ" تدخل على الجملة الاسمية وتنصب:', options: ['المبتدأ', 'الخبر', 'الفعل', 'الحال'], correctIndex: 0, hasTimer: false },
  { id: '14', planetId: 0, islandId: 4, text: 'ما الاسم الموصول المناسب: جاء __ فاز؟', options: ['الذي', 'التي', 'اللذان', 'اللواتي'], correctIndex: 0, hasTimer: false },
  { id: '15', planetId: 0, islandId: 4, text: 'ما نوع الجملة: "العلمُ نورٌ"؟', options: ['اسمية', 'فعلية', 'شبه جملة', 'لا شيء'], correctIndex: 0, hasTimer: false },
  { id: '16', planetId: 0, islandId: 4, text: 'ما علامة جر الاسم المفرد؟', options: ['الكسرة', 'الفتحة', 'الضمة', 'السكون'], correctIndex: 0, hasTimer: false },
];

export function loadGameState(): GameState {
  const saved = localStorage.getItem('marifa_game');
  if (saved) {
    try { return JSON.parse(saved); } catch { /* fall through */ }
  }
  return {
    players: [],
    currentPlayerId: null,
    questions: DEFAULT_QUESTIONS,
    shopItems: DEFAULT_SHOP,
    battleSettings: DEFAULT_BATTLE,
  };
}

export function saveGameState(state: GameState) {
  localStorage.setItem('marifa_game', JSON.stringify(state));
}

export function createPlayer(name: string, email: string, characterId: string): Player {
  return {
    id: crypto.randomUUID(),
    name,
    email,
    characterId,
    xp: 0,
    gold: 100,
    hp: 100,
    maxHp: 100,
    currentPlanet: 0,
    currentIsland: 0,
    unlockedPlanets: [0],
    unlockedIslands: { 0: [0] },
    banned: false,
  };
}

export function playSound(type: 'click' | 'correct' | 'wrong' | 'victory' | 'attack' | 'death') {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    switch (type) {
      case 'click':
        osc.frequency.value = 600;
        gain.gain.value = 0.1;
        osc.start(); osc.stop(ctx.currentTime + 0.08);
        break;
      case 'correct':
        osc.frequency.value = 523;
        gain.gain.value = 0.15;
        osc.start();
        osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
        osc.stop(ctx.currentTime + 0.3);
        break;
      case 'wrong':
        osc.frequency.value = 200;
        osc.type = 'sawtooth';
        gain.gain.value = 0.15;
        osc.start();
        osc.frequency.setValueAtTime(150, ctx.currentTime + 0.15);
        osc.stop(ctx.currentTime + 0.3);
        break;
      case 'victory':
        osc.frequency.value = 523;
        gain.gain.value = 0.15;
        osc.start();
        osc.frequency.setValueAtTime(659, ctx.currentTime + 0.15);
        osc.frequency.setValueAtTime(784, ctx.currentTime + 0.3);
        osc.frequency.setValueAtTime(1047, ctx.currentTime + 0.45);
        osc.stop(ctx.currentTime + 0.6);
        break;
      case 'attack':
        osc.type = 'square';
        osc.frequency.value = 150;
        gain.gain.value = 0.12;
        osc.start();
        osc.frequency.setValueAtTime(80, ctx.currentTime + 0.15);
        osc.stop(ctx.currentTime + 0.2);
        break;
      case 'death':
        osc.type = 'sawtooth';
        osc.frequency.value = 400;
        gain.gain.value = 0.15;
        osc.start();
        osc.frequency.linearRampToValueAtTime(50, ctx.currentTime + 0.8);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
        osc.stop(ctx.currentTime + 1);
        break;
    }
  } catch { /* audio not available */ }
}
