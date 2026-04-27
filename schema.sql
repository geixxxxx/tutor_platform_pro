-- Tutor platform PostgreSQL schema

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(200) NOT NULL UNIQUE,
  password_hash VARCHAR(200) NOT NULL,
  role VARCHAR(20) NOT NULL,
  subject VARCHAR(100),
  tutor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS courses (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  subject VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  lessons INT NOT NULL,
  price INT NOT NULL,
  emoji VARCHAR(5) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  total INT NOT NULL,
  method VARCHAR(60) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS homeworks (
  id SERIAL PRIMARY KEY,
  tutor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  student_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'assigned',
  attachments TEXT,
  student_answer TEXT,
  student_attachments TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webinars (
  id SERIAL PRIMARY KEY,
  tutor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  is_live BOOLEAN DEFAULT false,
  recording_url VARCHAR(400),
  started_at TIMESTAMP,
  duration INT,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO courses (title, subject, description, lessons, price, emoji)
VALUES
  ('ЕГЭ Математика Профиль', 'Математика', 'Полный курс подготовки к профильной части ЕГЭ.', 24, 4900, '📐'),
  ('Английский с нуля до B2', 'Английский', 'Интенсивный курс с живыми вебинарами и практикой.', 36, 6500, '🇬🇧'),
  ('Физика ОГЭ — полный курс', 'Физика', 'Подготовка к ОГЭ с решением задач и разбором теории.', 18, 3200, '⚡'),
  ('Химия ЕГЭ — базовый уровень', 'Химия', 'Курс для уверенного решения задания по химии.', 20, 3800, '🧪'),
  ('Русский язык — орфография', 'Русский', 'Тренировка по орфографии и сочинению.', 15, 2900, '📖'),
  ('История России 9–11 класс', 'История', 'Курс по ключевым темам истории России.', 22, 4200, '🌍')
ON CONFLICT DO NOTHING;

INSERT INTO users (name, email, password_hash, role, subject)
VALUES
  ('Алексей Смирнов', 'student@example.com', '$2a$10$leC8dAwxcmxxVevozqqHnuaz8abMZ0uynVrWPRH.GDlNSR6XVuGxq', 'student', NULL),
  ('Елена Михайлова', 'tutor@example.com', '$2a$10$UJI2agoTW/3DaM9As1yPPOxAw1UIVavCZGvctJyZ/z1S9hZ5v4eGm', 'tutor', 'Математика')
ON CONFLICT DO NOTHING;

INSERT INTO homeworks (tutor_id, student_id, title, description, due_date, status, attachments)
VALUES
  ((SELECT id FROM users WHERE email = 'tutor@example.com'), (SELECT id FROM users WHERE email = 'student@example.com'), 'Тригонометрические уравнения', 'Решите задачи 1-15 с подробными выкладками.', CURRENT_DATE + INTERVAL '2 days', 'assigned', 'Формулы и примеры'),
  ((SELECT id FROM users WHERE email = 'tutor@example.com'), (SELECT id FROM users WHERE email = 'student@example.com'), 'Reading Comprehension', 'Прочтите текст и ответьте на вопросы.', CURRENT_DATE + INTERVAL '4 days', 'assigned', 'Текстовый файл');

INSERT INTO webinars (tutor_id, title, is_live, recording_url, started_at, duration)
VALUES
  ((SELECT id FROM users WHERE email = 'tutor@example.com'), 'Математика: тригонометрия', true, NULL, NOW(), 0),
  ((SELECT id FROM users WHERE email = 'tutor@example.com'), 'Английский: Present Perfect', false, 'https://example.com/recording.mp4', NOW() - INTERVAL '2 days', 52);
