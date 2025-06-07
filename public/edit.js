const SUPABASE_URL = window.AUTOHUB_CONFIG?.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.AUTOHUB_CONFIG?.SUPABASE_KEY;
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const form = document.getElementById('edit-form');
let originalImageUrl = null;

async function loadCar() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) return alert('Невірний ID авто');

  const { data, error } = await supabase.from('cars').select('*').eq('id', id).single();
  if (error || !data) return alert('Авто не знайдено');

  document.getElementById('car-id').value = id;

  for (const key in data) {
    if (document.getElementById(key)) {
      document.getElementById(key).value = data[key] ?? '';
    }
  }

  if (data.images) {
    originalImageUrl = data.images;
    document.getElementById('images').value = data.images;
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('car-id').value;

  const fields = [
    'title', 'description', 'brand', 'model', 'year', 'price',
    'mileage', 'fuel_type', 'transmission', 'body_type', 'drive_type',
    'acceleration', 'max_speed', 'color', 'power'
  ];

  const updateData = {};
  fields.forEach(field => {
    updateData[field] = document.getElementById(field).value;
  });

  const fileInput = document.getElementById('image-file');
  const file = fileInput.files[0];

  if (file) {
    // Видаляємо попереднє зображення
    if (originalImageUrl && originalImageUrl.includes('/cars/')) {
      const parts = originalImageUrl.split('/');
      const fileName = parts[parts.length - 1];

      const { error: removeErr } = await supabase
        .storage
        .from('cars')
        .remove([fileName]);

      if (removeErr) {
        console.warn('⚠️ Помилка при видаленні попереднього зображення:', removeErr.message);
      }
    }

    // Завантажуємо нове зображення
    const timestamp = Date.now();
    const ext = file.name.split('.').pop().toLowerCase();
    const fileName = `car_${timestamp}.${ext}`;

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('cars')
      .upload(fileName, file);

    if (uploadError) {
      return alert('❌ Помилка при завантаженні нового зображення: ' + uploadError.message);
    }

    const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/cars/${fileName}`;
    updateData.images = imageUrl;
  } else {
    updateData.images = document.getElementById('images').value;
  }

  const { error } = await supabase.from('cars').update(updateData).eq('id', id);
  if (error) {
    alert('❌ Помилка оновлення: ' + error.message);
  } else {
    alert('✅ Авто оновлено успішно!');
    window.location.href = '/';
  }
});

loadCar();