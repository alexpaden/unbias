import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const isProduction = process.env.NODE_ENV === 'production';

console.log("DB User:", process.env.DEV_DB_USER);  // Add this for debugging
console.log("DB Password:", process.env.DEV_DB_PASSWORD);  // Add this for debugging


const pool = new Pool({
  user: isProduction ? process.env.PROD_DB_USER : process.env.DEV_DB_USER,
  password: String(isProduction ? process.env.PROD_DB_PASSWORD : process.env.DEV_DB_PASSWORD),
  host: isProduction ? process.env.PROD_DB_HOST : process.env.DEV_DB_HOST,
  database: isProduction ? process.env.PROD_DB_DATABASE : process.env.DEV_DB_DATABASE,
  port: parseInt(isProduction ? (process.env.PROD_DB_PORT || '5432') : (process.env.DEV_DB_PORT || '5433'), 10),
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});


const createTables = async () => {
  const createThreadSummaryTableQuery = `
    CREATE TABLE IF NOT EXISTS thread_summary (
      id SERIAL PRIMARY KEY,
      hash VARCHAR(255) NOT NULL,
      length VARCHAR(50) NOT NULL,
      openai_response TEXT NOT NULL,
      last_update TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await pool.query(createThreadSummaryTableQuery);
    console.log('Table creation: thread_summary is successful or already exists');
  } catch (error) {
    console.error('Error creating thread_summary table:', error);
    throw error;
  }
};

createTables();

export default pool;
