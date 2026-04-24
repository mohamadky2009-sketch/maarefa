import express from 'express';
import fs from 'fs';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

// 1. روابط البيانات
app.get('/api/data', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync('database.json', 'utf8'));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Error reading database' });
  }
});

app.post('/api/update', (req, res) => {
  try {
    fs.writeFileSync('database.json', JSON.stringify(req.body, null, 2));
    res.json({ message: 'Success' });
  } catch (err) {
    res.status(500).json({ error: 'Error saving database' });
  }
});

// 2. خدمة الملفات الثابتة
app.use(express.static(path.join(__dirname, 'dist')));

// 3. الحل القاطع: استخدام Regex بدلاً من نص لتجنب PathError
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = 5000;
app.listen(PORT, () => console.log('✅ Server is LIVE on port ' + PORT));
