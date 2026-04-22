import express from 'express';
import fs from 'fs';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

// جلب البيانات لكل المستخدمين
app.get('/api/data', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync('database.json', 'utf8'));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قراءة ملف البيانات' });
  }
});

// تحديث البيانات (للأدمن فقط)
app.post('/api/update', (req, res) => {
  try {
    const newData = req.body;
    fs.writeFileSync('database.json', JSON.stringify(newData, null, 2));
    res.json({ message: 'تم التحديث بنجاح!' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في حفظ البيانات' });
  }
});

app.listen(3001, () => console.log('الخادم يعمل بنجاح على المنفذ 3001'));
