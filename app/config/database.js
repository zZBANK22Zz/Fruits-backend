const { Pool } = require('pg');

// Connection pool configuration optimized for serverless (Vercel) and traditional servers
// If DATABASE_URL is provided (common with Neon), use it directly
// Otherwise, use individual connection parameters
let poolConfig;

// Check if running in serverless environment (Vercel)
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

if (process.env.DATABASE_URL) {
    // Neon connection string - use pooler for better serverless performance
    let connectionString = process.env.DATABASE_URL;
    
    // If using Neon, try to use the pooler endpoint for better serverless performance
    // Neon pooler endpoints typically have '-pooler' in the hostname
    // If your connection string doesn't have it, you can manually add it
    // Format: postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/dbname
    
    poolConfig = {
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }, // Required for Neon
        client_encoding: 'UTF8',
        // Serverless-optimized settings
        max: isServerless ? 1 : 20, // Single connection per serverless function
        idleTimeoutMillis: isServerless ? 10000 : 30000, // Shorter timeout for serverless
        connectionTimeoutMillis: isServerless ? 10000 : 5000, // Longer timeout for serverless (10 seconds)
        // Allow pool to create connections on demand
        allowExitOnIdle: isServerless ? true : false,
    };
} else {
    // Local development or custom configuration
    // const sslConfig = process.env.POSTGRES_SSL === 'true' 
    //     ? { rejectUnauthorized: false }
    //     : false;
    
    // poolConfig = {
    //     user: process.env.POSTGRES_USER,
    //     password: process.env.POSTGRES_PASSWORD,
    //     host: process.env.POSTGRES_HOST,
    //     port: process.env.POSTGRES_PORT,
    //     database: process.env.POSTGRES_DB,
    //     ssl: sslConfig,
    //     client_encoding: 'UTF8',
    //     max: isServerless ? 1 : 20,
    //     idleTimeoutMillis: isServerless ? 10000 : 30000,
    //     connectionTimeoutMillis: isServerless ? 10000 : 5000,
    //     allowExitOnIdle: isServerless ? true : false,
    // };
    // Use Neon connection for Local development
    poolConfig = {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        client_encoding: 'UTF8',
        max: isServerless ? 1 : 20,
        idleTimeoutMillis: isServerless ? 10000 : 30000,
        connectionTimeoutMillis: isServerless ? 10000 : 5000,
        allowExitOnIdle: isServerless ? true : false,
    }
}

const pool = new Pool(poolConfig);

// Handle connection errors gracefully
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    // Don't exit in serverless - let it retry
    if (!isServerless) {
        process.exit(-1);
    }
});

// Ensure UTF-8 encoding for all queries
pool.on('connect', (client) => {
    client.query('SET client_encoding TO UTF8').catch(err => {
        console.error('Error setting client encoding:', err);
    });
});

// Helper function to execute queries with retry logic for serverless
const queryWithRetry = async (query, params, retries = 2) => {
    for (let i = 0; i <= retries; i++) {
        try {
            return await pool.query(query, params);
        } catch (error) {
            // If it's a connection error and we have retries left, try again
            if (i < retries && (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.message.includes('Connection terminated'))) {
                console.log(`Query failed, retrying... (${i + 1}/${retries})`);
                // Wait a bit before retrying
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
                continue;
            }
            throw error;
        }
    }
};

// Export both pool and queryWithRetry
module.exports = pool;
module.exports.queryWithRetry = queryWithRetry;