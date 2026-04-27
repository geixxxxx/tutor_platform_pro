const API = '/api';
let token = localStorage.getItem('token');
let currentUser = null;
let selectedRole = 'student';
let cart = [];

const state = {
  page: 'dashboard',
};

window.addEventListener('load', async () => {
  renderLandingCourses();
  if (token) {
    await loadProfile();
    if (currentUser) showApp();
  }
});

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

function openAuth(type) {
  document.getElementById('authModal').classList.remove('hidden');
  switchAuth(type);
}

function closeAuth() {
  document.getElementById('authModal').classList.add('hidden');
}

function switchAuth(type) {
  document.getElementById('tabLogin').classList.toggle('active', type === 'login');
  document.getElementById('tabRegister').classList.toggle('active', type === 'register');
  document.getElementById('loginForm').classList.toggle('hidden', type !== 'login');
  document.getElementById('registerForm').classList.toggle('hidden', type !== 'register');
}

function toggleSubjectField() {
  selectedRole = document.getElementById('registerRole').value;
  document.getElementById('subjectGroup').classList.toggle('hidden', selectedRole !== 'tutor');
}

function setToken(value) {
  token = value;
  if (value) localStorage.setItem('token', value);
  else localStorage.removeItem('token');
}

async function submitLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  if (!email || !password) return showToast('Заполните email и пароль');

  const response = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const result = await response.json();
  if (!response.ok) return showToast(result.error || 'Не удалось войти');
  setToken(result.token);
  currentUser = result.user;
  closeAuth();
  showApp();
}

async function submitRegister() {
  const name = document.getElementById('registerName').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value.trim();
  const role = document.getElementById('registerRole').value;
  const subject = document.getElementById('registerSubject').value.trim();

  if (!name || !email || !password) return showToast('Заполните все поля регистрации');
  if (role === 'tutor' && !subject) return showToast('Укажите предмет для репетитора');

  const response = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, role, subject }),
  });
  const result = await response.json();
  if (!response.ok) return showToast(result.error || 'Не удалось зарегистрироваться');
  setToken(result.token);
  currentUser = result.user;
  closeAuth();
  showApp();
}

