// === order.js ===

const SUPABASE_URL = window.AUTOHUB_CONFIG?.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.AUTOHUB_CONFIG?.SUPABASE_KEY;
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function loadOrders() {
  const { data: messages, error } = await supabase
    .from('messages')
    .select(`
      id,
      message,
      created_at,
      user_id,
      car_id,
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

  messages.forEach(row => {
    const tr = document.createElement('tr');

    const user = row.profiles
      ? `${row.profiles.first_name || ''} ${row.profiles.last_name || ''} (${row.profiles.email})`
      : 'Невідомий користувач';

    const car = row.cars
      ? `${row.cars.brand} ${row.cars.model} (${row.cars.year}) - $${row.cars.price}`
      : 'Невідоме авто';

    const tdUser = document.createElement('td');
    tdUser.textContent = user;

    const tdCar = document.createElement('td');
    tdCar.textContent = car;

    const tdMsg = document.createElement('td');
    tdMsg.textContent = row.message || '-';

    const tdDate = document.createElement('td');
    tdDate.textContent = new Date(row.created_at).toLocaleString();

    const tdDelete = document.createElement('td');
    const btn = document.createElement('button');
    btn.textContent = 'Видалити';
    btn.className = 'delete-order-btn';
    btn.addEventListener('click', async () => {
      if (confirm('Ви впевнені, що хочете видалити це замовлення?')) {
        const { error: deleteError } = await supabase
          .from('messages')
          .delete()
          .eq('id', row.id);
        if (deleteError) {
          alert('Помилка при видаленні замовлення');
        } else {
          tr.remove();
        }
      }
    });
    tdDelete.appendChild(btn);

    tr.append(tdUser, tdCar, tdMsg, tdDate, tdDelete);
    tbody.appendChild(tr);
  });
}

document.addEventListener('DOMContentLoaded', loadOrders);