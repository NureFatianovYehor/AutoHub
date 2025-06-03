/**
 * Допоміжна функція: 
 * якщо у базі зберігаються адреси зображень у форматі JSON-рядка або сам рядок – 
 * ми з неї „витягаємо” перший URL. Якщо нічого не знайдено – повертаємо заглушку.
 */
function getImageSrc(images) {
  if (!images) return 'no-image.jpg';

  // Якщо вже масив – повертаємо перший елемент
  if (Array.isArray(images)) {
    return images[0];
  }

  // Якщо рядок – спробуємо JSON-парсинг
  if (typeof images === 'string') {
    // Прибираємо фігурні дужки, якщо вони є
    const trimmed = images.replace(/{|}/g, '').trim();

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed[0];
      }
    } catch (err) {
      // Якщо не JSON, але рядок виглядає як URL
      if (trimmed.startsWith('data:image') || trimmed.startsWith('http')) {
        return trimmed.split(',')[0];
      }
    }
  }

  return 'no-image.jpg';
}

/** 
 * Основний код, який завантажує список машин і рендерить картки.
 * Він жодним чином НЕ змінює вміст <header> або <section class="hero">, 
 * а працює виключно з контейнером #cars-container.
 */
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('cars-container');

  // Функція створює DOM-елемент для однієї картки машини
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

    // Блок із ціною та кнопкою
    const footer = document.createElement('div');
    footer.className = 'car-card__footer';

    const price = document.createElement('div');
    price.className = 'car-card__price';
    // Форматуємо ціну (наприклад, 45000 → "45 000")
    price.textContent = `$${Number(car.price || 0).toLocaleString()}`;
    footer.appendChild(price);

    const button = document.createElement('button');
    button.className = 'car-card__button';
    button.textContent = 'Детальніше';
    // У майбутньому сюди можна додати: button.addEventListener('click', () => showDetails(car.id));
    footer.appendChild(button);

    content.appendChild(footer);
    card.appendChild(content);

    return card;
  }

  // Завантаження списку авто з API і вставка карток у контейнер
  async function loadCars() {
    try {
      const res = await fetch('/cars');
      if (!res.ok) {
        throw new Error(`Помилка ${res.status}`);
      }
      const result = await res.json();

      // Якщо Supabase повертає { data: [...] }, беремо саме data
      const cars = Array.isArray(result) ? result : result.data;

      // Якщо масиву немає або він пустий – показуємо повідомлення
      if (!Array.isArray(cars) || cars.length === 0) {
        container.innerHTML = '<p class="no-cars">У базі поки немає автомобілів.</p>';
        return;
      }

      // Інакше чистимо контейнер і додаємо картки
      container.innerHTML = '';
      cars.forEach(car => {
        const card = createCarCard(car);
        container.appendChild(card);
      });
    } catch (err) {
      console.error(err);
      container.innerHTML = `<p class="error">Не вдалося завантажити дані: ${err.message}</p>`;
    }
  }

  // Запускаємо завантаження після того, як DOM буде готовий
  console.log('script.js завантажено – викликаємо loadCars()');
  loadCars();
});
