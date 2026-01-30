require('dotenv').config();
const express = require('express');
const { sequelize, testConnection } = require('./config/database');




const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static('uploads'));



// API Routes
const apiRoutes = require('./routes/index');
app.use('/', apiRoutes);





const startServer = async () => {
    try {

        await testConnection();

        // await sequelize.sync({ alter: true });
        console.log('Database synchronized successfully.');



        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};


process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
    process.exit(1);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

startServer();

module.exports = app;