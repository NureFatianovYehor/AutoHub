const express = require('express');
const cors = require('cors');
const supabase = require('./supabaseClient'); // подключение
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('AutoHub API is running');
});

app.get('/cars', async (req, res) => {
  const { data, error } = await supabase.from('cars').select('*');
  if (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
