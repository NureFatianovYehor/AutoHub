// supabaseClient.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config(); // чтобы прочитать переменные из .env

// Читаем URL и PUBLIC KEY (anon) из .env
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Ошибка: SUPABASE_URL или SUPABASE_KEY не заданы в .env");
  process.exit(1); // завершаем приложение, если секреты не найдены
}

// Создаём клиент Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = supabase;
