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
const OrderCleanupService = require('./app/services/orderCleanupService');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

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

// Health check route
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Fruit WebApp API is running'
    });
});

// Initialize database and start server
async function startServer() {
    try {
        // Test database connection
        await pool.connect();
        console.log('Connected to the database');

        // Start order cleanup job (rejects orders not paid within 5 minutes)
        OrderCleanupService.startCleanupJob();

        // Start server
        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });
    } catch (error) {
        console.error('Error starting server:', error);
        process.exit(1);
    }
}

startServer();