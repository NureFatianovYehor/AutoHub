// index.js
// ────────────────────────────────────────────────────────────────────────────────

// 1) Подключаем модули и инициализируем dotenv
const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const supabase = require('./supabaseClient');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ────────────────────────────────────────────────────────────────────────────────
// 2) Сначала объявляем все API-роуты ПЕРЕД тем, как подключать статику

// 2.1) Тестовый роут: проверяем подключение к Supabase  
// ❗Обратите внимание: здесь именно ASCII-дефис (код U+002D)  
app.get('/test-supabase', async (req, res) => {
  try {
    // Например, пробуем выбрать 1 запись из таблицы profiles
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    // Возвращаем результат выборки (может быть [] или массив с 1 объектом)
    res.json({ profiles_sample: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2.2) Получить список всех автомобилей
app.get('/cars', async (req, res) => {
  try {
    const { data, error } = await supabase.from('cars').select('*');
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2.3) Добавить новый автомобиль
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
    images
  } = req.body;

  try {
    const { data, error } = await supabase.from('cars').insert([{
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
      created_at: new Date()
    }]);
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2.4) (Опционально) Получить один автомобиль по id  
app.get('/cars/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('cars')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      return res.status(404).json({ error: 'Автомобиль не знайдено' });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2.5) (Опционально) Удалить автомобиль по id  
app.delete('/cars/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('cars')
      .delete()
      .eq('id', id);
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.json({ message: `Автомобіль з id ${id} видалено`, deleted: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────────────
// 3) После API-роутов подключаем раздачу статики из папки public
app.use(express.static(path.join(__dirname, 'public')));

// ────────────────────────────────────────────────────────────────────────────────
// 4) Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущено на http://localhost:${PORT}`);
});
