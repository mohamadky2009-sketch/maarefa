import express from 'express';
import { getState, setState, init } from './db.js';

export function createApiRouter() {
  const router = express.Router();
  router.use(express.json({ limit: '5mb' }));

  init().catch(err => console.error('DB init error:', err));

  router.get('/data', async (_req, res) => {
    try {
      const data = await getState();
      res.json(data);
    } catch (err) {
      console.error('GET /api/data error:', err);
      res.status(500).json({ error: 'Failed to load game state' });
    }
  });

  router.post('/update', async (req, res) => {
    try {
      if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({ error: 'Invalid body' });
      }
      await setState(req.body);
      res.json({ ok: true });
    } catch (err) {
      console.error('POST /api/update error:', err);
      res.status(500).json({ error: 'Failed to save game state' });
    }
  });

  return router;
}
