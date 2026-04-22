// ===================================================================
// 1. الشخصيات
// ===================================================================
export interface Character {
  id: string;
  name: string;
  folder: string;
  description: string;
}

export const CHARACTERS: Character[] = [
  { id: 'hero1', name: 'الساحر العظيم',   folder: 'hero1', description: 'يستخدم السحر لهزيمة الأعداء' },
  { id: 'hero2', name: 'الملك المحارب',   folder: 'hero2', description: 'قوي جداً في المواجهات المباشرة' },
  { id: 'hero3', name: 'البطل الأسطوري',  folder: 'hero3', description: 'يتميز بالسرعة والمهارة العالية' },
];

// ===================================================================
// 2. اللاعب
// ===================================================================
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

// ===================================================================
// 3. الكواكب (9 كواكب من نبتون إلى الشمس)
// ===================================================================
export interface Planet {
  id: number;
  name: string;
  image: string;
  islandCount: number;
  monster: number;
  color: string;
}

export const PLANETS: Planet[] = [
  { id: 0, name: 'نبتون',    image: '/planets/planet-neptune.png',  islandCount: 4, monster: 4, color: '#1e40af' },
  { id: 1, name: 'أورانوس', image: '/planets/planet-uranus.png',   islandCount: 4, monster: 4, color: '#0d9488' },
  { id: 2, name: 'زحل',     image: '/planets/planet-saturn.png',   islandCount: 4, monster: 3, color: '#ca8a04' },
  { id: 3, name: 'المشتري', image: '/planets/planet-jupiter.png',  islandCount: 3, monster: 3, color: '#ea580c' },
  { id: 4, name: 'المريخ',  image: '/planets/planet-mars.png',     islandCount: 3, monster: 3, color: '#dc2626' },
  { id: 5, name: 'الأرض',   image: '/planets/planet-earth.png',    islandCount: 3, monster: 2, color: '#16a34a' },
  { id: 6, name: 'الزهرة',  image: '/planets/planet-venus.png',    islandCount: 3, monster: 2, color: '#d97706' },
  { id: 7, name: 'عطارد',   image: '/planets/planet-mercury.png',  islandCount: 3, monster: 1, color: '#6b7280' },
  { id: 8, name: 'الشمس',   image: '/planets/planet-sun.png',      islandCount: 4, monster: 1, color: '#eab308' },
];

// ===================================================================
// 4. السؤال المدمج في كل جزيرة
// ===================================================================
export interface IslandQuestion {
  text: string;
  options: string[];
  correctIndex: number;
}

// ===================================================================
// 5. الجزر (31 جزيرة — مع سؤال نحوي عربي لكل جزيرة)
// ===================================================================
export interface Island {
  id: number;
  planetId: number;
  name: string;
  image: string;
  enemyFolder: string;
  background: string;
  question: IslandQuestion;
}

