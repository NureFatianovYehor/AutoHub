// === catalog.js ===

// ---------------------------------------------
// 0) Ініціалізуємо Supabase-клієнта
// ---------------------------------------------
const SUPABASE_URL = window.AUTOHUB_CONFIG?.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.AUTOHUB_CONFIG?.SUPABASE_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Не знайдено AUTOHUB_CONFIG з SUPABASE_URL / SUPABASE_KEY');
}
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------------------------------------------
// 1) Завантажуємо список усіх авто з бекенду
// ---------------------------------------------
async function loadCarsData() {
  const res = await fetch('/cars');
  const result = await res.json();
  return Array.isArray(result) ? result : result.data;
}

// ---------------------------------------------
// 2) Допоміжні: отримати першу картинку з поля images
// ---------------------------------------------
function getImage(images) {
  if (!images) return 'no-image.jpg';
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) ? parsed[0] : 'no-image.jpg';
  } catch {
    return images.split(',')[0] || 'no-image.jpg';
  }
}

function getImageSrc(images) {
  if (!images) return 'no-image.jpg';
  if (Array.isArray(images)) {
    return images[0];
  }
  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed) && parsed.length) return parsed[0];
    } catch {
      if (images.startsWith('http') || images.startsWith('data:image')) {
        return images.split(',')[0];
      }
    }
  }
  return 'no-image.jpg';
}

// ---------------------------------------------
// 3) Отримуємо “улюблені” car_id для поточного юзера
//    Повертає Set із car_id. Якщо не залогінений — пустий Set.
// ---------------------------------------------
async function fetchUserFavoritesMap() {
  // 3.1) Отримуємо поточного користувача через Supabase Auth
  let userId = null;
  try {
    const { data: { user }, error: userErr } = await supabaseClient.auth.getUser();
    if (userErr || !user) {
      // Користувач не залогінений
      return new Set();
    }
    userId = user.id;
  } catch (e) {
    console.warn('Помилка при отриманні юзера:', e);
    return new Set();
  }

  // 3.2) Завантажуємо список favorites для цього userId
  const { data, error } = await supabaseClient
    .from('favorites')
    .select('car_id')
    .eq('user_id', userId);

  if (error) {
    console.error('Не вдалося отримати favorites:', error.message);
    return new Set();
  }

  // 3.3) Створюємо Set з усіх car_id
  return new Set(data.map(row => row.car_id));
}

// ---------------------------------------------
// 4) Рендеримо список карток (з урахуванням активних «сердечок»)
// ---------------------------------------------
async function renderCars(cars) {
  const container = document.getElementById('cars-container');
  container.innerHTML = '';

  if (!cars.length) {
    container.innerHTML = '<p class="no-cars">Немає автомобілів за цим фільтром.</p>';
    return;
  }

  // 4.1) Якщо є залогінений користувач, отримуємо його favorites (id машин)
  const userFavs = await fetchUserFavoritesMap();

  cars.forEach(car => {
    // 4.2) Створюємо контейнер-картку
    const card = document.createElement('div');
    card.className = 'car-card';

    // 4.3) Додаємо зображення авто
    const img = document.createElement('img');
    img.src = getImageSrc(car.images);
    img.alt = `${car.brand} ${car.model}`;
    card.appendChild(img);

    // 4.4) Створюємо блок з контентом (CSS має position: relative у .car-card__content)
    const content = document.createElement('div');
    content.className = 'car-card__content';
    content.innerHTML = `
      <div class="car-card__brand-model"><strong>${car.brand} ${car.model}</strong> (${car.year})</div>
      <div class="car-card__title">${car.title || ''}</div>
      <div class="car-card__price">$${Number(car.price).toLocaleString()}</div>
    `;

    // 4.5) Створюємо іконку «сердечко» всередині content
    const heart = document.createElement('div');
    heart.className = 'favorite-icon';
    // Якщо машина вже у favorites, ставимо клас active
    if (userFavs.has(car.id)) {
      heart.classList.add('active');
    }

    heart.addEventListener('click', async () => {
      // 4.6) При кліку: перевіряємо, чи користувач залогінений
      const { data: { user }, error: userErr } = await supabaseClient.auth.getUser();
      if (userErr || !user) {
        // Якщо користувач не залогінений, показуємо повідомлення (а не перенаправляємо)
        showAuthAlert('Щоб додати в Улюблене, будь ласка, увійдіть або зареєструйтеся.');
        return;
      }
      const userId = user.id;
      const carId = car.id;

      // 4.7) Якщо зараз active → видаляємо з favorites, інакше додаємо
      if (heart.classList.contains('active')) {
        // Видаляємо
        const { error: delErr } = await supabaseClient
          .from('favorites')
          .delete()
          .eq('user_id', userId)
          .eq('car_id', carId);
        if (delErr) {
          console.error('Помилка видалення з favorites:', delErr.message);
          return;
        }
        heart.classList.remove('active');
      } else {
        // Додаємо
        const { error: insErr } = await supabaseClient
          .from('favorites')
          .insert({ user_id: userId, car_id: carId });
        if (insErr) {
          console.error('Помилка додавання до favorites:', insErr.message);
          return;
        }
        heart.classList.add('active');
      }
    });

    content.appendChild(heart);
    card.appendChild(content);
    container.appendChild(card);
  });
}