async function loadProfile() {
  try {
    const response = await fetch(`${API}/user/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await response.json();
    if (!response.ok) {
      setToken(null);
      return;
    }
    currentUser = result.user;
  } catch (err) {
    setToken(null);
  }
}

function showApp() {
  document.getElementById('landing').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('sidebarRole').textContent = currentUser.role === 'tutor' ? 'Репетитор' : 'Ученик';
  document.getElementById('userName').textContent = currentUser.name;
  document.getElementById('userEmail').textContent = currentUser.email;
  document.getElementById('userInitials').textContent = currentUser.name.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase();
  buildSidebar();
  navigate('dashboard');
}

function performLogout() {
  setToken(null);
  currentUser = null;
  cart = [];
  document.getElementById('cartCount').textContent = '0';
  document.getElementById('app').classList.add('hidden');
  document.getElementById('landing').classList.remove('hidden');
}

function buildSidebar() {
  const nav = document.getElementById('sidebarNav');
  const studentItems = [
    { id: 'dashboard', label: 'Дашборд', icon: 'Д' },
    { id: 'schedule', label: 'Расписание', icon: 'Р' },
    { id: 'homework', label: 'Домашние задания', icon: 'ДЗ' },
    { id: 'webinar', label: 'Вебинары', icon: 'В' },
    { id: 'shop', label: 'Магазин', icon: 'М' },
    { id: 'profile', label: 'Профиль', icon: 'П' },
  ];
  const tutorItems = [
    { id: 'dashboard', label: 'Дашборд', icon: 'Д' },
    { id: 'students', label: 'Ученики', icon: 'У' },
    { id: 'schedule', label: 'Расписание', icon: 'Р' },
    { id: 'homework', label: 'Задания', icon: 'ДЗ' },
    { id: 'webinar', label: 'Вебинар', icon: 'В' },
    { id: 'profile', label: 'Профиль', icon: 'П' },
  ];
  const items = currentUser.role === 'tutor' ? tutorItems : studentItems;
  nav.innerHTML = items
    .map(
      (item) => `
        <button class="nav-item" onclick="navigate('${item.id}')" id="nav-${item.id}" data-tooltip="${item.label}">
          <span>${item.icon}</span>
        </button>
      `
    )
    .join('');
}

async function navigate(page) {
  state.page = page;
  document.querySelectorAll('.nav-item').forEach((button) => {
    button.classList.toggle('active', button.id === `nav-${page}`);
  });
  document.getElementById('pageTitle').textContent = getPageTitle(page);
  document.getElementById('pageSubtitle').textContent = getPageSubtitle(page);
  if (page === 'dashboard') return renderDashboard();
  if (page === 'schedule') return renderSchedule();
  if (page === 'homework') return renderHomework();
  if (page === 'webinar') return renderWebinar();
  if (page === 'shop') return renderShop();
  if (page === 'students') return renderStudents();
  if (page === 'profile') return renderProfile();
}

function getPageTitle(page) {
  const titles = {
    dashboard: 'Дашборд',
    schedule: 'Расписание',
    homework: 'Домашние задания',
    webinar: 'Вебинары',
    shop: 'Магазин курсов',
    students: 'Ученики',
    profile: 'Профиль',
  };
  return titles[page] || 'Кабинет';
}

function getPageSubtitle(page) {
  const subtitles = {
    dashboard: 'Обзор ключевых показателей',
    schedule: 'Ваши занятия на неделю',
    homework: 'Задания и сдача работ',
    webinar: 'Прямой эфир и записи',
    shop: 'Курсы для покупки',
    students: 'Список учеников и прогресс',
    profile: 'Настройки аккаунта и уведомления',
  };
  return subtitles[page] || '';
}

async function renderDashboard() {
  const container = document.getElementById('pageBody');
  container.innerHTML = '<div class="card"><p>Загрузка...</p></div>';
  const response = await fetch(`${API}/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) return container.innerHTML = '<div class="card">Не удалось загрузить дашборд.</div>';
  const data = await response.json();

  const upcomingTasks = (data.homework || [])
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 2);
  const activeWebinars = (data.webinars || []).filter((item) => item.is_live).length;
  const totalCourses = 6;

  if (data.role === 'student') {
    container.innerHTML = `
      <div class="dashboard-grid">
        <div class="card metric-card">
          <div class="metric-title">Занятий сегодня</div>
          <div class="metric-value">${data.schedule.length}</div>
          <div class="metric-note">В расписании</div>
        </div>
        <div class="card metric-card">
          <div class="metric-title">Домашних заданий</div>
          <div class="metric-value">${data.homework.length}</div>
          <div class="metric-note">До ближайшего срока</div>
        </div>
        <div class="card metric-card">
          <div class="metric-title">Вебинаров</div>
          <div class="metric-value">${data.webinars.length}</div>
          <div class="metric-note">${activeWebinars} сейчас online</div>
        </div>
        <div class="card metric-card">
          <div class="metric-title">Курсов</div>
          <div class="metric-value">${totalCourses}</div>
          <div class="metric-note">Доступно в магазине</div>
        </div>
      </div>
      <div class="card">
        <h3>Быстрые действия</h3>
        <div class="action-row">
          <button class="btn btn-primary" onclick="navigate('homework')">Открыть ДЗ</button>
          <button class="btn btn-outline" onclick="navigate('webinar')">Мои вебинары</button>
        </div>
      </div>
      <div class="grid-2">
        <div class="card">
          <h3>Ближайшие задания</h3>
          <div class="homework-list">
            ${upcomingTasks
              .map(
                (item) => `<div class="list-item"><h4>${item.title}</h4><p>${item.description}</p><div class="meta"><span>До ${new Date(item.due_date).toLocaleDateString('ru')}</span><span>${item.tutor_name}</span></div></div>`
              )
              .join('')}
          </div>
        </div>
        <div class="card">
          <h3>Расписание</h3>
          <div class="schedule-list">
            ${data.schedule
              .map(
                (item) => `<div class="list-item"><h4>${item.time} — ${item.title}</h4><div class="meta"><span>${item.teacher}</span><span>${item.title.includes('Математика') ? 'Математика' : 'Общий курс'}</span></div></div>`
              )
              .join('')}
          </div>
        </div>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="dashboard-grid">
        <div class="card metric-card">
          <div class="metric-title">Учеников</div>
          <div class="metric-value">${data.students.length}</div>
          <div class="metric-note">Активных сегодня</div>
        </div>
        <div class="card metric-card">
          <div class="metric-title">Заданий</div>
          <div class="metric-value">${data.assigned.length}</div>
          <div class="metric-note">Ожидают проверки</div>
        </div>
        <div class="card metric-card">
          <div class="metric-title">Вебинаров</div>
          <div class="metric-value">${data.webinars.length}</div>
          <div class="metric-note">Последние эфиры</div>
        </div>
        <div class="card metric-card">
          <div class="metric-title">Сессий</div>
          <div class="metric-value">${data.schedule.length}</div>
          <div class="metric-note">Запланировано</div>
        </div>
      </div>
      <div class="card">
        <h3>Быстрые действия</h3>
        <div class="action-row">
          <button class="btn btn-primary" onclick="navigate('students')">Список учеников</button>
          <button class="btn btn-outline" onclick="navigate('homework')">Создать задание</button>
        </div>
      </div>
      <div class="grid-2">
        <div class="card">
          <h3>Последние задачи</h3>
          <div class="homework-list">
            ${data.assigned
              .slice(0, 3)
              .map(
                (item) => `<div class="list-item"><h4>${item.title}</h4><p>${item.description}</p><div class="meta"><span>${item.student_name}</span><span>До ${new Date(item.due_date).toLocaleDateString('ru')}</span></div></div>`
              )
              .join('')}
          </div>
        </div>
        <div class="card">
          <h3>Ученики</h3>
          <div class="student-list">
            ${data.students
              .map(
                (item) => `<div class="list-item"><h4>${item.name}</h4><div class="meta"><span>${item.subject || '—'}</span><span>${item.email}</span></div></div>`
              )
              .join('')}
          </div>
        </div>
      </div>
    `;
  }
}

