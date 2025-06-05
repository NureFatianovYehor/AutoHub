// detail.js

document.addEventListener('DOMContentLoaded', () => {
    // ========== 0) Инициализируем EmailJS с вашим Public Key ==========
    // Можно найти Public Key в Dashboard EmailJS → Account → API keys
    emailjs.init("kd530yALMMejmOceW");
  
    // ========== 1) Инициализируем Supabase ==========
    const SUPABASE_URL      = window.AUTOHUB_CONFIG?.SUPABASE_URL;
    const SUPABASE_ANON_KEY = window.AUTOHUB_CONFIG?.SUPABASE_KEY;
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('Не знайдено AUTOHUB_CONFIG з SUPABASE_URL / SUPABASE_KEY');
      return;
    }
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
    // ========== 2) Скрываем «Додати авто» для не-адмінів ==========
    const addCarLink = document.getElementById('add-car-link');
    if (addCarLink) addCarLink.style.display = 'none';
    (async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (!user || userError) return;
  
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
  
        if (profileData?.role === 'admin' && addCarLink) {
          addCarLink.style.display = 'inline-block';
        }
      } catch {
        // Якщо помилка ‒ нічого не робимо
      }
    })();
  
    // ========== 3) Берём ID машины из URL: detail.html?id=<car_id> ==========
    const params = new URLSearchParams(window.location.search);
    const carId = params.get('id');
    const container = document.getElementById('car-detail-container');
  
    if (!carId) {
      container.innerHTML = '<p class="error">Невірний запит: не вказано ідентифікатор машини.</p>';
      return;
    }
  
    // ========== 4) Загрузка данных машины по её ID ==========
    async function loadCarById(id) {
      container.innerHTML = '<p class="loading">Завантаження... Будь ласка, зачекайте.</p>';
      try {
        const { data: car, error: carError } = await supabase
          .from('cars')
          .select('*')
          .eq('id', id)
          .single();
  
        if (carError || !car) {
          container.innerHTML = `<p class="error">Не вдалося знайти машину з таким ідентифікатором.</p>`;
          console.error(carError);
          return;
        }
        renderCarDetail(car);
      } catch (e) {
        container.innerHTML = `<p class="error">Сталася помилка при завантаженні даних. Спробуйте пізніше.</p>`;
        console.error(e);
      }
    }
  
    // Вспомогательная: взять первую картинку из car.images
    function getFirstImage(images) {
      if (!images) return 'no-image.jpg';
      if (typeof images === 'string') {
        try {
          const parsed = JSON.parse(images);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed[0];
          }
        } catch {
          const parts = images.split(',');
          if (parts.length > 0) return parts[0].trim();
        }
      }
      if (Array.isArray(images) && images.length > 0) {
        return images[0];
      }
      return 'no-image.jpg';
    }
  
    // ========== 5) Рендерим детали автомобиля и обрабатываем кнопки ==========
    async function renderCarDetail(car) {
      // 5.1) Проверяем, есть ли авто в избранном
      let isFav = false;
      try {
        const { data: { user }, error: userErr } = await supabase.auth.getUser();
        if (user && !userErr) {
          const { data: favRows, error: favErr } = await supabase
            .from('favorites')
            .select('car_id')
            .eq('user_id', user.id)
            .eq('car_id', car.id)
            .single();
          if (!favErr && favRows) {
            isFav = true;
          }
        }
      } catch (e) {
        console.warn('Не вдалося перевірити favorites:', e);
      }
  
      // 5.2) Вставляем HTML-код
      const html = `
        <div class="car-detail-container" style="position: relative;">
          <!-- Большое изображение -->
          <img
            src="${getFirstImage(car.images)}"
            alt="${car.brand || ''} ${car.model || ''}"
            class="car-detail-image"
          />
          <!-- «Сердечко» избранного -->
          <span class="car-detail-favorite ${isFav ? 'active' : ''}" data-car-id="${car.id}"></span>
          <!-- Контент -->
          <div class="car-detail-content">
            <div class="car-detail-header">
              <h3 class="car-detail-title">${car.brand || '-'} ${car.model || '-'} (${car.year || '-'})</h3>
            </div>
            <div class="car-detail-description">${car.description || 'Опис недоступний.'}</div>
            <div class="car-detail-specs">
              <div class="car-detail-spec"><label>Ціна:</label><span>$${Number(car.price || 0).toLocaleString()}</span></div>
              <div class="car-detail-spec"><label>Пробіг:</label><span>${car.mileage != null ? car.mileage.toLocaleString() + ' км' : '—'}</span></div>
              <div class="car-detail-spec"><label>Тип палива:</label><span>${car.fuel_type || '—'}</span></div>
              <div class="car-detail-spec"><label>Трансмісія:</label><span>${car.transmission || '—'}</span></div>
              <div class="car-detail-spec"><label>Тип кузова:</label><span>${car.body_type || '—'}</span></div>
              <div class="car-detail-spec"><label>Привід:</label><span>${car.drive_type || '—'}</span></div>
              <div class="car-detail-spec"><label>Прискорення 0-100:</label><span>${car.acceleration != null ? car.acceleration + ' с' : '—'}</span></div>
              <div class="car-detail-spec"><label>Макс. швидкість:</label><span>${car.max_speed != null ? car.max_speed + ' км/год' : '—'}</span></div>
              <div class="car-detail-spec"><label>Колір:</label><span>${car.color || '—'}</span></div>
              <div class="car-detail-spec"><label>Потужність:</label><span>${car.power != null ? car.power + ' к.с.' : '—'}</span></div>
            </div>
            <div class="car-detail-actions">
              <span class="car-detail-price">$${Number(car.price || 0).toLocaleString()}</span>
              <button class="car-detail-buy-button">Купити</button>
            </div>
          </div>
        </div>
      `;
      container.innerHTML = html;
  
      // 5.3) Обработчик «сердечко»
      const heart = container.querySelector('.car-detail-favorite');
      heart.addEventListener('click', async () => {
        const { data: { user }, error: userErr } = await supabase.auth.getUser();
        if (userErr || !user) {
          window.location.href = 'login.html';
          return;
        }
        const thisCarId = heart.dataset.carId;
        if (heart.classList.contains('active')) {
          const { error: delErr } = await supabase
            .from('favorites')
            .delete()
            .match({ user_id: user.id, car_id: thisCarId });
          if (!delErr) heart.classList.remove('active');
        } else {
          const { error: insErr } = await supabase
            .from('favorites')
            .insert({ user_id: user.id, car_id: thisCarId });
          if (!insErr) heart.classList.add('active');
        }
      });
  
      // 5.4) Обработчик кнопки «Купити»
      const buyBtn = container.querySelector('.car-detail-buy-button');
      buyBtn.addEventListener('click', async () => {
        const { data: { user }, error: userErr } = await supabase.auth.getUser();
        if (userErr || !user) {
          window.location.href = 'login.html';
          return;
        }
        const clientId    = user.id;
        const clientEmail = user.email;
  
        // Подготавливаем краткое описание авто
        const b = car.brand  || '-';
        const m = car.model  || '-';
        const y = car.year   || '-';
        const p = car.price != null ? `$${Number(car.price).toLocaleString()}` : '-';
  
        // Текст для таблицы messages
        const messageText = `
  Користувач (${clientEmail}) замовляє автомобіль:
  • Марка/Модель: ${b} ${m}
  • Рік: ${y}
  • Ціна: ${p}
        `;
        try {
          // 1) Вставляем запись в messages
          const { error: insertError } = await supabase
            .from('messages')
            .insert([
              {
                user_id: clientId,
                car_id: car.id,
                message: messageText.trim()
              }
            ]);
          if (insertError) throw insertError;
  
          // 2) Отправляем e-mail клиенту через EmailJS
          //    Service ID:   "service_eu7zrbd"
          //    Template ID:  "template_zbaguvx"
          //    В шаблоне EmailJS переменные должны быть {{to_email}}, {{to_name}}, {{car_desc}}
          const templateParams = {
            to_email: clientEmail,               // {{to_email}}
            to_name:  clientEmail.split('@')[0], // {{to_name}}
            car_desc: `${b} ${m} (${y}) – ${p}`  // {{car_desc}}
          };
  
          emailjs.send("service_eu7zrbd", "template_zbaguvx", templateParams)
            .then(response => {
              console.log("EmailJS response:", response.status, response.text);
              alert('Ваш запит успішно оформлено! Лист-підтвердження відправлено на вашу пошту.');
              buyBtn.disabled = true;
              buyBtn.textContent = 'Запит отримано';
            })
            .catch(err => {
              console.error("EmailJS помилка:", err);
              alert('Не вдалося відправити лист-підтвердження. Спробуйте пізніше.');
            });
        } catch (err) {
          console.error('Помилка при вставці в messages:', err);
          alert('Сталася помилка при оформленні запиту. Спробуйте пізніше.');
        }
      });
    }
  
    // ========== 6) Запускаем загрузку автомобиля по ID ==========
    loadCarById(carId);
  });
  