import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from root directory (2 levels up)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const dbSettings = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME || 'webinar_reg',
};

async function clearRegistrations() {
  let connection;
  try {
    connection = await mysql.createConnection(dbSettings);
    
    // Delete all registrations from the database
    const [result] = await connection.query('DELETE FROM registrations');
    
    console.log(`✅ Successfully deleted ${result.affectedRows} registration(s) from the database.`);
    console.log('✅ Database is now clear of all registration data.');
    
  } catch (error) {
    console.error('❌ Error clearing registrations:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

clearRegistrations();
