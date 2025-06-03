
function getImageSrc(images) {
  if (!images) return 'no-image.jpg';

  if (Array.isArray(images)) {
    return images[0];
  }

  if (typeof images === 'string') {
    images = images.replace(/{|}/g, '').trim(); 
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed)) return parsed[0];
    } catch (e) {
      if (images.startsWith('data:image') || images.startsWith('http')) {
        return images.split(',')[0];
      }
    }
  }

  return 'no-image.jpg';
}

// Твой остальной код...
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('cars-container');
  
    // Створює HTML-елемент картки для одного автомобіля
    function createCarCard(car) {
      const card = document.createElement('div');
      card.className = 'car-card';
  
      const img = document.createElement('img');
img.className = 'car-card__image';
img.src = getImageSrc(car.images);
img.alt = `${car.brand} ${car.model}` || 'Немає фото';

      card.appendChild(img);
  
      // Контент картки
      const content = document.createElement('div');
      content.className = 'car-card__content';
  
      // Блок з брендом/моделлю/роком та коротким заголовком
      const info = document.createElement('div');
      info.className = 'car-card__info';
      const brandModel = document.createElement('div');
      brandModel.className = 'car-card__brand-model';
      brandModel.textContent = `${car.brand} ${car.model} (${car.year})`;
      info.appendChild(brandModel);
      const title = document.createElement('div');
      title.className = 'car-card__title';
      title.textContent = car.title;
      info.appendChild(title);
      content.appendChild(info);
  
      // Блок з ціною та кнопкою «Детальніше»
      const footer = document.createElement('div');
      footer.className = 'car-card__footer';
      const price = document.createElement('div');
      price.className = 'car-card__price';
      price.textContent = `$${Number(car.price).toLocaleString()}`; // форматування ціни
      footer.appendChild(price);
  
      const button = document.createElement('button');
      button.className = 'car-card__button';
      button.textContent = 'Детальніше';
      // У майбутньому тут можна додати: button.addEventListener('click', () => showDetails(car.id));
      footer.appendChild(button);
  
      content.appendChild(footer);
      card.appendChild(content);
  
      return card;
    }
  
    // Завантажує список авто з сервера і рендерить картки
    async function loadCars() {
      try {
        const res = await fetch('/cars');
        if (!res.ok) throw new Error(`Помилка ${res.status}`);
        const result = await res.json();
  
        console.log('GET /cars →', result);
        // Якщо Supabase повернув обʼєкт з полем data: беремо result.data, інакше — вважаємо, що result вже масив
        const cars = Array.isArray(result) ? result : result.data;
        console.log('Масив cars:', cars);
  
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
        console.error(err);
        container.innerHTML = `<p class="error">Не вдалося завантажити дані: ${err.message}</p>`;
      }
    }
  
    // Запускаємо завантаження після того, як DOM буде готовий
    console.log('script.js завантажено, запускаємо loadCars()');
    loadCars();
  });
  
