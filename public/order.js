// order.js

// 1) Ініціалізація Supabase
const SUPABASE_URL      = window.AUTOHUB_CONFIG?.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.AUTOHUB_CONFIG?.SUPABASE_KEY;
const supabase          = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2) Показ/приховання header-елементів та UI авторизації
async function initHeaderUI() {
  const { data: { user } } = await supabase.auth.getUser();
  const userEl   = document.getElementById('user-name');
  const addCarEl = document.getElementById('add-car-link');
  const orderEl  = document.getElementById('order-link');

  if (user) {
    // Отримуємо profile одним запитом: first_name, last_name, role
    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('first_name, last_name, role')
      .eq('id', user.id)
      .single();

    const displayName = (profile && profile.first_name && profile.last_name)
      ? `${profile.first_name} ${profile.last_name}`
      : user.email.split('@')[0];

    // Вставляємо ім’я користувача + кнопку Вийти
    userEl.innerHTML = `
      <span>Привіт, ${displayName}</span>
      <button id="logout-btn">Вийти</button>
    `;
    document.getElementById('logout-btn').addEventListener('click', async () => {
      await supabase.auth.signOut();
      window.location.reload();
    });

    // Показуємо “Додати авто” та “Історія замовлень” для admin
    if (!profErr && profile.role === 'admin') {
      if (addCarEl) addCarEl.style.display = 'inline-block';
      if (orderEl)  orderEl.style.display  = 'inline-block';
    }
  } else {
    // Якщо не залогінений — показуємо кнопки увійти/реєстрація
    userEl.innerHTML = `
      <a href="login.html"    class="header__user-button">Увійти</a>
      <a href="register.html" class="header__user-button">Реєстрація</a>
    `;
  }
}

// 3) Завантаження і рендер замовлень
async function loadOrders() {
  const { data: messages, error } = await supabase
    .from('messages')
    .select(`
      id,
      message,
      created_at,
      profiles (email, first_name, last_name),
      cars (brand, model, year, price)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Помилка при завантаженні замовлень:', error.message);
    return;
  }

  const tbody = document.querySelector('#orders-table tbody');
  tbody.innerHTML = '';

  messages.forEach(msg => {
    const tr = document.createElement('tr');

    const userText = msg.profiles
      ? `${msg.profiles.first_name} ${msg.profiles.last_name} (${msg.profiles.email})`
      : 'Невідомий користувач';

    const carText = msg.cars
      ? `${msg.cars.brand} ${msg.cars.model} (${msg.cars.year}) – $${msg.cars.price}`
      : 'Невідоме авто';

    tr.innerHTML = `
      <td>${userText}</td>
      <td>${carText}</td>
      <td>${msg.message || '-'}</td>
      <td>${new Date(msg.created_at).toLocaleString()}</td>
      <td><button class="delete-order-btn">Видалити</button></td>
    `;

    tr.querySelector('.delete-order-btn').addEventListener('click', async () => {
      if (confirm('Ви впевнені, що хочете видалити це замовлення?')) {
        const { error: delErr } = await supabase
          .from('messages')
          .delete()
          .eq('id', msg.id);
        if (delErr) alert('Не вдалося видалити замовлення');
        else tr.remove();
      }
    });

    tbody.appendChild(tr);
  });
}

// 4) Старт: ініціалізуємо шапку, перевіряємо права та вантажимо дані
document.addEventListener('DOMContentLoaded', async () => {
  await initHeaderUI();

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) {
    alert('Увійдіть як адміністратор');
    return window.location.href = '/login.html';
  }

  const { data: profile, error: roleErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (roleErr || profile?.role !== 'admin') {
    alert('Доступ лише для адміністраторів');
    return window.location.href = '/';
  }

  loadOrders();
});
