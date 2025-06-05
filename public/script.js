// === script.js ===
let selectedBodyType = ''; // тип кузова, який обрано у верхньому меню

document.addEventListener('DOMContentLoaded', () => {
  // 1) Считываем настройки Supabase из config.js
  const SUPABASE_URL      = window.AUTOHUB_CONFIG?.SUPABASE_URL;
  const SUPABASE_ANON_KEY = window.AUTOHUB_CONFIG?.SUPABASE_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Не найден AUTOHUB_CONFIG с SUPABASE_URL / SUPABASE_KEY.');
    return;
  }
  

  function filterByBodyType(bodyType) {
    fetch('/cars')
      .then(res => res.json())
      .then(result => {
        const cars = Array.isArray(result) ? result : result.data;
  
        const filtered = bodyType
          ? cars.filter(car => car.body_type?.toLowerCase() === bodyType.toLowerCase())
          : cars;
  
        renderCars(filtered);
      })
      .catch(err => {
        console.error('Помилка при завантаженні авто:', err);
      });
  }
  
  document.querySelectorAll('.categories__link').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
  
      document.querySelectorAll('.categories__link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
  
      selectedBodyType = link.dataset.body || ''; // оновлюємо глобальну змінну
  
      // Викликаємо завантаження заново (тільки для index.html)
      if (typeof loadCars === 'function') {
        loadCars();
      }
    });
  });
  
  


  // 2) Инициализируем клиента Supabase (UMD-бандл supabase.js должен быть уже подключён)
  const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // 3) Загружаем машины в каталог (эта функция осталась без изменений)
  loadCars();

  /* ——————————————————————————————————————————————————————————————————————— */
  /* ФУНКЦИЯ 1: Загружает и рендерит машины (с учётом избранного) */
  async function loadCars() {
    const container = document.getElementById('cars-container');
    if (!container) return;
  
    try {
      // 1) Получаем тек. пользователя (если есть)
      let currentUser = null;
      try {
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (!userError) currentUser = user;
      } catch (e) {
        console.warn('Не удалось получить пользователя:', e);
      }
  
      // 2) Если пользователь авторизован, получаем его избранное
      let userFavoritesSet = new Set();
      if (currentUser) {
        const { data: favRows, error: favError } = await supabaseClient
          .from('favorites')
          .select('car_id')
          .eq('user_id', currentUser.id);
        if (favError) {
          console.warn('Не удалось получить избранное:', favError.message);
        } else {
          favRows.forEach(row => userFavoritesSet.add(row.car_id));
        }
      }
  
      // 3) Запрашиваем все машины
      const { data: cars, error: carsError } = await supabaseClient
        .from('cars')
        .select('*');
  
      if (carsError) throw carsError;
  
      if (!Array.isArray(cars) || cars.length === 0) {
        container.innerHTML = '<p class="no-cars">В базі поки немає автомобілів.</p>';
        return;
      }
  
      // ✅ 4) Фільтрація по типу кузова
      const filteredCars = selectedBodyType
        ? cars.filter(car => car.body_type?.toLowerCase() === selectedBodyType)
        : cars;
  
      // 5) Очищаем контейнер и добавляем карточки
      container.innerHTML = '';
      filteredCars.forEach(car => {
        const card = createCarCard(car, userFavoritesSet);
        container.appendChild(card);
      });
  
    } catch (err) {
      console.error('Ошибка loadCars():', err);
      container.innerHTML = `<p class="error">Не вдалося завантажити дані: ${err.message}</p>`;
    }
  }
  


  /* ФУНКЦИЯ 2: Создаёт одну карточку машины (с «сердечком») */
  function createCarCard(car, userFavoritesSet) {
    const card = document.createElement('div');
    card.className = 'car-card';
    card.style.position = 'relative'; // чтобы «сердечко» позиционировалось

    // Иконка «сердечко»
    const heart = document.createElement('span');
    heart.className = 'favorite-icon';
    if (userFavoritesSet && userFavoritesSet.has(car.id)) {
      heart.classList.add('active');
    }
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

    // Блок с ценой и кнопкой "Подробнее"
    const footer = document.createElement('div');
    footer.className = 'car-card__footer';
    const price = document.createElement('div');
    price.className = 'car-card__price';
    price.textContent = `$${Number(car.price || 0).toLocaleString()}`;
    footer.appendChild(price);

    const button = document.createElement('a');
    button.className = 'car-card__button';
    button.textContent = 'Детальніше';
    button.href = `detail.html?id=${car.id}`;
    footer.appendChild(button);
    

    content.appendChild(footer);
    card.appendChild(content);

    // Слушатель клика по «сердечку»
    heart.addEventListener('click', async () => {
      // 1) Проверяем, есть ли текущий пользователь
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      if (userError || !user) {
        // Если не залогинен – перенаправляем на страницу логина
        window.location.href = 'login.html';
        return;
      }
      const carId = heart.dataset.carId;
      if (heart.classList.contains('active')) {
        // Уже в избранном → удаляем
        const { error: delError } = await supabaseClient
          .from('favorites')
          .delete()
          .match({ user_id: user.id, car_id: carId });
        if (delError) {
          console.error('Ошибка удаления из избранного:', delError.message);
          return;
        }
        heart.classList.remove('active');
      } else {
        // Ещё не в избранном → добавляем
        const { error: insertError } = await supabaseClient
          .from('favorites')
          .insert({ user_id: user.id, car_id: carId });
        if (insertError) {
          console.error('Ошибка добавления в избранное:', insertError.message);
          return;
        }
        heart.classList.add('active');
      }
    });

    return card;
  }


  /* ФУНКЦИЯ 3: Помощник для получения первой картинки */
  function getImageSrc(images) {
    if (!images) return 'no-image.jpg';
    if (Array.isArray(images)) {
      return images[0];
    }
    if (typeof images === 'string') {
      const trimmed = images.replace(/{|}/g, '').trim();
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed[0];
      } catch {
        if (trimmed.startsWith('http') || trimmed.startsWith('data:image')) {
          return trimmed.split(',')[0];
        }
      }
    }
    return 'no-image.jpg';
  }

});
