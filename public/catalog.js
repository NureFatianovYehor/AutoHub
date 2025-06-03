// catalog.js

// 1) Завантажуємо список всіх авто з бекенду
async function fetchCars() {
  const res = await fetch('/cars');
  const result = await res.json();
  return Array.isArray(result) ? result : result.data;
}

// 2) Допоміжна: отримати першу картинку з поля images
function getImage(images) {
  if (!images) return 'no-image.jpg';
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) ? parsed[0] : 'no-image.jpg';
  } catch {
    return images.split(',')[0] || 'no-image.jpg';
  }
}

// 3) Рендеримо список карток
function renderCars(cars) {
  const container = document.getElementById('cars-container');
  container.innerHTML = '';

  if (!cars.length) {
    container.innerHTML = '<p class="no-cars">Немає автомобілів за цим фільтром.</p>';
    return;
  }

  cars.forEach(car => {
    const card = document.createElement('div');
    card.className = 'car-card';
    card.innerHTML = `
      <img src="${getImage(car.images)}" alt="${car.brand} ${car.model}" />
      <div class="car-card__content">
        <div><strong>${car.brand} ${car.model}</strong> (${car.year})</div>
        <div>${car.title}</div>
        <div class="car-card__price">$${Number(car.price).toLocaleString()}</div>
      </div>
    `;
    container.appendChild(card);
  });
}

// 4) Застосувати фільтрацію
function applyFilters() {
  fetchCars().then(cars => {
    const get = id => document.getElementById(id).value.trim().toLowerCase();

    const filtered = cars.filter(car => {
      if (get('body_type') && car.body_type?.toLowerCase() !== get('body_type')) return false;
      if (get('brand') && car.brand?.toLowerCase() !== get('brand')) return false;
      if (get('model') && !car.model?.toLowerCase().includes(get('model'))) return false;
      if (get('year') && car.year?.toString() !== get('year')) return false;
      if (get('price') && car.price > Number(get('price'))) return false;
      if (get('mileage') && car.mileage > Number(get('mileage'))) return false;
      if (get('fuel_type') && car.fuel_type?.toLowerCase() !== get('fuel_type')) return false;
      if (get('transmission') && car.transmission?.toLowerCase() !== get('transmission')) return false;
      if (get('drive_type') && car.drive_type?.toLowerCase() !== get('drive_type')) return false;
      if (get('color') && !car.color?.toLowerCase().includes(get('color'))) return false;
      if (get('acceleration') && car.acceleration > Number(get('acceleration'))) return false;
      if (get('max_speed') && car.max_speed > Number(get('max_speed'))) return false;
      if (get('power') && !car.power?.toString().includes(get('power'))) return false;
      return true;
    });

    renderCars(filtered);
  });
}

// 5) При завантаженні сторінки – застосувати фільтр (завантажити всі машини спочатку)
document.addEventListener('DOMContentLoaded', () => {
  applyFilters();
});
