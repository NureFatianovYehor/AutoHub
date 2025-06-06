document.addEventListener('DOMContentLoaded', () => {
    // 1) Ініціалізуємо Supabase-клієнта (після того, як вже підключений supabase.js і config.js)
    const SUPABASE_URL = window.AUTOHUB_CONFIG?.SUPABASE_URL;
    const SUPABASE_ANON_KEY = window.AUTOHUB_CONFIG?.SUPABASE_KEY;
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('Не знайдено AUTOHUB_CONFIG з SUPABASE_URL / SUPABASE_KEY');
      return;
    }
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
    // 2) Функція, що виводить у header або «Привіт, Ім’я» + «Вийти», або «Увійти/Зареєструватися»
    async function showUserNameOrAuthButtons() {
      const container = document.getElementById('user-name');
      if (!container) return;
  
      // Очищуємо перед заповненням:
      container.innerHTML = '';
  
      // 2.1) Прагнемо отримати поточного користувача через Supabase Auth
      let user = null;
      try {
        const { data, error } = await supabaseClient.auth.getUser();
        if (!error && data.user) {
          user = data.user;
        }
      } catch (e) {
        console.warn('Помилка при отриманні користувача:', e);
      }
  
      // 2.2) Якщо користувач не залогінений → виводимо «Увійти» та «Зареєструватися»
      if (!user) {
        const loginLink = document.createElement('a');
        loginLink.href = 'login.html';
        loginLink.textContent = 'Увійти';
        loginLink.className = 'header__user--link';
  
        const signupLink = document.createElement('a');
        signupLink.href = 'signup.html';
        signupLink.textContent = 'Зареєструватися';
        signupLink.className = 'header__user--link';
  
        container.append(loginLink, signupLink);
        return;
      }
  
      // 2.3) Якщо користувач є → намагаємося підвантажити його ім’я/прізвище з таблиці profiles
      let fullName = user.email; // за замовчуванням, якщо first_name/last_name не знайдено
      try {
        const { data: profile, error: profileError } = await supabaseClient
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single();
  
        if (!profileError && profile) {
          const fn = (profile.first_name || '').trim();
          const ln = (profile.last_name || '').trim();
          if (fn || ln) {
            fullName = `${fn} ${ln}`.trim();
          }
        }
      } catch (e) {
        console.warn('Не вдалося отримати профіль користувача:', e);
      }
  
      // 2.4) Виводимо «Привіт, Ім’я Прізвище!» + кнопку «Вийти»
      container.textContent = `Привіт, ${fullName}!`;
  
      const logoutBtn = document.createElement('button');
      logoutBtn.textContent = 'Вийти';
      logoutBtn.id = 'logout-button';
  
      logoutBtn.addEventListener('click', async () => {
        const { error } = await supabaseClient.auth.signOut();
        if (error) {
          console.error('Помилка при виході:', error.message);
          return;
        }
        // Перезавантажуємо сторінку після виходу
        location.reload();
      });
      
  
      container.appendChild(logoutBtn);
    }
  
    // 3) Викликаємо одразу під час завантаження сторінки
    showUserNameOrAuthButtons();
  });
  