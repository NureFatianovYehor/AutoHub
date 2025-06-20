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
// БЛОК: приховати/показати посилання «Додати авто» для адміна
// ---------------------------------------------
const addCarLink = document.getElementById('add-car-link');
if (addCarLink) {
  addCarLink.style.display = 'none';
}
(async () => {
  try {
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return;
    }
    const { data: profileData, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profileError || !profileData) {
      return;
    }
    if (profileData.role === 'admin' && addCarLink) {
      addCarLink.style.display = 'inline-block';
    }
  } catch {
    // у разі помилки нічого не робимо, посилання залишиться прихованим
  }
})();
// ---------------------------------------------

// ---------------------------------------------
// 1) Масив для збереження всіх авто після завантаження
// ---------------------------------------------
let allCars = [];

// ---------------------------------------------
// 2) Завантажуємо список усіх авто з бекенду
//    та зберігаємо в змінну allCars
// ---------------------------------------------
async function fetchCars() {
  try {
    const res = await fetch('/cars');
    const result = await res.json();
    allCars = Array.isArray(result) ? result : result.data;
    return allCars;
  } catch (e) {
    console.error('Помилка при завантаженні списку авто:', e);
    return [];
  }
}

// ---------------------------------------------
// 3) Допоміжні: отримати першу картинку з поля images
// ---------------------------------------------
function getImageSrc(images) {
  if (!images) return 'no-image.jpg';
  if (Array.isArray(images)) {
    return images[0] || 'no-image.jpg';
  }
  if (typeof images === 'string') {
    // Спробуємо розпарсити JSON-рядок
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed) && parsed.length) {
        return parsed[0];
      }
    } catch {
      // Якщо це просто рядок з URL-ами через кому
      if (images.startsWith('http') || images.startsWith('data:image')) {
        return images.split(',')[0];
      }
    }
  }
  return 'no-image.jpg';
}

// ---------------------------------------------
// 4) Отримуємо «улюблені» car_id для поточного юзера
//    Повертає Set із car_id. Якщо не залогіненний — пустий Set.
// ---------------------------------------------
async function fetchUserFavoritesMap() {
  // 4.1) Отримуємо поточного користувача через Supabase Auth
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

  // 4.2) Завантажуємо список favorites для цього userId
  const { data, error } = await supabaseClient
    .from('favorites')
    .select('car_id')
    .eq('user_id', userId);

  if (error) {
    console.error('Не вдалося отримати favorites:', error.message);
    return new Set();
  }

  // 4.3) Створюємо Set з усіх car_id
  return new Set(data.map(row => row.car_id));
}
function truncateDescription(text, maxLength) {
  if (!text) return '';
  return text.length > maxLength ? text.slice(0, maxLength).trim() + '…' : text;
}

