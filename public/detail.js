// detail.js

// ================= 0) Ініціалізація EmailJS =================
emailjs.init("kd530yALMMejmOceW");

document.addEventListener('DOMContentLoaded', () => {
  // ================= 1) Ініціалізуємо Supabase =================
  const SUPABASE_URL      = window.AUTOHUB_CONFIG?.SUPABASE_URL;
  const SUPABASE_ANON_KEY = window.AUTOHUB_CONFIG?.SUPABASE_KEY;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Не знайдено AUTOHUB_CONFIG з SUPABASE_URL / SUPABASE_KEY');
    return;
  }
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // ================= 2) Сховаємо «Додати авто» для не-адмінів =================
  // ================= 2) Сховаємо «Додати авто» і «Історія замовлень» для не-адмінів =================
const addCarLink  = document.getElementById('add-car-link');
const orderLink   = document.getElementById('order');
if (addCarLink) addCarLink.style.display = 'none';
if (orderLink)  orderLink.style.display  = 'none';

;(async () => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!user || userError) return;

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profileError || !profileData) return;

    if (profileData.role === 'admin') {
      if (addCarLink) addCarLink.style.display = 'inline-block';
      if (orderLink)  orderLink.style.display  = 'inline-block';
    }
  } catch {
    // у разі помилки нічого не робимо
  }
})();


  // ================= 3) Обробка ID авто з URL =================
  const params = new URLSearchParams(window.location.search);
  const carId = params.get('id');
  const container = document.getElementById('car-detail-container');

  if (!carId) {
    container.innerHTML = '<p class="error">Невірний запит: не вказано ідентифікатор машини.</p>';
    return;
  }

  // ================= 4) Функція завантаження даних машини =================
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

  // ================= 4.1) Допоміжна: беремо першу картинку =================
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

  // ================= 5) Рендер деталей і обробка кнопок =================
  async function renderCarDetail(car) {
    // 5.1) Перевіримо, чи авто вже в «Улюблене»
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

    // 5.2) Вставляємо HTML-код
    const html = `
      <div class="car-detail-container" style="position: relative;">
        <!-- Велике зображення -->
        <img
          src="${getFirstImage(car.images)}"
          alt="${car.brand || ''} ${car.model || ''}"
          class="car-detail-image"
        />
        <!-- Сердечко «Улюблене» -->
        <span class="car-detail-favorite ${isFav ? 'active' : ''}" data-car-id="${car.id}"></span>
        <!-- Блок з інформацією -->
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

    // 5.3) Обробник «Сердечко» (Улюблене)
    const heart = container.querySelector('.car-detail-favorite');
    heart.addEventListener('click', async () => {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) {
        // Користувач не залогінений → показуємо alert
        showAuthAlert('Щоб додати в Улюблене, будь ласка, увійдіть або зареєструйтесь.');
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

    // 5.4) Обробник кнопки «Купити»
    const buyBtn = container.querySelector('.car-detail-buy-button');
    buyBtn.addEventListener('click', async () => {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) {
        // Якщо незалогінений — показуємо alert, а не редірект
        showAuthAlert('Щоб купити автомобіль, будь ласка, увійдіть або зареєструйтесь.');
        return;
      }
      const clientId    = user.id;
      const clientEmail = user.email;

      // Готуємо опис авто
      const b = car.brand  || '-';
      const m = car.model  || '-';
      const y = car.year   || '-';
      const p = car.price != null ? `$${Number(car.price).toLocaleString()}` : '-';

      // Текст для таблиці messages
      const messageText = `
Користувач (${clientEmail}) замовляє автомобіль:
• Марка/Модель: ${b} ${m}
• Рік: ${y}
• Ціна: ${p}
      `;
      try {
        // 1) Додаємо запис у таблицю messages
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

        // 2) Надсилаємо листа клієнту (EmailJS)
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

  // ================= 6) Запускаємо завантаження автомобіля по ID =================
  loadCarById(carId);
});

// ================= 7) Функція показу повідомлення при відсутності авторизації =================
function showAuthAlert(message) {
  const alertDiv = document.getElementById('auth-alert');
  if (!alertDiv) return;
  alertDiv.textContent = message;
  alertDiv.classList.add('show');
  setTimeout(() => {
    alertDiv.classList.remove('show');
  }, 5000);
}
