import pg from 'pg';

const { Pool } = pg;

let pool = null;
let initPromise = null;

const DEFAULT_STATE = {
  players: [],
  currentPlayerId: null,
  questions: [],
  shopItems: [
    { id: 'heal',  name: 'علاج فضائي', emoji: '🧪', description: 'استعادة نقاط الحياة كاملة', price: 40 },
    { id: 'boost', name: 'درع طاقة',   emoji: '🛡️', description: 'زيادة الدفاع ضد الوحوش',   price: 80 },
  ],
  battleSettings: {
    playerAttack: 50,
    guardAttack: 25,
    questionsPerGuard: {},
    heroAttack:    { hero1: 50, hero2: 55, hero3: 45 },
    monsterAttack: { monster1: 30, monster2: 25, monster3: 28, monster4: 22 },
  },
  customIslands: [],
  customIslandQuestions: {},
};

export function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set');
    }
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

export async function init() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const p = getPool();
    await p.query(`
      CREATE TABLE IF NOT EXISTS game_state (
        id INTEGER PRIMARY KEY DEFAULT 1,
        data JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT singleton CHECK (id = 1)
      )
    `);
    const { rows } = await p.query('SELECT data FROM game_state WHERE id = 1');
    if (rows.length === 0) {
      await p.query(
        'INSERT INTO game_state (id, data) VALUES (1, $1)',
        [JSON.stringify(DEFAULT_STATE)]
      );
    }
  })();
  return initPromise;
}

export async function getState() {
  await init();
  const { rows } = await getPool().query('SELECT data FROM game_state WHERE id = 1');
  return rows[0]?.data ?? DEFAULT_STATE;
}

export async function setState(data) {
  await init();
  await getPool().query(
    `INSERT INTO game_state (id, data, updated_at)
     VALUES (1, $1, NOW())
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
    [JSON.stringify(data)]
  );
}
