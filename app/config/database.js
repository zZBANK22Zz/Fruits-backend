const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    database: process.env.POSTGRES_DB,
    ssl: false,
    client_encoding: 'UTF8'
});

// Ensure UTF-8 encoding for all queries
pool.on('connect', (client) => {
    client.query('SET client_encoding TO UTF8');
});

module.exports = pool;