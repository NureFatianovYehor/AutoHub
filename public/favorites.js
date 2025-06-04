document.addEventListener('DOMContentLoaded', () => {
    // 1) Настройки Supabase
    const SUPABASE_URL      = window.AUTOHUB_CONFIG?.SUPABASE_URL;
    const SUPABASE_ANON_KEY = window.AUTOHUB_CONFIG?.SUPABASE_KEY;
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('Не найден AUTOHUB_CONFIG с SUPABASE_URL / SUPABASE_KEY.');
      return;
    }
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
    // 2) Получаем контейнер для избранных карточек
    const container = document.getElementById('favorites-container');
    if (!container) return;
  
    // 3) Функция загрузки «избранных»
    async function loadFavorites() {
      // Показываем «Загрузка…»
      container.innerHTML = '<p class="loading">Завантаження…</p>';
  
      // 3.1) Получаем текущего пользователя
      let currentUser = null;
      try {
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (userError || !user) {
          // Если нет авторизации – просим залогиниться
          container.innerHTML = `
            <p class="no-cars">
              Щоб переглянути улюблені автомобілі, будь ласка, <a href="login.html">увійдіть</a>.
            </p>`;
          return;
        }
        currentUser = user;
      } catch (e) {
        container.innerHTML = `<p class="error">Сталася помилка, спробуйте пізніше.</p>`;
        console.error(e);
        return;
      }
  
      // 3.2) Запрашиваем все любимые автомобили этого пользователя
      // Используем вложенный select, чтобы сразу вытянуть поля машин:
      const { data: favData, error: favError } = await supabaseClient
        .from('favorites')
        .select('car:cars(*)')
        .eq('user_id', currentUser.id);
      if (favError) {
        container.innerHTML = `<p class="error">Не вдалося завантажити улюблені: ${favError.message}</p>`;
        return;
      }
  
      // favData – массив объектов вида { car: { id, images, brand, model, year, title, price, … } }
      const cars = favData.map(row => row.car).filter(c => c !== null);
  
      if (!cars.length) {
        container.innerHTML = '<p class="no-cars">У вас поки немає улюблених автомобілів.</p>';
        return;
      }
  
      // 3.3) Очищаем контейнер и рисуем карточки
      container.innerHTML = '';
      cars.forEach(car => {
        const card = createFavoriteCarCard(car);
        container.appendChild(card);
      });
    }
  
    // 4) Функция создания карточки для избранного (с «сердечком», которое при клике удаляет из избранного)
    function createFavoriteCarCard(car) {
      const card = document.createElement('div');
      card.className = 'car-card';
      card.style.position = 'relative'; // чтобы .favorite-icon позиционировалось правильно
  
      // «Сердечко» с классом active
      const heart = document.createElement('span');
      heart.className = 'favorite-icon active';
      heart.dataset.carId = car.id;
      card.appendChild(heart);
  
      // Изображение
      const img = document.createElement('img');
      img.className = 'car-card__image';
      img.src = getImageSrc(car.images);
      img.alt = `${car.brand || ''} ${car.model || ''}`.trim() || 'Нет фото';
      card.appendChild(img);
  
      // Контент карточки
      const content = document.createElement('div');
      content.className = 'car-card__content';
  
      // Информация о бренде/модели/году
      const info = document.createElement('div');
      info.className = 'car-card__info';
      const brandModel = document.createElement('div');
      brandModel.className = 'car-card__brand-model';
      brandModel.textContent = `${car.brand || '-'} ${car.model || '-'} (${car.year || '-'})`;
      info.appendChild(brandModel);
  
      // Короткий заголовок (title)
      const title = document.createElement('div');
      title.className = 'car-card__title';
      title.textContent = car.title || '';
      info.appendChild(title);
  
      content.appendChild(info);
  
      // Блок с ценой и кнопкой "Детальніше"
      const footer = document.createElement('div');
      footer.className = 'car-card__footer';
      const price = document.createElement('div');
      price.className = 'car-card__price';
      price.textContent = `$${Number(car.price || 0).toLocaleString()}`;
      footer.appendChild(price);
  
      const button = document.createElement('button');
      button.className = 'car-card__button';
      button.textContent = 'Детальніше';
      footer.appendChild(button);
  
      content.appendChild(footer);
      card.appendChild(content);
  
      // Слушатель клика по «сердечку»: удаляем из favorites и из DOM
      heart.addEventListener('click', async () => {
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (userError || !user) {
          // Если пользователь вдруг разлогинился – предложить зайти
          window.location.href = 'login.html';
          return;
        }
        const carId = heart.dataset.carId;
  
        // Удаляем из таблицы favorites
        const { error: delError } = await supabaseClient
          .from('favorites')
          .delete()
          .match({ user_id: user.id, car_id: carId });
        if (delError) {
          console.error('Ошибка удаления из избранного:', delError.message);
          return;
        }
  
        // Удаляем карточку из DOM
        card.remove();
  
        // Если после удаления карток не осталось, выводим сообщение
        if (!container.querySelector('.car-card')) {
          container.innerHTML = '<p class="no-cars">У вас поки немає улюблених автомобілів.</p>';
        }
      });
  
      return card;
    }
  
    // 5) Помощник: получить первую картинку из массива или JSON-строки
    function getImageSrc(images) {
      if (!images) return 'no-image.jpg';
      if (Array.isArray(images)) {
        return images[0];
      }
      if (typeof images === 'string') {
        const trimmed = images.replace(/{|}/g, '').trim();
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed) && parsed.length) return parsed[0];
        } catch {
          if (trimmed.startsWith('http') || trimmed.startsWith('data:image')) {
            return trimmed.split(',')[0];
          }
        }
      }
      return 'no-image.jpg';
    }
  
    // Запускаем загрузку избранного
    loadFavorites();
  });
  