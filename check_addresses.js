const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkAddresses() {
  try {
    const res = await pool.query('SELECT id, user_id, address_line, latitude, longitude FROM addresses ORDER BY id DESC LIMIT 5');
    console.log('Latest 5 addresses:');
    res.rows.forEach(row => {
      console.log(`ID: ${row.id}, User: ${row.user_id}, Address: ${row.address_line.substring(0, 20)}..., Lat: ${row.latitude}, Lng: ${row.longitude}`);
    });
  } catch (err) {
    console.error('Error executing query', err);
  } finally {
    await pool.end();
  }
}

checkAddresses();
