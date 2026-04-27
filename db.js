const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || 'postgres://postgres:postgres@localhost:5432/tutor_platform';

console.log('Connecting to database:', connectionString.replace(/:\/\/.*@/, '://***:***@')); // Лог без пароля

const pool = new Pool({ connectionString });

pool.on('error', (err) => {
  console.error('Postgres client error', err);
});

module.exports = { pool };
