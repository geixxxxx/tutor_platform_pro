const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { pool } = require('../db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'intellika_demo_secret';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client')));

async function initServer() {
  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS tutor_id INTEGER REFERENCES users(id) ON DELETE SET NULL
  `);
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

async function getUserByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0];
}

async function getUserById(id) {
  const { rows } = await pool.query('SELECT id, name, email, role, subject, tutor_id FROM users WHERE id = $1', [id]);
  return rows[0];
}

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, subject } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Missing registration fields' });
    }

    const existing = await getUserByEmail(email.toLowerCase());
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const password_hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, subject) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, subject',
      [name, email.toLowerCase(), password_hash, role, role === 'tutor' ? subject || null : null]
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });

    const user = await getUserByEmail(email.toLowerCase());
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, subject: user.subject } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/user/profile', authMiddleware, async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to load profile' });
  }
});

app.patch('/api/user/profile', authMiddleware, async (req, res) => {
  try {
    const { name, email, password, subject } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });

    const user = await getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const existing = await pool.query('SELECT id FROM users WHERE email = $1 AND id <> $2', [email.toLowerCase(), user.id]);
    if (existing.rows.length) return res.status(409).json({ error: 'Email already in use' });

    const updates = ['name = $1', 'email = $2'];
    const values = [name, email.toLowerCase()];
    let paramIndex = 3;

    if (password) {
      const password_hash = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${paramIndex}`);
      values.push(password_hash);
      paramIndex += 1;
    }

    if (user.role === 'tutor') {
      updates.push(`subject = $${paramIndex}`);
      values.push(subject || null);
      paramIndex += 1;
    }

    values.push(req.user.id);
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, name, email, role, subject`;
    const { rows } = await pool.query(query, values);
    res.json({ user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to update profile' });
  }
});

app.get('/api/courses', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, title, subject, description, lessons, price, emoji FROM courses ORDER BY id');
    res.json({ courses: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to fetch courses' });
  }
});

app.post('/api/payment/checkout', authMiddleware, async (req, res) => {
  try {
    const { courseIds } = req.body;
    if (!Array.isArray(courseIds) || courseIds.length === 0) {
      return res.status(400).json({ error: 'No courses selected' });
    }
    const { rows } = await pool.query('SELECT id, title, price FROM courses WHERE id = ANY($1)', [courseIds]);
    const total = rows.reduce((sum, item) => sum + item.price, 0);
    await pool.query('INSERT INTO orders (user_id, total, method) VALUES ($1, $2, $3)', [req.user.id, total, 'yookassa']);
    res.json({ success: true, total, message: 'Платеж через Юкассу успешно проведен' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Checkout failed' });
  }
});

app.get('/api/dashboard', authMiddleware, async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.role === 'student') {
      const { rows: homework } = await pool.query(
        `SELECT h.id, h.title, h.description, h.due_date, h.status, u.name AS tutor_name, h.attachments
         FROM homeworks h
         LEFT JOIN users u ON u.id = h.tutor_id
         WHERE h.student_id = $1
         ORDER BY h.due_date ASC`,
        [user.id]
      );
      const { rows: webinars } = await pool.query(
        `SELECT id, title, is_live, recording_url, started_at, duration FROM webinars WHERE is_live = true OR recording_url IS NOT NULL ORDER BY started_at DESC LIMIT 5`
      );
      const schedule = [
        { time: '14:00', title: 'Математика — Тригонометрия', teacher: 'Ирина Петрова' },
        { time: '16:00', title: 'Английский — Present Perfect', teacher: 'Сергей Иванов' },
        { time: '18:30', title: 'Физика — Динамика', teacher: 'Наталья Кузьмина' }
      ];
      res.json({ role: 'student', user, schedule, homework, webinars });
    } else {
      const { rows: students } = await pool.query(
        `SELECT id, name, email, subject FROM users WHERE role = 'student' AND tutor_id = $1 ORDER BY name`,
        [user.id]
      );
      const { rows: assigned } = await pool.query(
        `SELECT h.id, h.title, h.description, h.due_date, h.status, u.name AS student_name, h.attachments
         FROM homeworks h
         LEFT JOIN users u ON u.id = h.student_id
         WHERE h.tutor_id = $1
         ORDER BY h.due_date ASC`,
        [user.id]
      );
      const { rows: webinars } = await pool.query(
        `SELECT id, title, is_live, recording_url, started_at, duration FROM webinars WHERE tutor_id = $1 OR is_live = true ORDER BY started_at DESC LIMIT 5`,
        [user.id]
      );
      const schedule = [
        { time: '13:00', title: 'Проверка домашки', group: 'Математика' },
        { time: '15:00', title: 'Вебинар по физике', group: 'Физика' },
        { time: '17:30', title: 'Консультация по английскому', group: 'Английский' }
      ];
      res.json({ role: 'tutor', user, schedule, students, assigned, webinars, homework: [] });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to load dashboard' });
  }
});

app.get('/api/homework', authMiddleware, async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    if (user.role === 'student') {
      const { rows } = await pool.query(
        `SELECT h.id, h.title, h.description, h.due_date, h.status, u.name AS tutor_name, h.attachments
         FROM homeworks h
         LEFT JOIN users u ON u.id = h.tutor_id
         WHERE h.student_id = $1
         ORDER BY h.due_date ASC`,
        [user.id]
      );
      res.json({ list: rows });
    } else {
      const { rows } = await pool.query(
        `SELECT h.id, h.title, h.description, h.due_date, h.status, u.name AS student_name, h.attachments
         FROM homeworks h
         LEFT JOIN users u ON u.id = h.student_id
         WHERE h.tutor_id = $1
         ORDER BY h.due_date ASC`,
        [user.id]
      );
      res.json({ list: rows });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to load homework' });
  }
});

app.post('/api/homework/assign', authMiddleware, async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    if (user.role !== 'tutor') return res.status(403).json({ error: 'Only tutors can assign homework' });
    const { studentId, title, description, dueDate, attachments } = req.body;
    if (!studentId || !title || !description || !dueDate) {
      return res.status(400).json({ error: 'Missing homework fields' });
    }
    await pool.query(
      'INSERT INTO homeworks (tutor_id, student_id, title, description, due_date, status, attachments) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [user.id, studentId, title, description, dueDate, 'assigned', attachments || '']
    );
    res.json({ success: true, message: 'Задание отправлено ученику' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to assign homework' });
  }
});

app.post('/api/homework/submit', authMiddleware, async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    if (user.role !== 'student') return res.status(403).json({ error: 'Only students can submit homework' });
    const { homeworkId, answer, attachments } = req.body;
    if (!homeworkId || !answer) return res.status(400).json({ error: 'Missing submission fields' });
    await pool.query(
      'UPDATE homeworks SET status = $1, student_answer = $2, student_attachments = $3 WHERE id = $4 AND student_id = $5',
      ['submitted', answer, attachments || '', homeworkId, user.id]
    );
    res.json({ success: true, message: 'Домашнее задание отправлено' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to submit homework' });
  }
});

app.get('/api/webinar', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT w.id, w.title, w.is_live, w.recording_url, w.started_at, w.duration, u.name AS tutor_name
       FROM webinars w
       LEFT JOIN users u ON u.id = w.tutor_id
       ORDER BY w.started_at DESC LIMIT 10`
    );
    res.json({ webinars: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to load webinars' });
  }
});

