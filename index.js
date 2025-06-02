const express = require('express');
const cors = require('cors');
const path = require('path');
const supabase = require('./supabaseClient');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ─── Роздаємо статичні файли з папки public ──────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ─── API-роути ────────────────────────────────────────────────────────────────
// Цей роут тепер фактично ховається за публічним index.html, тому його можна перенести
// на /api або залишити, але браузер його «перекриває» статикою.
app.get('/', (req, res) => {
  res.send('AutoHub API is running');
});

// Повертає JSON-масив всіх авто
app.get('/cars', async (req, res) => {
  const { data, error } = await supabase.from('cars').select('*');
  if (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// Додає нове авто в базу
app.post('/cars', async (req, res) => {
  const {
    title,
    description,
    brand,
    model,
    year,
    price,
    mileage,
    fuel_type,
    transmission,
    images,
  } = req.body;

  const { data, error } = await supabase.from('cars').insert([
    { title, description, brand, model, year, price, mileage, fuel_type, transmission, images },
  ]);
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// Якщо знадобиться окремий роут для однієї машини:
// app.get('/cars/:id', async (req, res) => {
//   const { id } = req.params;
//   const { data, error } = await supabase.from('cars').select('*').eq('id', id).single();
//   if (error) return res.status(404).json({ error: error.message });
//   res.json(data);
// });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Сервер запущено на порту ${PORT}`));