async function renderSchedule() {
  const container = document.getElementById('pageBody');
  container.innerHTML = '<div class="card"><p>Загрузка...</p></div>';
  const response = await fetch(`${API}/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) return container.innerHTML = '<div class="card">Не удалось загрузить расписание.</div>';
  const data = await response.json();

  container.innerHTML = `
    <div class="card">
      <h3>Моё расписание</h3>
      <div class="schedule-list">
        ${data.schedule
          .map(
            (item) => `<div class="list-item"><h4>${item.time} — ${item.title}</h4><div class="meta"><span>${item.teacher || item.group || '—'}</span><span>${item.title.includes('Математика') ? 'Математика' : 'Общий курс'}</span></div></div>`
          )
          .join('')}
      </div>
    </div>
  `;
}

async function renderHomework() {
  const response = await fetch(`${API}/homework`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await response.json();
  const container = document.getElementById('pageBody');
  if (!response.ok) return container.innerHTML = `<div class="card">${data.error || 'Ошибка загрузки заданий'}</div>`;

  if (currentUser.role === 'student') {
    container.innerHTML = `
      <div class="card">
        <h3>Ваши задания</h3>
        <div class="homework-list">
          ${data.list
            .map(
              (item) => `<div class="list-item"><h4>${item.title}</h4><p>${item.description}</p><div class="meta"><span>До ${new Date(item.due_date).toLocaleDateString('ru')}</span><span>${item.tutor_name}</span></div><button class="btn btn-outline" onclick="submitHomework(${item.id})">Сдать работу</button></div>`
            )
            .join('')}
        </div>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="card">
        <h3>Задания для учеников</h3>
        <div class="homework-list">
          ${data.list
            .map(
              (item) => `<div class="list-item"><h4>${item.title}</h4><p>${item.description}</p><div class="meta"><span>${item.student_name}</span><span>До ${new Date(item.due_date).toLocaleDateString('ru')}</span></div></div>`
            )
            .join('')}
        </div>
      </div>
      <div class="card">
        <h3>Назначить новое ДЗ</h3>
        <div class="form-row">
          <input id="hwStudent" placeholder="ID ученика (например 1)" />
          <input id="hwTitle" placeholder="Название задания" />
          <textarea id="hwDescription" placeholder="Описание задания"></textarea>
          <input id="hwDueDate" type="date" />
          <button class="btn btn-primary" onclick="assignHomework()">Отправить ученику</button>
        </div>
      </div>
    `;
  }
}

function submitHomework(id) {
  const answer = prompt('Напишите ответ ученика или ссылку на файл');
  if (!answer) return;
  fetch(`${API}/homework/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ homeworkId: id, answer, attachments: 'Фото приложения' }),
  }).then(async (res) => {
    const data = await res.json();
    if (!res.ok) return showToast(data.error || 'Ошибка отправки');
    showToast(data.message);
    renderHomework();
  });
}

