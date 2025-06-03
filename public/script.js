// === script.js ===

document.addEventListener('DOMContentLoaded', () => {
  // 1) Считываем настройки Supabase из config.js
  const SUPABASE_URL      = window.AUTOHUB_CONFIG?.SUPABASE_URL;
  const SUPABASE_ANON_KEY = window.AUTOHUB_CONFIG?.SUPABASE_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Не найден AUTOHUB_CONFIG с SUPABASE_URL / SUPABASE_KEY.');
    return;
  }

  // 2) Инициализируем клиента Supabase (UMD-бандл supabase.js должен быть уже подключён)
  const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // 3) Загружаем машины в каталог
  loadCars();

  // 4) Сразу показываем шапку: либо приветствие + кнопка «Выйти», либо «Войти»/«Зарегистрироваться»
  showUserNameOrAuthButtons();


  /* ——————————————————————————————————————————————————————————————————————— */
  /* ФУНКЦИЯ 1: Загружает и рендерит машины */
  async function loadCars() {
    const container = document.getElementById('cars-container');
    if (!container) return;

    try {
      // Запрос к таблице "cars"
      const { data: cars, error: carsError } = await supabaseClient
        .from('cars')
        .select('*');

      if (carsError) throw carsError;

      if (!Array.isArray(cars) || cars.length === 0) {
        container.innerHTML = '<p class="no-cars">В базе пока нет автомобилей.</p>';
        return;
      }

      // Очищаем контейнер и добавляем карточки
      container.innerHTML = '';
      cars.forEach(car => {
        const card = createCarCard(car);
        container.appendChild(card);
      });

    } catch (err) {
      console.error('Ошибка loadCars():', err);
      container.innerHTML = `<p class="error">Не удалось загрузить данные: ${err.message}</p>`;
    }
  }


  /* ——————————————————————————————————————————————————————————————————————— */
  /* ФУНКЦИЯ 2: Создаёт одну карточку машины */
  function createCarCard(car) {
    const card = document.createElement('div');
    card.className = 'car-card';

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

    const button = document.createElement('button');
    button.className = 'car-card__button';
    button.textContent = 'Детальніше';
    // В будущем здесь можно повесить показ деталей: button.addEventListener('click', ...)
    footer.appendChild(button);

    content.appendChild(footer);
    card.appendChild(content);

    return card;
  }


  /* ——————————————————————————————————————————————————————————————————————— */
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


  /* ——————————————————————————————————————————————————————————————————————— */
  /* ФУНКЦИЯ 4: Показывает или приветствие + кнопку «Выйти», или «Войти»/«Зарегистрироваться». */
  async function showUserNameOrAuthButtons() {
    const container = document.getElementById('user-name');
    if (!container) return;

    // Очистим перед началом
    container.innerHTML = '';

    // a) Пробуем получить текущего пользователя через Supabase Auth
    let user = null;
    try {
      const { data, error: userError } = await supabaseClient.auth.getUser();
      if (userError) {
        // Если ошибка – возможно, просто отсутствует сеанс. Логируем, но не роняем приложение.
        console.warn('Ошибка при получении пользователя (скорее всего нет сессии):', userError.message);
      } else {
        user = data.user;
      }
    } catch (e) {
      // Если вдруг что-то ещё упало – логируем. Считаем, что пользователь не залогинен.
      console.warn('Исключение при попытке getUser():', e);
    }

    // Если пользователя нет → показываем кнопки «Войти» и «Зарегистрироваться»
    if (!user) {
      // <a> «Войти»
      const loginLink = document.createElement('a');
      loginLink.href = 'login.html';
      loginLink.textContent = 'Увійти';
      loginLink.className = 'header__user--link';

      // <a> «Зареєструватися»
      const signupLink = document.createElement('a');
      signupLink.href = 'signup.html';
      signupLink.textContent = 'Зареєструватися';
      signupLink.className = 'header__user--link';

      // Добавляем их в контейнер
      container.append(loginLink, signupLink);
      return;
    }

    // Если есть пользователь → загружаем его профиль (first_name, last_name)
    let fullName = user.email; // по умолчанию отобразим email, если имени/фамилии не окажется
    try {
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.warn('Не удалось получить профиль, покажем email вместо имени:', profileError.message);
      } else {
        const fn = `${profile.first_name || ''}`.trim();
        const ln = `${profile.last_name || ''}`.trim();
        if (fn || ln) {
          fullName = `${fn} ${ln}`.trim();
        }
      }
    } catch (e) {
      console.warn('Исключение при select профиля:', e);
    }

    // c) Отображаем «Привіт, Ім’я Прізвище!»
    container.textContent = `Привіт, ${fullName}!`;

    // d) Добавляем кнопку «Вийти»
    const logoutBtn = document.createElement('button');
    logoutBtn.textContent = 'Вийти';
    logoutBtn.id = 'logout-button';

    logoutBtn.addEventListener('click', async () => {
      // a) Выходим
      const { error: signOutError } = await supabaseClient.auth.signOut();
      if (signOutError) {
        console.error('Ошибка при выходе:', signOutError.message);
        return;
      }
      // b) После успешного выхода обновляем шапку (остаемся на index.html)
      showUserNameOrAuthButtons();
    });

    container.appendChild(logoutBtn);
  }

});