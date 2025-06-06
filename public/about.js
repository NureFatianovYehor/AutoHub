// public/about.js

document.addEventListener('DOMContentLoaded', () => {
    // 1) Ініціалізація Supabase
    const SUPABASE_URL      = window.AUTOHUB_CONFIG?.SUPABASE_URL;
    const SUPABASE_ANON_KEY = window.AUTOHUB_CONFIG?.SUPABASE_KEY;
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('Не знайдено AUTOHUB_CONFIG з SUPABASE_URL / SUPABASE_KEY');
      return;
    }
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
    // 2) Приховати «Додати авто» для не-адміна
    const addCarLink = document.getElementById('add-car-link');
    if (addCarLink) {
      addCarLink.style.display = 'none';
    }
    (async () => {
      try {
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (userError || !user) return;
  
        const { data: profileData, error: profileError } = await supabaseClient
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        if (profileError || !profileData) return;
  
        if (profileData.role === 'admin' && addCarLink) {
          addCarLink.style.display = 'inline-block';
        }
      } catch {
        // у разі помилки нічого не робимо
      }
    })();
  
    // 3) Показати логін/реєстрацію або ім'я + Вийти
    const userContainer = document.getElementById('user-name');
    (async () => {
      try {
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (userError) return;
  
        if (!user) {
          // Якщо не залогінений
          userContainer.innerHTML = `
            <a href="login.html" class="header__link" style="margin-right: 8px; color: #ffffff;">Увійти</a>
            <a href="signup.html" class="header__link" style="color: #ffffff;">Реєстрація</a>
          `;
        } else {
          // Якщо вже залогінений
          userContainer.innerHTML = `
            <span>Привіт, ${user.email.split('@')[0]}</span>
            <button id="logout-btn" style="
              margin-left: 12px;
              background: transparent;
              border: 1px solid #ffffff;
              color: #ffffff;
              padding: 4px 10px;
              border-radius: 4px;
              cursor: pointer;
            ">Вийти</button>
          `;
          document.getElementById('logout-btn').addEventListener('click', async () => {
            await supabaseClient.auth.signOut();
            window.location.reload();
          });
        }
      } catch (e) {
        console.error(e);
      }
    })();
  });
  