async function assignHomework() {
  const studentId = document.getElementById('hwStudent').value.trim();
  const title = document.getElementById('hwTitle').value.trim();
  const description = document.getElementById('hwDescription').value.trim();
  const dueDate = document.getElementById('hwDueDate').value;
  if (!studentId || !title || !description || !dueDate) return showToast('Заполните все поля для задания');

  const response = await fetch(`${API}/homework/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ studentId, title, description, dueDate, attachments: 'Фото и материалы' }),
  });
  const data = await response.json();
  if (!response.ok) return showToast(data.error || 'Ошибка отправки задания');
  showToast(data.message);
  renderHomework();
}

async function renderWebinar() {
  const response = await fetch(`${API}/webinar`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await response.json();
  const container = document.getElementById('pageBody');
  if (!response.ok) return container.innerHTML = `<div class="card">${data.error || 'Ошибка загрузки вебинаров'}</div>`;

  container.innerHTML = `
    <div class="card video-card">
      <h3>Вебинары</h3>
      <div class="video-player">
        <div class="video-label">${data.webinars[0]?.title || 'Нет активных вебинаров'}</div>
        <div class="controls">
          <button class="btn btn-primary" onclick="showToast('▶ Просмотр вебинара')">Запустить</button>
          <div class="progress"><span></span></div>
          <span>${data.webinars[0]?.is_live ? 'LIVE' : 'Запись'}</span>
        </div>
      </div>
    </div>
    <div class="card">
      <h3>Записи</h3>
      <div class="video-list">
        ${data.webinars
          .map(
            (item) => `<div class="list-item"><h4>${item.title}</h4><div class="meta"><span>${item.is_live ? 'Прямой эфир' : 'Запись'}</span><span>${item.started_at ? new Date(item.started_at).toLocaleDateString('ru') : '—'}</span></div></div>`
          )
          .join('')}
      </div>
    </div>
  `;
}

async function startWebinar() {
  const title = prompt('Название вебинара');
  if (!title) return;
  const response = await fetch(`${API}/webinar/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title }),
  });
  const data = await response.json();
  showToast(data.message || 'Вебинар запущен');
  renderWebinar();
}

async function renderShop() {
  const response = await fetch(`${API}/courses`);
  const data = await response.json();
  const container = document.getElementById('pageBody');
  if (!response.ok) return container.innerHTML = `<div class="card">${data.error || 'Ошибка загрузки курсов'}</div>`;

  container.innerHTML = `
    <div class="card">
      <h3>Магазин курсов</h3>
      <div class="courses-row">
        ${data.courses
          .map(
            (course) => `<div class="course-card"><div class="course-header"><div class="course-thumb">${course.emoji}</div><div><h4>${course.title}</h4><span>${course.subject}</span></div></div><p>${course.description}</p><div class="course-card-footer"><span>${course.price} ₽</span><button class="btn btn-primary" onclick="addToCart(${course.id})">В корзину</button></div></div>`
          )
          .join('')}
      </div>
    </div>
  `;
}

