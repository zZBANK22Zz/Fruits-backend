const express = require('express');
const dotenv = require('dotenv');
dotenv.config();
const pool = require('./app/config/database');
const UserModel = require('./app/model/userModel');
const authRoutes = require('./app/routes/authRoutes');
const userRoutes = require('./app/routes/userRoutes');
const fruitRoutes = require('./app/routes/fruitRoutes');
const orderRoutes = require('./app/routes/orderRoutes');
const invoiceRoutes = require('./app/routes/invoiceRoutes');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use(cors());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/fruits', fruitRoutes);
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