// ---------------------------------------------
// 5) Фільтрація: завантажуємо дані та фільтруємо
// ---------------------------------------------
async function applyFilters() {
  // 5.1) Отримуємо усі машини
  const cars = await loadCarsData();

  // 5.2) Зчитуємо значення фільтрів
  const getValue = id => document.getElementById(id).value.trim().toLowerCase();

  const filtered = cars.filter(car => {
    if (getValue('body_type') && car.body_type?.toLowerCase() !== getValue('body_type')) return false;
    if (getValue('brand') && car.brand?.toLowerCase() !== getValue('brand')) return false;
    if (getValue('model') && !car.model?.toLowerCase().includes(getValue('model'))) return false;
    if (getValue('year') && car.year?.toString() !== getValue('year')) return false;
    if (getValue('price') && car.price > Number(getValue('price'))) return false;
    if (getValue('mileage') && car.mileage > Number(getValue('mileage'))) return false;
    if (getValue('fuel_type') && car.fuel_type?.toLowerCase() !== getValue('fuel_type')) return false;
    if (getValue('transmission') && car.transmission?.toLowerCase() !== getValue('transmission')) return false;
    if (getValue('drive_type') && car.drive_type?.toLowerCase() !== getValue('drive_type')) return false;
    if (getValue('color') && !car.color?.toLowerCase().includes(getValue('color'))) return false;
    if (getValue('acceleration') && car.acceleration > Number(getValue('acceleration'))) return false;
    if (getValue('max_speed') && car.max_speed > Number(getValue('max_speed'))) return false;
    if (getValue('power') && !car.power?.toString().includes(getValue('power'))) return false;
    return true;
  });

  // 5.3) Рендеримо відфільтровані картки
  await renderCars(filtered);
}

// ---------------------------------------------
// 6) Показати верхнє повідомлення про потрібну авторизацію
// ---------------------------------------------
function showAuthAlert(message) {
  const alertDiv = document.getElementById('auth-alert');
  if (!alertDiv) return;
  alertDiv.textContent = message;
  alertDiv.classList.add('show');

  // При бажанні сховати через кілька секунд:
  setTimeout(() => {
    alertDiv.classList.remove('show');
  }, 5000); // повідомлення показано 5 секунд, а потім зникає
}

// ---------------------------------------------
// 7) Ініціалізація після завантаження DOM
// ---------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  const brandSelect = document.getElementById('brand');
  const modelSelect = document.getElementById('model');
  modelSelect.disabled = true; // поки не обрано марку

  // 7.1) Завантажуємо всі машини один раз і перший раз відображаємо весь каталог
  let allCars = [];
  allCars = await loadCarsData();
  await renderCars(allCars);

  // 7.2) При зміні марки підвантажуємо новий список моделей
  brandSelect.addEventListener('change', () => {
    const selectedBrand = brandSelect.value;
    modelSelect.innerHTML = '';
    if (!selectedBrand) {
      modelSelect.disabled = true;
      return;
    }
    const models = new Set(
      allCars
        .filter(car => car.brand === selectedBrand)
        .map(car => car.model)
    );
    modelSelect.disabled = false;
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Усі моделі';
    modelSelect.appendChild(defaultOption);
    models.forEach(m => {
      const option = document.createElement('option');
      option.value = m;
      option.textContent = m;
      modelSelect.appendChild(option);
    });
  });

  // 7.3) Додаємо глобальну функцію, щоб у HTML вона викликалась кнопкою «Пошук»
  window.applyFilters = applyFilters;
});