function addToCart(courseId) {
  if (cart.includes(courseId)) return showToast('Курс уже в корзине');
  cart.push(courseId);
  document.getElementById('cartCount').textContent = cart.length;
  renderCart();
  showToast('Курс добавлен в корзину');
}

function openCart() {
  document.getElementById('cartDrawer').classList.remove('hidden');
  renderCart();
}

function closeCart() {
  document.getElementById('cartDrawer').classList.add('hidden');
}

function renderCart() {
  const cartItems = document.getElementById('cartItems');
  if (!cart.length) {
    cartItems.innerHTML = '<div class="cart-item"><p>Корзина пуста</p></div>';
    document.getElementById('cartTotal').textContent = '0 ₽';
    return;
  }
  fetch(`${API}/courses`)
    .then((res) => res.json())
    .then((data) => {
      const selected = data.courses.filter((course) => cart.includes(course.id));
      cartItems.innerHTML = selected
        .map(
          (item) => `<div class="cart-item"><h4>${item.title}</h4><div class="meta"><span>${item.subject}</span><span>${item.price} ₽</span></div></div>`
        )
        .join('');
      const total = selected.reduce((sum, item) => sum + item.price, 0);
      document.getElementById('cartTotal').textContent = `${total} ₽`;
    });
}

async function checkout() {
  if (!cart.length) return showToast('Добавьте курс в корзину');
  const response = await fetch(`${API}/payment/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ courseIds: cart }),
  });
  const data = await response.json();
  if (!response.ok) return showToast(data.error || 'Ошибка оплаты');
  showToast(data.message || 'Оплата прошла успешно');
  cart = [];
  document.getElementById('cartCount').textContent = '0';
  renderCart();
}

async function renderStudents() {
  const response = await fetch(`${API}/students`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await response.json();
  const container = document.getElementById('pageBody');
  if (!response.ok) return container.innerHTML = `<div class="card">${data.error || 'Ошибка загрузки учеников'}</div>`;

  container.innerHTML = `
    <div class="grid-2">
      <div class="card">
        <h3>Мои ученики</h3>
        <div class="student-list">
          ${data.assigned.length
            ? data.assigned
                .map(
                  (student) => `<div class="list-item"><div class="student-row"><div><h4>${student.name}</h4><div class="meta"><span>${student.subject || '—'}</span><span>${student.email}</span></div></div><button class="btn btn-outline" onclick="removeStudent(${student.id})">Открепить</button></div></div>`
                )
                .join('')
            : '<div class="list-item"><p>Пока нет закрепленных учеников.</p></div>'}
        </div>
      </div>
      <div class="card">
        <h3>Доступные ученики</h3>
        <div class="student-list">
          ${data.available.length
            ? data.available
                .map(
                  (student) => `<div class="list-item"><div class="student-row"><div><h4>${student.name}</h4><div class="meta"><span>${student.subject || '—'}</span><span>${student.email}</span></div></div><button class="btn btn-primary" onclick="assignStudent(${student.id})">Добавить</button></div></div>`
                )
                .join('')
            : '<div class="list-item"><p>Нет доступных учеников для добавления.</p></div>'}
        </div>
      </div>
    </div>
    <div class="card">
      <h3>Добавить ученика по email</h3>
      <div class="form-row">
        <input id="studentEmail" type="email" placeholder="student@example.com" />
        <button class="btn btn-primary" onclick="assignStudentByEmail()">Добавить</button>
      </div>
      <p class="note">Если ученик уже зарегистрирован, просто укажите его email.</p>
    </div>
    <div class="card">
      <h3>Создать нового ученика</h3>
      <div class="form-row">
        <input id="newStudentName" type="text" placeholder="Имя ученика" />
        <input id="newStudentEmail" type="email" placeholder="Email ученика" />
        <input id="newStudentPassword" type="password" placeholder="Пароль (по умолчанию student123)" />
        <button class="btn btn-primary" onclick="createStudent()">Создать ученика</button>
      </div>
      <p class="note">Созданный ученик автоматически прикрепляется к вам.</p>
    </div>
  `;
}

async function assignStudent(studentId) {
  const response = await fetch(`${API}/students`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ studentId }),
  });
  const data = await response.json();
  if (!response.ok) return showToast(data.error || 'Не удалось добавить ученика');
  showToast(`Ученик ${data.student.name} добавлен`);
  renderStudents();
}

async function assignStudentByEmail() {
  const email = document.getElementById('studentEmail').value.trim();
  if (!email) return showToast('Введите email ученика');
  const response = await fetch(`${API}/students`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ email }),
  });
  const data = await response.json();
  if (!response.ok) return showToast(data.error || 'Не удалось добавить ученика');
  showToast(`Ученик ${data.student.name} добавлен`);
  document.getElementById('studentEmail').value = '';
  renderStudents();
}

async function createStudent() {
  const name = document.getElementById('newStudentName').value.trim();
  const email = document.getElementById('newStudentEmail').value.trim();
  const password = document.getElementById('newStudentPassword').value.trim();
  if (!name || !email) return showToast('Введите имя и email ученика');

  const response = await fetch(`${API}/students/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name, email, password }),
  });
  const data = await response.json();
  if (!response.ok) return showToast(data.error || 'Не удалось создать ученика');
  showToast(`Ученик ${data.student.name} создан. Пароль: ${data.password}`);
  document.getElementById('newStudentName').value = '';
  document.getElementById('newStudentEmail').value = '';
  document.getElementById('newStudentPassword').value = '';
  renderStudents();
}