app.post('/api/webinar/start', authMiddleware, async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    if (user.role !== 'tutor') return res.status(403).json({ error: 'Only tutors can start webinars' });
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'Missing webinar title' });
    const startedAt = new Date();
    const { rows } = await pool.query(
      'INSERT INTO webinars (tutor_id, title, is_live, started_at, duration, recording_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [user.id, title, true, startedAt, 0, null]
    );
    res.json({ success: true, webinar: { id: rows[0].id, title, is_live: true, started_at: startedAt } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to start webinar' });
  }
});

app.get('/api/students', authMiddleware, async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    if (user.role !== 'tutor') return res.status(403).json({ error: 'Only tutors can view students' });

    const { rows: assigned } = await pool.query(
      'SELECT id, name, email, subject FROM users WHERE role = $1 AND tutor_id = $2 ORDER BY name',
      ['student', user.id]
    );
    const { rows: available } = await pool.query(
      'SELECT id, name, email, subject FROM users WHERE role = $1 AND tutor_id IS NULL ORDER BY name',
      ['student']
    );

    res.json({ assigned, available });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to load students' });
  }
});

app.post('/api/students', authMiddleware, async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    if (user.role !== 'tutor') return res.status(403).json({ error: 'Only tutors can add students' });

    const { studentId, email } = req.body;
    if (!studentId && !email) return res.status(400).json({ error: 'Student id или email обязательны' });

    const query = studentId
      ? 'SELECT id, name, email, subject, tutor_id FROM users WHERE id = $1 AND role = $2'
      : 'SELECT id, name, email, subject, tutor_id FROM users WHERE email = $1 AND role = $2';
    const value = studentId || email.toLowerCase();
    const { rows } = await pool.query(query, [value, 'student']);
    const student = rows[0];
    if (!student) return res.status(404).json({ error: 'Ученик не найден' });
    if (student.tutor_id === user.id) return res.status(400).json({ error: 'Ученик уже закреплён за вами' });
    if (student.tutor_id) return res.status(409).json({ error: 'Ученик уже закреплён за другим репетитором' });

    await pool.query('UPDATE users SET tutor_id = $1 WHERE id = $2', [user.id, student.id]);
    res.json({ success: true, student: { id: student.id, name: student.name, email: student.email, subject: student.subject } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to add student' });
  }
});

app.post('/api/students/create', authMiddleware, async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    if (user.role !== 'tutor') return res.status(403).json({ error: 'Only tutors can create students' });

    const { name, email, password } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name и email обязательны' });

    const existing = await getUserByEmail(email.toLowerCase());
    if (existing) return res.status(409).json({ error: 'Пользователь с таким email уже существует' });

    const passwordHash = await bcrypt.hash(password || 'student123', 10);
    const { rows } = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, tutor_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role',
      [name, email.toLowerCase(), passwordHash, 'student', user.id]
    );

    res.json({ success: true, student: rows[0], password: password || 'student123' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to create student' });
  }
});

app.delete('/api/students/:studentId', authMiddleware, async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    if (user.role !== 'tutor') return res.status(403).json({ error: 'Only tutors can remove students' });

    const { studentId } = req.params;
    const { rows } = await pool.query('SELECT id, tutor_id FROM users WHERE id = $1 AND role = $2', [studentId, 'student']);
    const student = rows[0];
    if (!student) return res.status(404).json({ error: 'Ученик не найден' });
    if (student.tutor_id !== user.id) return res.status(403).json({ error: 'Этот ученик не прикреплён к вам' });

    await pool.query('UPDATE users SET tutor_id = NULL WHERE id = $1', [student.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to remove student' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

initServer()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server started on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize server:', err);
    process.exit(1);
  });