// ---------------------------------------------
// 5) Рендеримо список карток (з урахуванням активних «сердечок»)
// ---------------------------------------------
async function renderCars(cars) {
  const container = document.getElementById('cars-container');
  container.innerHTML = '';

  if (!cars.length) {
    container.innerHTML = '<p class="no-cars">Авто не знайдено.</p>';
    return;
  }

  // Отримуємо улюблені авто користувача
  const userFavs = await fetchUserFavoritesMap();

  // Перевіряємо, чи поточний користувач — адмін
  let isAdmin = false;
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      isAdmin = profile?.role === 'admin';
    }
  } catch (e) {
    console.warn('Не вдалося отримати роль користувача:', e);
  }

  cars.forEach(car => {
    const card = document.createElement('div');
    card.className = 'car-card bg-white rounded shadow h-full flex flex-col';

    const img = document.createElement('img');
    img.src = getImageSrc(car.images);
    img.alt = `${car.brand} ${car.model}`;
    card.appendChild(img);

    const content = document.createElement('div');
    content.className = 'car-card__content';
    content.innerHTML = `
      <div class="car-card__brand-model">
        <strong>${car.brand} ${car.model}</strong> (${car.year})
      </div>
      <div class="car-card__title">
  ${car.description ? truncateDescription(car.description, 80) : ''}
</div>

    `;

    const heart = document.createElement('div');
    heart.className = 'favorite-icon';
    if (userFavs.has(car.id)) heart.classList.add('active');
    heart.addEventListener('click', async () => {
      const { data: { user }, error: userErr } = await supabaseClient.auth.getUser();
      if (userErr || !user) {
        showAuthAlert('Щоб додати в Улюблене, будь ласка, увійдіть або зареєструйтеся.');
        return;
      }
      const userId = user.id;
      const carId = car.id;

      if (heart.classList.contains('active')) {
        const { error: delErr } = await supabaseClient
          .from('favorites')
          .delete()
          .eq('user_id', userId)
          .eq('car_id', carId);
        if (!delErr) heart.classList.remove('active');
      } else {
        const { error: insErr } = await supabaseClient
          .from('favorites')
          .insert({ user_id: userId, car_id: carId });
        if (!insErr) heart.classList.add('active');
      }
    });

    content.appendChild(heart);

    const footer = document.createElement('div');
    footer.className = 'car-card__footer';

    const price = document.createElement('div');
    price.className = 'car-card__price';
    price.textContent = `$${Number(car.price || 0).toLocaleString()}`;
    footer.appendChild(price);

    const link = document.createElement('a');
    link.className = 'car-card__button';
    link.textContent = 'Детальніше';
    link.href = `detail.html?id=${car.id}`;
    footer.appendChild(link);

    content.appendChild(footer);

    if (isAdmin) {
      const adminControls = document.createElement('div');
      adminControls.className = 'admin-controls';

      const editBtn = document.createElement('button');
      editBtn.textContent = 'Редагувати';
      editBtn.className = 'edit-btn';
      editBtn.onclick = () => {
        window.location.href = `edit.html?id=${car.id}`;
      };

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Видалити';
      deleteBtn.className = 'delete-btn';
      deleteBtn.onclick = async () => {
        if (!confirm('Ви впевнені, що хочете видалити це авто та його зображення?')) return;

        let fileName = null;
        if (typeof car.images === 'string') {
          try {
            const parts = car.images.split('/');
            fileName = parts[parts.length - 1];
          } catch (e) {
            console.warn('❗️ Помилка розбору URL зображення:', e);
          }
        }

        if (!fileName) {
          alert('❌ Неможливо витягти імʼя файлу з посилання.');
          return;
        }

        const { error: delError } = await supabaseClient
          .storage
          .from('cars')
          .remove([fileName]);

        if (delError) {
          alert('❌ Помилка при видаленні зображення: ' + delError.message);
          return;
        }

        const { error: carDeleteError } = await supabaseClient
          .from('cars')
          .delete()
          .eq('id', car.id);

        if (carDeleteError) {
          alert('❌ Помилка при видаленні машини з бази: ' + carDeleteError.message);
        } else {
          alert('✅ Автомобіль і його зображення успішно видалено');
          await fetchCars();
          await renderCars(allCars);
        }
      };

      adminControls.appendChild(editBtn);
      adminControls.appendChild(deleteBtn);
      content.appendChild(adminControls);
    }

    card.appendChild(content);
    container.appendChild(card);
  });
}