async function removeStudent(studentId) {
  const response = await fetch(`${API}/students/${studentId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!response.ok) return showToast(data.error || 'Не удалось открепить ученика');
  showToast('Ученик откреплён');
  renderStudents();
}

function renderProfile() {
  const container = document.getElementById('pageBody');
  container.innerHTML = `
    <div class="card">
      <h3>Профиль</h3>
      <div class="form-row profile-grid">
        <label>Имя</label>
        <input id="profileName" value="${currentUser.name}" />
        <label>Email</label>
        <input id="profileEmail" value="${currentUser.email}" />
        ${currentUser.role === 'tutor' ? `<label>Предмет</label><input id="profileSubject" value="${currentUser.subject || ''}" />` : ''}
        <label>Новый пароль</label>
        <input id="profilePassword" type="password" placeholder="Оставьте пустым, чтобы не менять" />
      </div>
    </div>
    <div class="card">
      <h3>Настройки</h3>
      <div class="form-row">
        <button class="btn btn-primary" onclick="updateProfile()">Сохранить изменения</button>
      </div>
    </div>
  `;
}

async function updateProfile() {
  const name = document.getElementById('profileName').value.trim();
  const email = document.getElementById('profileEmail').value.trim();
  const subject = currentUser.role === 'tutor' ? document.getElementById('profileSubject').value.trim() : undefined;
  const password = document.getElementById('profilePassword').value.trim();

  if (!name || !email) return showToast('Имя и email обязательны');

  const response = await fetch(`${API}/user/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name, email, password: password || undefined, subject }),
  });
  const data = await response.json();
  if (!response.ok) return showToast(data.error || 'Не удалось сохранить');
  currentUser = data.user;
  showToast('Профиль обновлен');
  showApp();
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2600);
}

function renderLandingCourses() {
  fetch(`${API}/courses`)
    .then((res) => res.json())
    .then((data) => {
      const container = document.getElementById('landingCourses');
      if (!data.courses) return;
      container.innerHTML = data.courses
        .slice(0, 3)
        .map(
          (course) => `<div class="course-card"><div class="course-thumb">${course.emoji}</div><h3>${course.title}</h3><p>${course.subject}</p><div class="course-card-footer"><span>${course.price} ₽</span><button class="btn btn-primary" onclick="addToCart(${course.id})">Купить</button></div></div>`
        )
        .join('');
    });
}

function demoLogin(role) {
  const demo = role === 'tutor' ? { email: 'tutor@example.com', password: 'tutor123' } : { email: 'student@example.com', password: 'student123' };
  document.getElementById('loginEmail').value = demo.email;
  document.getElementById('loginPassword').value = demo.password;
  submitLogin();
}