const RAW_ISLANDS: Array<Omit<Island, 'image' | 'background'>> = [
  // ── نبتون (0) ──────────────────────────────────────────────
  {
    id: 0, planetId: 0, name: 'بقعة الظلام', enemyFolder: 'monster4',
    question: {
      text: 'ما الفاعل في الجملة: "كتبَ الطالبُ الدرسَ"؟',
      options: ['الطالبُ', 'الدرسَ', 'كتبَ', 'القلمَ'],
      correctIndex: 0,
    },
  },
  {
    id: 1, planetId: 0, name: 'رياح الصوت', enemyFolder: 'monster4',
    question: {
      text: 'ما المفعول به في: "شربَ الطفلُ اللبنَ"؟',
      options: ['اللبنَ', 'الطفلُ', 'شربَ', 'الكوبَ'],
      correctIndex: 0,
    },
  },
  {
    id: 2, planetId: 0, name: 'عرش تريتون', enemyFolder: 'monster4',
    question: {
      text: 'ما المبتدأ في الجملة: "العلمُ نورٌ"؟',
      options: ['العلمُ', 'نورٌ', 'الجهلُ', 'ظلامٌ'],
      correctIndex: 0,
    },
  },
  {
    id: 3, planetId: 0, name: 'نهاية المجرة', enemyFolder: 'monster4',
    question: {
      text: 'ما الخبر في الجملة: "القمرُ جميلٌ"؟',
      options: ['جميلٌ', 'القمرُ', 'الليلُ', 'مضيءٌ'],
      correctIndex: 0,
    },
  },

  // ── أورانوس (1) ─────────────────────────────────────────────
  {
    id: 4, planetId: 1, name: 'هاوية الميثان', enemyFolder: 'monster4',
    question: {
      text: 'في "قرأتُ كتاباً مفيداً"، ما الكلمة المنعوتة؟',
      options: ['كتاباً', 'مفيداً', 'قرأتُ', 'دروساً'],
      correctIndex: 0,
    },
  },
  {
    id: 5, planetId: 1, name: 'العملاق الجليدي', enemyFolder: 'monster4',
    question: {
      text: 'في "بيتُ الجارِ"، ما المضاف إليه؟',
      options: ['الجارِ', 'بيتُ', 'كبيرٌ', 'قريبٌ'],
      correctIndex: 0,
    },
  },
  {
    id: 6, planetId: 1, name: 'جزر الكوبالت', enemyFolder: 'monster4',
    question: {
      text: 'أيٌّ من الكلمات التالية حرف جر؟',
      options: ['في', 'كتبَ', 'الولدُ', 'جميلٌ'],
      correctIndex: 0,
    },
  },
  {
    id: 7, planetId: 1, name: 'صدع الشمال', enemyFolder: 'monster4',
    question: {
      text: 'ما إعراب الاسم الذي يقع بعد حرف الجر؟',
      options: ['مجرور', 'مرفوع', 'منصوب', 'مبني على السكون'],
      correctIndex: 0,
    },
  },

  // ── زحل (2) ─────────────────────────────────────────────────
  {
    id: 8, planetId: 2, name: 'حلقات الكريستال', enemyFolder: 'monster3',
    question: {
      text: 'أيٌّ من هذه الأفعال فعلٌ ماضٍ؟',
      options: ['كتبَ', 'يكتبُ', 'اكتُبْ', 'كاتبٌ'],
      correctIndex: 0,
    },
  },
  {
    id: 9, planetId: 2, name: 'عاصفة السداسي', enemyFolder: 'monster3',
    question: {
      text: 'ما العلامة التي تدل على أن الفعل ماضٍ؟',
      options: ['قبوله تاء التأنيث الساكنة', 'السين وسوف', 'نون التوكيد', 'همزة الوصل'],
      correctIndex: 0,
    },
  },
  {
    id: 10, planetId: 2, name: 'قمر تيتان', enemyFolder: 'monster3',
    question: {
      text: 'أيٌّ من الأفعال التالية مضارعٌ؟',
      options: ['يذهبُ', 'ذهبَ', 'اذهَبْ', 'ذهوبٌ'],
      correctIndex: 0,
    },
  },
  {
    id: 11, planetId: 2, name: 'منجم الألماس', enemyFolder: 'monster3',
    question: {
      text: 'فعل الأمر الصحيح يُبنى على ...؟',
      options: ['السكون', 'الفتحة', 'الضمة', 'الكسرة'],
      correctIndex: 0,
    },
  },

  // ── المشتري (3) ──────────────────────────────────────────────
  {
    id: 12, planetId: 3, name: 'عين الإعصار', enemyFolder: 'monster3',
    question: {
      text: 'ما نوع الضمير في "هو يلعب"؟',
      options: ['ضمير منفصل', 'ضمير متصل', 'ضمير مستتر', 'لا شيء'],
      correctIndex: 0,
    },
  },
  {
    id: 13, planetId: 3, name: 'أحزمة الغاز', enemyFolder: 'monster3',
    question: {
      text: 'ما حرف العطف في: "جاء علي وخالد"؟',
      options: ['الواو', 'جاء', 'علي', 'خالد'],
      correctIndex: 0,
    },
  },
  {
    id: 14, planetId: 3, name: 'قمر الجاذبية', enemyFolder: 'monster3',
    question: {
      text: 'البدل هو اسم يأتي بعد اسم آخر ليوضحه، فأيٌّ من التالي صحيح؟',
      options: ['جاء محمدٌ أخوك', 'الولدُ مجتهدٌ', 'في البيتِ', 'كتبَ يكتبُ'],
      correctIndex: 0,
    },
  },

  // ── المريخ (4) ───────────────────────────────────────────────
  {
    id: 15, planetId: 4, name: 'رمال الصدأ', enemyFolder: 'monster3',
    question: {
      text: 'ما إعراب "مسرعاً" في: "جاء الطالبُ مسرعاً"؟',
      options: ['حال منصوب', 'مفعول به', 'نعت', 'خبر'],
      correctIndex: 0,
    },
  },
  {
    id: 16, planetId: 4, name: 'قمة أوليمبوس', enemyFolder: 'monster3',
    question: {
      text: 'ما المفعول المطلق في: "سافرَ سفراً طويلاً"؟',
      options: ['سفراً', 'طويلاً', 'سافرَ', 'بعيداً'],
      correctIndex: 0,
    },
  },
  {
    id: 17, planetId: 4, name: 'أودية القنوات', enemyFolder: 'monster3',
    question: {
      text: 'ما التمييز في: "عندي عشرون كتاباً"؟',
      options: ['كتاباً', 'عشرون', 'عندي', 'تلميذاً'],
      correctIndex: 0,
    },
  },

  // ── الأرض (5) ────────────────────────────────────────────────
  {
    id: 18, planetId: 5, name: 'وادي الحياة', enemyFolder: 'monster2',
    question: {
      text: 'كيف يُرفع المثنى في اللغة العربية؟',
      options: ['بالألف والنون', 'بالواو والنون', 'بالياء والنون', 'بالضمة'],
      correctIndex: 0,
    },
  },
  {
    id: 19, planetId: 5, name: 'مرتفعات الأوكسجين', enemyFolder: 'monster2',
    question: {
      text: 'ما علامة رفع جمع المذكر السالم؟',
      options: ['الواو والنون', 'الألف والتاء', 'الضمة', 'الألف والنون'],
      correctIndex: 0,
    },
  },
  {
    id: 20, planetId: 5, name: 'ملاذ النجاة', enemyFolder: 'monster2',
    question: {
      text: 'ما علامة نصب جمع المؤنث السالم؟',
      options: ['الكسرة نيابةً عن الفتحة', 'الفتحة', 'الياء', 'الألف'],
      correctIndex: 0,
    },
  },

  // ── الزهرة (6) ───────────────────────────────────────────────
  {
    id: 21, planetId: 6, name: 'ضباب الكبريت', enemyFolder: 'monster2',
    question: {
      text: 'أيٌّ من هذه الكلمات جمع تكسير؟',
      options: ['رجالٌ', 'مسلمون', 'مسلماتٌ', 'رجلان'],
      correctIndex: 0,
    },
  },
  {
    id: 22, planetId: 6, name: 'جبال المطر', enemyFolder: 'monster2',
    question: {
      text: 'أيٌّ من هذه الكلمات اسم منقوص؟',
      options: ['القاضي', 'الكتابُ', 'المدرسةُ', 'الولدُ'],
      correctIndex: 0,
    },
  },
  {
    id: 23, planetId: 6, name: 'بركان ماعت', enemyFolder: 'monster2',
    question: {
      text: 'الاسم المقصور هو الاسم الذي آخره ...؟',
      options: ['ألف لازمة', 'ياء لازمة', 'واو لازمة', 'تاء مربوطة'],
      correctIndex: 0,
    },
  },

  // ── عطارد (7) ────────────────────────────────────────────────
  {
    id: 24, planetId: 7, name: 'فوهة الجليد', enemyFolder: 'monster1',
    question: {
      text: 'أيٌّ من هذه الكلمات ممنوعة من الصرف؟',
      options: ['أحمدُ', 'كتابٌ', 'ولدٌ', 'مدرسةٌ'],
      correctIndex: 0,
    },
  },
  {
    id: 25, planetId: 7, name: 'سهول الصمت', enemyFolder: 'monster1',
    question: {
      text: 'ما أنواع التوكيد في اللغة العربية؟',
      options: ['لفظي ومعنوي', 'اسمي وفعلي', 'مرفوع ومنصوب', 'مفرد وجمع'],
      correctIndex: 0,
    },
  },
  {
    id: 26, planetId: 7, name: 'منحدرات المعادن', enemyFolder: 'monster1',
    question: {
      text: 'أيٌّ من هذه الكلمات نكرة؟',
      options: ['كتابٌ', 'الكتابُ', 'هذا', 'محمدٌ'],
      correctIndex: 0,
    },
  },

  // ── الشمس (8) ─────────────────────────────────────────────────
  {
    id: 27, planetId: 8, name: 'شرارة الاندماج', enemyFolder: 'monster1',
    question: {
      text: 'ما الاسم الموصول المستخدم للمفرد المذكر؟',
      options: ['الذي', 'التي', 'الذين', 'اللواتي'],
      correctIndex: 0,
    },
  },
  {
    id: 28, planetId: 8, name: 'قلب الهيليوم', enemyFolder: 'monster1',
    question: {
      text: 'ما اسم الإشارة للمفرد المذكر البعيد؟',
      options: ['ذلك', 'هذا', 'هؤلاء', 'تلك'],
      correctIndex: 0,
    },
  },
  {
    id: 29, planetId: 8, name: 'منطقة الإشعاع', enemyFolder: 'monster1',
    question: {
      text: 'أيٌّ من التالية ضمير متصل؟',
      options: ['كَ في "كتابُك"', 'هو', 'أنا', 'هم'],
      correctIndex: 0,
    },
  },
  {
    id: 30, planetId: 8, name: 'تاج النور', enemyFolder: 'monster1',
    question: {
      text: 'ما الإعراب الكامل لـ"الطالبُ" في: "نجحَ الطالبُ"؟',
      options: ['فاعل مرفوع بالضمة', 'مبتدأ مرفوع', 'مفعول به منصوب', 'خبر مرفوع'],
      correctIndex: 0,
    },
  },
];

