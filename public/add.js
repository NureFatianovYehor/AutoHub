// add.js
document.addEventListener('DOMContentLoaded', () => {
    // 1) Получаем из config.js URL и KEY
    const SUPABASE_URL = window.AUTOHUB_CONFIG.SUPABASE_URL;
    const SUPABASE_KEY = window.AUTOHUB_CONFIG.SUPABASE_KEY;
  
    // 2) Создаём клиента Supabase (переменная supabase уже доступна благодаря UMD-скрипту)
    const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  
    const form = document.getElementById('add-car-form');
    const messageBox = document.getElementById('form-message');
    const fileInput = document.getElementById('imageFile');
  
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      messageBox.style.display = 'none';
      messageBox.textContent = '';
  
      // 3) Считываем значения из обязательных полей формы
      const title = form.title.value.trim();
      const description = form.description.value.trim();
      const brand = form.brand.value.trim();
      const model = form.model.value.trim();
      const year = Number(form.year.value);
      const price = parseFloat(form.price.value);
      const mileage = parseInt(form.mileage.value, 10);
      const fuel_type = form.fuel_type.value.trim();
      const transmission = form.transmission.value.trim();
  
      // 4) Считываем значения из необязательных полей
      const color = form.color.value.trim();
      const body_type = form.body_type.value.trim();
      const drive_type = form.drive_type.value.trim();
      const accelerationVal = form.acceleration.value.trim();
      const max_speedVal = form.max_speed.value.trim();
      const power = form.power.value.trim();
  
      // 5) Проверяем, что файл выбран
      const file = fileInput.files[0];
      if (!file) {
        messageBox.textContent = 'Будь ласка, виберіть фото автомобіля у форматі PNG або JPG.';
        messageBox.style.color = '#d32f2f';
        messageBox.style.display = 'block';
        return;
      }
  
      // 6) Простая валидация обязательных полей
      if (
        !title ||
        !description ||
        !brand ||
        !model ||
        isNaN(year) ||
        isNaN(price) ||
        isNaN(mileage) ||
        !fuel_type ||
        !transmission
      ) {
        messageBox.textContent = 'Будь ласка, заповніть усі обов’язкові поля коректно.';
        messageBox.style.color = '#d32f2f';
        messageBox.style.display = 'block';
        return;
      }
  
      try {
        // 7) Загружаем файл в Storage (bucket "cars")
        const timestamp = Date.now();
        const ext = file.name.split('.').pop().toLowerCase();
        const fileName = `car_${timestamp}.${ext}`; // например "car_1686045239172.jpg"
  
        // Supabase автоматически подставит bucket-имя "cars/"
        const { data: uploadData, error: uploadError } = await sb
          .storage
          .from('cars')
          .upload(fileName, file);
  
        if (uploadError) {
          throw new Error(uploadError.message);
        }
  
        console.log('uploadData:', uploadData);
        // uploadData.path == "cars/car_1686045239172.jpg"
        let uploadPath = null;
        if (uploadData.path) {
          uploadPath = uploadData.path; // "cars/..."
        } else if (uploadData.Key) {
          uploadPath = `cars/${uploadData.Key}`;
        } else {
          throw new Error('Не вдалося визначити шлях до файла після upload.');
        }
  
        // 8) Убираем "cars/" из пути, чтобы получить только имя файла
        const pathWithoutBucket = uploadPath.replace(/^cars\//, '');
        console.log('pathWithoutBucket для getPublicUrl:', pathWithoutBucket);
  
        // 9) Получаем публичный URL (getPublicUrl → SELECT storage.objects)
        const { data: urlData, error: urlError } = sb
          .storage
          .from('cars')
          .getPublicUrl(pathWithoutBucket);
  
        if (urlError) {
          throw new Error(urlError.message);
        }
        console.log('urlData:', urlData);
        const publicUrl = urlData.publicUrl;
        if (!publicUrl) {
          throw new Error('getPublicUrl повернув порожній URL');
        }
  
        // 10) Вставляем запись в таблицу public.cars (INSERT public.cars)
        // Соберём объект с ВСЕМИ колонками:
        const newCar = {
          title,
          description,
          brand,
          model,
          year,
          price,
          mileage,
          fuel_type,
          transmission,
          color: color || null,
          body_type: body_type || null,
          drive_type: drive_type || null,
          acceleration: accelerationVal ? parseFloat(accelerationVal) : null,
          max_speed: max_speedVal ? parseInt(max_speedVal, 10) : null,
          power: power || null,
          images: publicUrl
        };
  
        console.log('newCar record to insert:', newCar);
  
        const { data: insertData, error: insertError } = await sb
          .from('cars')
          .insert([newCar]);
  
        if (insertError) {
          throw new Error(insertError.message);
        }
  
        // 11) Успех: показываем сообщение и сбрасываем форму
        messageBox.textContent = 'Автомобіль успішно додано до бази!';
        messageBox.style.color = '#2e7d32';
        messageBox.style.display = 'block';
        form.reset();
        fileInput.value = null;
      } catch (err) {
        console.error(err);
        messageBox.textContent = `Помилка: ${err.message}`;
        messageBox.style.color = '#d32f2f';
        messageBox.style.display = 'block';
      }
    });
  });
