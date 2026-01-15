const express = require('express');
const dotenv = require('dotenv');
dotenv.config();
const pool = require('./app/config/database');
const UserModel = require('./app/model/userModel');
const authRoutes = require('./app/routes/authRoutes');
const userRoutes = require('./app/routes/userRoutes');
const fruitRoutes = require('./app/routes/fruitRoutes');
const categoryRoutes = require('./app/routes/categoryRoutes');
const orderRoutes = require('./app/routes/orderRoutes');
const invoiceRoutes = require('./app/routes/invoiceRoutes');
const notificationRoutes = require('./app/routes/notificationRoutes');
const OrderCleanupService = require('./app/services/orderCleanupService');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 8000;

// Middleware
// Increase body parser limit to handle large image uploads (50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS middleware
app.use(cors());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/fruits', fruitRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check route
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Fruit WebApp API is running',
        environment: process.env.VERCEL ? 'Vercel' : 'Local'
    });
});

// Cron job endpoint for Vercel Cron Jobs
// This endpoint can be called by Vercel Cron to clean up expired orders
app.get('/api/cron/cleanup-orders', async (req, res) => {
    try {
        // Optional: Add authentication/authorization here
        // For example, check for a secret token in headers
        const cronSecret = req.headers['x-cron-secret'];
        if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const result = await OrderCleanupService.cleanupExpiredOrders();
        res.json({
            success: true,
            message: 'Cleanup job executed',
            ...result
        });
    } catch (error) {
        console.error('Error in cron cleanup endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Error executing cleanup job',
            error: error.message
        });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

// // Initialize database connection (only for local development)
// // In serverless (Vercel), connections are created on-demand per request
// async function initializeDatabase() {
//     try {
//         // Test connection with a simple query
//         const result = await pool.query('SELECT NOW()');
//         console.log('Connected to the database');
//         return true;
//     } catch (error) {
//         console.error('Error connecting to database:', error);
//         // Don't exit on Vercel, let it retry on next request
//         if (!process.env.VERCEL) {
//             process.exit(1);
//         }
//         return false;
//     }
// }

// // Start server only if not on Vercel (Vercel uses serverless functions)
// if (!process.env.VERCEL) {
//     async function startServer() {
//         try {
//             // Test database connection
//             await initializeDatabase();

//             // Start order cleanup job (only for local development)
//             // On Vercel, use the cron endpoint with Vercel Cron Jobs
//             OrderCleanupService.startCleanupJob();

//             // Start server
//             app.listen(port, () => {
//                 console.log(`Server is running on port ${port}`);
//             });
//         } catch (error) {
//             console.error('Error starting server:', error);
//             process.exit(1);
//         }
//     }

//     startServer();
// } else {
//     // On Vercel, don't pre-connect
//     // Connections will be created on-demand when queries are executed
//     console.log('Running in serverless mode - connections will be created on-demand');
// }

// Export the app for Vercel serverless functions
module.exports = app;