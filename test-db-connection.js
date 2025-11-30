/**
 * Database Connection Test Script
 * Run this to verify your database connection is working correctly
 * Usage: node test-db-connection.js
 */

require('dotenv').config();
const pool = require('./app/config/database');

async function testConnection() {
    console.log('🔍 Testing database connection...\n');
    
    try {
        // Test 1: Basic connection
        console.log('1️⃣ Testing basic connection...');
        const client = await pool.connect();
        console.log('✅ Connection successful!\n');
        
        // Test 2: Get database info
        console.log('2️⃣ Getting database information...');
        const dbInfo = await client.query('SELECT version(), current_database(), current_user');
        console.log('📊 Database Info:');
        console.log('   PostgreSQL Version:', dbInfo.rows[0].version.split(',')[0]);
        console.log('   Database Name:', dbInfo.rows[0].current_database);
        console.log('   Current User:', dbInfo.rows[0].current_user);
        console.log('');
        
        // Test 3: Check if tables exist
        console.log('3️⃣ Checking if tables exist...');
        const tablesQuery = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `;
        const tables = await client.query(tablesQuery);
        
        if (tables.rows.length === 0) {
            console.log('⚠️  No tables found. You may need to run init_database.sql');
        } else {
            console.log(`✅ Found ${tables.rows.length} table(s):`);
            tables.rows.forEach(row => {
                console.log(`   - ${row.table_name}`);
            });
        }
        console.log('');
        
        // Test 4: Check connection string source
        console.log('4️⃣ Connection configuration:');
        if (process.env.DATABASE_URL) {
            // Mask password in connection string for security
            const maskedUrl = process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@');
            console.log('   Using: DATABASE_URL (Neon/Cloud)');
            console.log('   Connection:', maskedUrl.split('?')[0] + '?...');
        } else {
            console.log('   Using: Individual connection parameters');
            console.log('   Host:', process.env.POSTGRES_HOST || 'Not set');
            console.log('   Database:', process.env.POSTGRES_DB || 'Not set');
        }
        console.log('');
        
        client.release();
        
        console.log('🎉 All tests passed! Your database connection is working correctly.');
        console.log('\n💡 Next steps:');
        if (tables.rows.length === 0) {
            console.log('   1. Run init_database.sql in Neon SQL Editor');
            console.log('   2. Verify tables were created');
        } else {
            console.log('   ✅ Database is ready to use!');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Connection failed!\n');
        console.error('Error details:', error.message);
        console.error('\n🔧 Troubleshooting:');
        console.error('   1. Check your .env file exists and has DATABASE_URL set');
        console.error('   2. Verify your Neon connection string is correct');
        console.error('   3. Ensure your Neon database is running');
        console.error('   4. Check if your IP is allowed (Neon allows all by default)');
        process.exit(1);
    }
}

testConnection();

