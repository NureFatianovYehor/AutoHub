// === script.js ===

document.addEventListener('DOMContentLoaded', () => {
  // 1) Зчитуємо налаштування Supabase з config.js
  const SUPABASE_URL      = window.AUTOHUB_CONFIG?.SUPABASE_URL;
  const SUPABASE_ANON_KEY = window.AUTOHUB_CONFIG?.SUPABASE_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Не знайдено AUTOHUB_CONFIG з SUPABASE_URL / SUPABASE_KEY.');
    return;
  }

  // 2) Ініціалізуємо клієнт Supabase (з UMD-бандла "supabase.js")
  const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // 3) Завантажуємо та рендеримо машини
  async function loadCars() {
    const container = document.getElementById('cars-container');
    if (!container) return;

    try {
      // Використовуємо клієнтський метод Supabase для читання з таблиці "cars"
      const { data: cars, error: carsError } = await supabaseClient
        .from('cars')
        .select('*');

      if (carsError) throw carsError;

      if (!Array.isArray(cars) || cars.length === 0) {
        container.innerHTML = '<p class="no-cars">У базі поки немає автомобілів.</p>';
        return;
      }

      // Очищаємо контейнер і додаємо картки
      container.innerHTML = '';
      cars.forEach(car => {
        const card = createCarCard(car);
        container.appendChild(card);
      });
    } catch (err) {
      console.error('Помилка loadCars():', err);
      container.innerHTML = `<p class="error">Не вдалося завантажити дані: ${err.message}</p>`;
    }
  }

  // 4) Створення однієї картки машини
  function createCarCard(car) {
    const card = document.createElement('div');
    card.className = 'car-card';

    // Зображення
    const img = document.createElement('img');
    img.className = 'car-card__image';
    img.src = getImageSrc(car.images);
    img.alt = `${car.brand || ''} ${car.model || ''}`.trim() || 'Немає фото';
    card.appendChild(img);

    // Контент картки
    const content = document.createElement('div');
    content.className = 'car-card__content';

    // Інформація про бренд/модель/рік
    const info = document.createElement('div');
    info.className = 'car-card__info';
    const brandModel = document.createElement('div');
    brandModel.className = 'car-card__brand-model';
    brandModel.textContent = `${car.brand || '-'} ${car.model || '-'} (${car.year || '-'})`;
    info.appendChild(brandModel);

    const title = document.createElement('div');
    title.className = 'car-card__title';
    title.textContent = car.title || '';
    info.appendChild(title);

    content.appendChild(info);

    // Блок із ціною та кнопкою "Детальніше"
    const footer = document.createElement('div');
    footer.className = 'car-card__footer';
    const price = document.createElement('div');
    price.className = 'car-card__price';
    price.textContent = `$${Number(car.price || 0).toLocaleString()}`;
    footer.appendChild(price);

    const button = document.createElement('button');
    button.className = 'car-card__button';
    button.textContent = 'Детальніше';
    // У майбутньому тут можна прив’язати відображення деталей: button.addEventListener(...)
    footer.appendChild(button);

    content.appendChild(footer);
    card.appendChild(content);

    return card;
  }

  // 5) Допоміжна функція для витягання першої картинки
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

  // 6) Функція для показу імені користувача та кнопки "Вийти"
  async function showUserNameWithLogout() {
    const userNameContainer = document.getElementById('user-name');
    if (!userNameContainer) return;

    // a) Отримуємо поточного користувача із Supabase Auth
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError) {
      console.error('Помилка при отриманні користувача:', userError);
      return;
    }
    if (!user) {
      userNameContainer.textContent = '';
      return;
    }

    // b) Завантажуємо дані профілю (first_name, last_name) з таблиці profiles
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Помилка при зчитуванні профілю:', profileError);
      return;
    }

    // c) Відображаємо "Привіт, <Імʼя>!"
    const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    userNameContainer.textContent = fullName ? `Привіт, ${fullName}!` : '';

    // d) Додаємо кнопку "Вийти"
    const logoutButton = document.createElement('button');
    logoutButton.textContent = 'Вийти';
    logoutButton.style.marginLeft = '8px';
    logoutButton.style.background = 'transparent';
    logoutButton.style.color = '#ffffff';
    logoutButton.style.border = '1px solid #ffffff';
    logoutButton.style.borderRadius = '4px';
    logoutButton.style.padding = '3px 8px';
    logoutButton.style.cursor = 'pointer';

    logoutButton.addEventListener('click', async () => {
      await supabaseClient.auth.signOut();
      window.location.href = 'login.html';
    });

    userNameContainer.append(logoutButton);
  }

  // 7) Виконуємо обидві головні функції
  loadCars();
  showUserNameWithLogout();
});