// ---------------------------------------------
// 6) Фільтрація: дружній код (додані діапазони року, "Усі" для селектів)
// ---------------------------------------------
function applyFilters() {
  const get = id => document.getElementById(id)?.value.trim().toLowerCase() || '';

  const yearFrom = document.getElementById('year_from')?.value.trim();
  const yearTo   = document.getElementById('year_to')?.value.trim();
  const priceFrom = document.getElementById('price_from')?.value.trim();
  const priceTo   = document.getElementById('price_to')?.value.trim();
  const accelerationFrom = document.getElementById('acceleration_from')?.value.trim();
  const accelerationTo   = document.getElementById('acceleration_to')?.value.trim();
  const powerFrom = document.getElementById('power_from')?.value.trim();
  const powerTo   = document.getElementById('power_to')?.value.trim();
  const selectedBrand = get('brand');
  const selectedModel = get('model');

  const filtered = allCars.filter(car => {
    if (get('body_type') && car.body_type?.toLowerCase() !== get('body_type')) return false;
    if (selectedBrand && selectedBrand !== 'усі' && car.brand?.toLowerCase() !== selectedBrand) return false;
    if (selectedBrand && selectedModel && selectedModel !== 'усі моделі' && car.model?.toLowerCase() !== selectedModel) return false;
    if (yearFrom && Number(car.year) < Number(yearFrom)) return false;
    if (yearTo && Number(car.year) > Number(yearTo)) return false;
    if (priceFrom && Number(car.price) < Number(priceFrom)) return false;
    if (priceTo && Number(car.price) > Number(priceTo)) return false;
    if (get('fuel_type') && car.fuel_type?.toLowerCase() !== get('fuel_type')) return false;
    if (get('transmission') && car.transmission?.toLowerCase() !== get('transmission')) return false;
    if (get('drive_type') && car.drive_type?.toLowerCase() !== get('drive_type')) return false;
    if (get('color') && !car.color?.toLowerCase().includes(get('color'))) return false;
    if (accelerationFrom && Number(car.acceleration) < Number(accelerationFrom)) return false;
    if (accelerationTo && Number(car.acceleration) > Number(accelerationTo)) return false;
    if (powerFrom && Number(car.power) < Number(powerFrom)) return false;
    if (powerTo && Number(car.power) > Number(powerTo)) return false;
    return true;
  });

  renderCars(filtered);
}


// ---------------------------------------------
// 7) Динамічне заповнення селектів «Марка» і «Модель»
// ---------------------------------------------
function populateSelect(select, values, defaultText) {
  select.innerHTML = '';
  const defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = defaultText;
  select.appendChild(defaultOpt);

  values.forEach(val => {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = val;
    select.appendChild(opt);
  });
}

function initDynamicFilters() {
  const brandSelect = document.getElementById('brand');
  const modelSelect = document.getElementById('model');
  const bodyTypeSelect = document.getElementById('body_type');

  // Збираємо унікальні бренди та типи кузова з allCars
  const brands = [...new Set(allCars.map(c => c.brand).filter(Boolean))];
  const bodyTypes = [...new Set(allCars.map(c => c.body_type).filter(Boolean))];

  // Заповнюємо селект «Марка» та «Тип кузова»
  populateSelect(brandSelect, brands, 'Усі');
  populateSelect(bodyTypeSelect, bodyTypes, 'Усі');

  // 🔒 Заблокуємо селект моделі, поки марка не вибрана
  modelSelect.disabled = true;
  modelSelect.innerHTML = '<option value="">Спочатку оберіть марку</option>';

  // При зміні марки — оновлюємо «Модель»
  brandSelect.addEventListener('change', () => {
    const selectedBrand = brandSelect.value;
    if (!selectedBrand || selectedBrand === 'Усі') {
      modelSelect.disabled = true;
      modelSelect.innerHTML = '<option value="">Спочатку оберіть марку</option>';
      return;
    }
    const models = [
      ...new Set(
        allCars
          .filter(c => c.brand === selectedBrand)
          .map(c => c.model)
          .filter(Boolean)
      )
    ];
    modelSelect.disabled = false;
    populateSelect(modelSelect, models, 'Усі моделі');
  });
}


// ---------------------------------------------
// 8) Показати верхнє повідомлення про потрібну авторизацію
// ---------------------------------------------
function showAuthAlert(message) {
  const alertDiv = document.getElementById('auth-alert');
  if (!alertDiv) return;
  alertDiv.textContent = message;
  alertDiv.classList.add('show');
  setTimeout(() => {
    alertDiv.classList.remove('show');
  }, 5000);
}

// ---------------------------------------------
// 9) Ініціалізація після завантаження DOM
// ---------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  // 9.1) Спершу завантажуємо всі авто
  await fetchCars();

  // 9.2) Заповнюємо динамічні селекти (Марка → Модель, Тип кузова)
  initDynamicFilters();

  // 9.3) Відразу рендеримо всі авто (без фільтрів)
  applyFilters();

  // 9.4) Додаємо обробники подій для фільтрів (change / Enter)
  document.querySelectorAll('.sidebar input, .sidebar select').forEach(el => {
    el.addEventListener('change', applyFilters);
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();       // <== Додаємо це!
        applyFilters();
      }
    });
  });
});
