document.addEventListener('DOMContentLoaded', () => {
  // 1) Налаштування Supabase
  const SUPABASE_URL      = window.AUTOHUB_CONFIG?.SUPABASE_URL;
  const SUPABASE_ANON_KEY = window.AUTOHUB_CONFIG?.SUPABASE_KEY;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Не знайдено AUTOHUB_CONFIG з SUPABASE_URL / SUPABASE_KEY');
    return;
  }
  const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // ---------------------------------------------
  // БЛОК: приховати/показати посилання «Додати авто» та «Історія замовлень» для адміна
  const addCarLink  = document.getElementById('add-car-link');
  const orderLink   = document.getElementById('order');
  if (addCarLink)  addCarLink.style.display = 'none';
  if (orderLink)   orderLink.style.display  = 'none';

  ;(async () => {
    try {
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      if (userError || !user) return;

      const { data: profileData, error: profileError } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      if (profileError || !profileData) return;

      if (profileData.role === 'admin') {
        if (addCarLink) addCarLink.style.display = 'inline-block';
        if (orderLink)  orderLink.style.display  = 'inline-block';
      }
    } catch {
      // у разі помилки нічого не робимо
    }
  })();
  // ---------------------------------------------

  // 2) Контейнер для «Улюблених»
  const container = document.getElementById('favorites-container');
  if (!container) return;

  // 3) Завантажуємо «Улюблені» авто
  async function loadFavorites() {
    container.innerHTML = '<p class="loading">Завантаження...</p>';

    // 3.1) Отримуємо поточного користувача
    let currentUser = null;
    try {
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      if (userError || !user) {
        container.innerHTML = `
          <p class="no-cars">
            Щоб переглянути улюблені автомобілі, будь ласка, 
            <a href="login.html">увійдіть</a>.
          </p>`;
        return;
      }
      currentUser = user;
    } catch (e) {
      container.innerHTML = `<p class="error">Сталася помилка, спробуйте пізніше.</p>`;
      console.error(e);
      return;
    }

    // 3.2) Завантажуємо список favorites для цього user.id
    const { data: favData, error: favError } = await supabaseClient
      .from('favorites')
      .select('car:cars(*)')
      .eq('user_id', currentUser.id);

    if (favError) {
      container.innerHTML = `<p class="error">Не вдалося завантажити улюблені: ${favError.message}</p>`;
      return;
    }

    const cars = favData.map(row => row.car).filter(c => c);

    if (!cars.length) {
      container.innerHTML = '<p class="no-cars">У вас поки немає улюблених автомобілів.</p>';
      return;
    }

    // 3.3) Рендеримо картки
    container.innerHTML = '';
    cars.forEach(car => {
      container.appendChild(createFavoriteCarCard(car));
    });
  }

  // 4) Створюємо картку «Улюбленого»
  function createFavoriteCarCard(car) {
    const card = document.createElement('div');
    card.className = 'car-card';
    card.style.position = 'relative';

    // Сердечко
    const heart = document.createElement('span');
    heart.className = 'favorite-icon active';
    heart.dataset.carId = car.id;
    card.appendChild(heart);

    // Зображення
    const img = document.createElement('img');
    img.className = 'car-card__image';
    img.src = getImageSrc(car.images);
    img.alt = `${car.brand || ''} ${car.model || ''}`.trim() || 'Немає фото';
    card.appendChild(img);

    // Контент
    const content = document.createElement('div');
    content.className = 'car-card__content';
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

    const footer = document.createElement('div');
    footer.className = 'car-card__footer';
    const price = document.createElement('div');
    price.className = 'car-card__price';
    price.textContent = `$${Number(car.price || 0).toLocaleString()}`;
    footer.appendChild(price);

    const button = document.createElement('a');
    button.className = 'car-card__button';
    button.textContent = 'Детальніше';
    button.href = `detail.html?id=${encodeURIComponent(car.id)}`;
    footer.appendChild(button);

    content.appendChild(footer);
    card.appendChild(content);

    // Видалення з улюблених
    heart.addEventListener('click', async () => {
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      if (userError || !user) return window.location.href = 'login.html';
      await supabaseClient
        .from('favorites')
        .delete()
        .match({ user_id: user.id, car_id: car.id });
      card.remove();
      if (!container.querySelector('.car-card')) {
        container.innerHTML = '<p class="no-cars">У вас поки немає улюблених автомобілів.</p>';
      }
    });

    return card;
  }

  // 5) Допоміжна функція для отримання зображення
  function getImageSrc(images) {
    if (!images) return 'no-image.jpg';
    if (Array.isArray(images)) return images[0];
    if (typeof images === 'string') {
      try {
        const parsed = JSON.parse(images);
        if (Array.isArray(parsed) && parsed.length) return parsed[0];
      } catch { }
      return images.split(',')[0].trim();
    }
    return 'no-image.jpg';
  }

  // Запускаємо
  loadFavorites();
});
