// detail.js
document.addEventListener('DOMContentLoaded', () => {
    // 1) Ініціалізуємо Supabase
    const SUPABASE_URL      = window.AUTOHUB_CONFIG?.SUPABASE_URL;
    const SUPABASE_ANON_KEY = window.AUTOHUB_CONFIG?.SUPABASE_KEY;
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('Не знайдено AUTOHUB_CONFIG з SUPABASE_URL / SUPABASE_KEY');
      return;
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

    // 2) Парсимо id із query string: detail.html?id=<car_id>
    const params = new URLSearchParams(window.location.search);
    const carId = params.get('id');
    const container = document.getElementById('car-detail-container');

    if (!carId) {
      container.innerHTML = '<p class="error">Невірний запит: не вказано ідентифікатор машини.</p>';
      return;
    }

    // 3) Функція, яка завантажує одну машину за id і рендерить її
    async function loadCarById(id) {
      // 3.1) Виводимо повідомлення “Завантаження…”
      container.innerHTML = '<p class="loading">Завантаження... Будь ласка, зачекайте.</p>';

      try {
        const { data: car, error: carError } = await supabaseClient
          .from('cars')
          .select('*')
          .eq('id', id)
          .single();

        if (carError || !car) {
          container.innerHTML = `<p class="error">Не вдалося знайти машину з таким ідентифікатором.</p>`;
          console.error(carError);
          return;
        }

        // 3.2) Рендеримо отримані дані
        renderCarDetail(car);
      } catch (e) {
        container.innerHTML = `<p class="error">Сталася помилка при завантаженні даних. Спробуйте пізніше.</p>`;
        console.error(e);
      }
    }

    // 4) Допоміжна: отримуємо першу картинку (як у вас зберігаються масиви/рядки)
    function getFirstImage(images) {
      if (!images) return 'no-image.jpg';
      // Якщо строка — пробуємо JSON.parse
      if (typeof images === 'string') {
        try {
          const parsed = JSON.parse(images);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed[0];
          }
        } catch {
          // Якщо JSON не парситься, можливо це “url1,url2,...”
          const parts = images.split(',');
          if (parts.length > 0) return parts[0].trim();
        }
      }
      // Якщо передали масив напряму (викликаючи через JS-інтерфейс)
      if (Array.isArray(images) && images.length > 0) {
        return images[0];
      }
      return 'no-image.jpg';
    }

    // 5) Рендеримо детальну інформацію
    async function renderCarDetail(car) {
      // 5.1) Перевіримо, чи користувач уже додав цю машину в улюблені
      let isFavorite = false;
      try {
        const { data: { user }, error: userErr } = await supabaseClient.auth.getUser();
        if (user && !userErr) {
          const { data: favRows, error: favErr } = await supabaseClient
            .from('favorites')
            .select('car_id')
            .eq('user_id', user.id)
            .eq('car_id', car.id)
            .single();
          if (!favErr && favRows) {
            isFavorite = true;
          }
        }
      } catch (e) {
        console.warn('Не вдалося перевірити favorites:', e);
      }

      // 5.2) Формуємо HTML
      // Для простоти використовуємо шаблонні рядки
      const html = `
        <div class="car-detail-container" style="position: relative;">
          <!-- Велике зображення -->
          <img 
            src="${getFirstImage(car.images)}" 
            alt="${car.brand || ''} ${car.model || ''}" 
            class="car-detail-image" 
          />

          <!-- Сердечко -->
          <span class="car-detail-favorite ${isFavorite ? 'active' : ''}" data-car-id="${car.id}"></span>

          <!-- Основний текстовий блок -->
          <div class="car-detail-content">
            <!-- Назва (Brand + Model + Year) -->
            <div class="car-detail-header">
              <h3 class="car-detail-title">${car.brand || '-'} ${car.model || '-'} (${car.year || '-'})</h3>
            </div>

            <!-- Опис (description) -->
            <div class="car-detail-description">
              ${car.description || 'Опис недоступний.'}
            </div>

            <!-- Технічні дані -->
            <div class="car-detail-specs">
              <div class="car-detail-spec">
                <label>Ціна:</label>
                <span>$${Number(car.price || 0).toLocaleString()}</span>
              </div>
              <div class="car-detail-spec">
                <label>Пробіг:</label>
                <span>${car.mileage != null ? car.mileage.toLocaleString() + ' км' : '—'}</span>
              </div>
              <div class="car-detail-spec">
                <label>Тип палива:</label>
                <span>${car.fuel_type || '—'}</span>
              </div>
              <div class="car-detail-spec">
                <label>Трансмісія:</label>
                <span>${car.transmission || '—'}</span>
              </div>
              <div class="car-detail-spec">
                <label>Тип кузова:</label>
                <span>${car.body_type || '—'}</span>
              </div>
              <div class="car-detail-spec">
                <label>Привід:</label>
                <span>${car.drive_type || '—'}</span>
              </div>
              <div class="car-detail-spec">
                <label>Прискорення до 100км/год:</label>
                <span>${car.acceleration != null ? car.acceleration + ' с' : '—'}</span>
              </div>
              <div class="car-detail-spec">
                <label>Макс. швидкість:</label>
                <span>${car.max_speed != null ? car.max_speed + ' км/год' : '—'}</span>
              </div>
              <div class="car-detail-spec">
                <label>Колір:</label>
                <span>${car.color || '—'}</span>
              </div>
              <div class="car-detail-spec">
                <label>Потужність:</label>
                <span>${car.power != null ? car.power + ' к.с.' : '—'}</span>
              </div>
            </div>

            <!-- Кнопка Купити -->
            <div class="car-detail-actions">
              <span class="car-detail-price">$${Number(car.price || 0).toLocaleString()}</span>
              <button class="car-detail-buy-button" onclick="alert('Перехід до покупки ще не реалізовано')">
                Купити
              </button>
            </div>
          </div>
        </div>
      `;

      container.innerHTML = html;

      // 5.3) Після того, як вставили HTML, “підв’язуємо” поведінку для “сердечка”
      const heartEl = container.querySelector('.car-detail-favorite');
      heartEl.addEventListener('click', async () => {
        // 5.3.1) Перевіряємо, чи юзер залогінений
        const { data: { user }, error: userErr } = await supabaseClient.auth.getUser();
        if (userErr || !user) {
          // якщо не залогінений — редірект на /login.html
          window.location.href = 'login.html';
          return;
        }
        const carIdNow = heartEl.dataset.carId;

        // 5.3.2) Якщо “сердечко” активне — видаляємо з favorites, інакше додаємо
        if (heartEl.classList.contains('active')) {
          // Видалення
          const { error: delErr } = await supabaseClient
            .from('favorites')
            .delete()
            .match({ user_id: user.id, car_id: carIdNow });

          if (delErr) {
            console.error('Помилка видалення з улюбленого: ' + delErr.message);
            return;
          }
          heartEl.classList.remove('active');
        } else {
          // Додавання
          const { error: insErr } = await supabaseClient
            .from('favorites')
            .insert({ user_id: user.id, car_id: carIdNow });

          if (insErr) {
            console.error('Помилка додавання в улюблене: ' + insErr.message);
            return;
          }
          heartEl.classList.add('active');
        }
      });
    }

    // 6) Запускаємо завантаження
    loadCarById(carId);
  });
