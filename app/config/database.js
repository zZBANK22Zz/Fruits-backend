const { Pool } = require('pg');

// Connection pool configuration
// If DATABASE_URL is provided (common with Neon), use it directly
// Otherwise, use individual connection parameters
let poolConfig;

if (process.env.DATABASE_URL) {
    // Neon and other cloud providers typically provide DATABASE_URL
    poolConfig = {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }, // Required for Neon
        client_encoding: 'UTF8',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    };
} else {
    // Local development or custom configuration
    const sslConfig = process.env.POSTGRES_SSL === 'true' 
        ? { rejectUnauthorized: false }
        : false;
    
    poolConfig = {
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        host: process.env.POSTGRES_HOST,
        port: process.env.POSTGRES_PORT,
        database: process.env.POSTGRES_DB,
        ssl: sslConfig,
        client_encoding: 'UTF8',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    };
}

const pool = new Pool(poolConfig);

// Ensure UTF-8 encoding for all queries
pool.on('connect', (client) => {
    client.query('SET client_encoding TO UTF8');
});

module.exports = pool;