export const ISLANDS: Island[] = RAW_ISLANDS.map((isl) => ({
  ...isl,
  image: `/combat/monster4/islands/island${isl.id + 1}.png`,
  background: `/combat/monster4/islands/island${isl.id + 1}.png`,
}));

// ===================================================================
// 6. السؤال (للأسئلة المضافة من لوحة الأدمن)
// ===================================================================
export interface Question {
  id: string;
  planetId: number;
  islandId: number;
  text: string;
  options: string[];
  correctIndex: number;
  hasTimer: boolean;
}

// ===================================================================
// 7. المتجر
// ===================================================================
export interface ShopItem {
  id: string;
  name: string;
  emoji: string;
  description: string;
  price: number;
}

// ===================================================================
// 8. إعدادات القتال
// ===================================================================
export interface BattleSettings {
  playerAttack: number;
  guardAttack: number;
  questionsPerGuard: Record<string, number>;
  heroAttack: Record<string, number>;
  monsterAttack: Record<string, number>;
}

export const MONSTER_NAMES: Record<string, string> = {
  monster1: 'ساحر النار',
  monster2: 'جالب الموت',
  monster3: 'سيد الظلام',
  monster4: 'الفارس المتمرد',
};

// ===================================================================
// 9. حالة اللعبة الكاملة
// ===================================================================
export interface GameState {
  players: Player[];
  currentPlayerId: string | null;
  questions: Question[];
  shopItems: ShopItem[];
  battleSettings: BattleSettings;
  customIslands: Island[];
  customIslandQuestions: Record<number, IslandQuestion[]>;
}

// ===================================================================
// 10. تحميل / حفظ الحالة
// ===================================================================
const DEFAULT_HERO_ATTACK: Record<string, number> = {
  hero1: 50,
  hero2: 55,
  hero3: 45,
};

const DEFAULT_MONSTER_ATTACK: Record<string, number> = {
  monster1: 30,
  monster2: 25,
  monster3: 28,
  monster4: 22,
};

const DEFAULT_BATTLE_SETTINGS: BattleSettings = {
  playerAttack: 50,
  guardAttack: 25,
  questionsPerGuard: {},
  heroAttack: { ...DEFAULT_HERO_ATTACK },
  monsterAttack: { ...DEFAULT_MONSTER_ATTACK },
};

export function loadGameState(): GameState {
  const saved = localStorage.getItem('marifa_game');
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as GameState;
      const bs = parsed.battleSettings ?? DEFAULT_BATTLE_SETTINGS;
      return {
        ...parsed,
        battleSettings: {
          ...DEFAULT_BATTLE_SETTINGS,
          ...bs,
          heroAttack: { ...DEFAULT_HERO_ATTACK, ...(bs.heroAttack ?? {}) },
          monsterAttack: { ...DEFAULT_MONSTER_ATTACK, ...(bs.monsterAttack ?? {}) },
          questionsPerGuard: bs.questionsPerGuard ?? {},
        },
        customIslands: parsed.customIslands ?? [],
        customIslandQuestions: parsed.customIslandQuestions ?? {},
      };
    } catch { }
  }
  return {
    players: [],
    currentPlayerId: null,
    questions: [],
    shopItems: [
      { id: 'heal',  name: 'علاج فضائي', emoji: '🧪', description: 'استعادة نقاط الحياة كاملة', price: 40 },
      { id: 'boost', name: 'درع طاقة',   emoji: '🛡️', description: 'زيادة الدفاع ضد الوحوش',   price: 80 },
    ],
    battleSettings: DEFAULT_BATTLE_SETTINGS,
    customIslands: [],
    customIslandQuestions: {},
  };
}

export function saveGameState(state: GameState) {
  localStorage.setItem('marifa_game', JSON.stringify(state));
}

// ===================================================================
// 11. إنشاء لاعب جديد
// ===================================================================
export function createPlayer(name: string, email: string, characterId: string): Player {
  const startIsland = ISLANDS.find(is => is.planetId === 0)?.id ?? 0;
  return {
    id: crypto.randomUUID(),
    name, email, characterId,
    xp: 0, gold: 100, hp: 100, maxHp: 100,
    currentPlanet: 0,
    currentIsland: startIsland,
    unlockedPlanets: [0],
    unlockedIslands: { 0: [startIsland] },
    banned: false,
  };
}

// ===================================================================
// 12. الأصوات
// ===================================================================
export function playSound(type: 'click' | 'correct' | 'wrong' | 'victory' | 'attack' | 'death') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    if (type === 'correct' || type === 'victory') {
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
    } else if (type === 'wrong' || type === 'death') {
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(60, ctx.currentTime + 0.25);
    } else {
      osc.frequency.setValueAtTime(440, ctx.currentTime);
    }

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (_) { }
}
