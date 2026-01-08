// ============================================
// Book Creator Backend Server
// ============================================

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');

const { initDatabase } = require('./config/database');
const { ensureBucketExists } = require('./config/supabase');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// Middleware
// ============================================

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static assets (for default templates)
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));

// ============================================
// API Routes
// ============================================

app.use('/api/books', require('./routes/books'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/images', require('./routes/images'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/promocodes', require('./routes/promocodes'));

// ============================================
// Health Check Endpoint
// ============================================

app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// ============================================
// Error Handling Middleware
// ============================================

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: err.message
    });
});

// ============================================
// 404 Handler
// ============================================

app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found'
    });
});

// ============================================
// Server Initialization
// ============================================

const startServer = async () => {
    try {
        // Initialize database tables
        await initDatabase();

        // Initialize Supabase bucket if configured
        if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
            try {
                await ensureBucketExists('book-uploads');
            } catch (error) {
                console.warn('⚠️  Could not initialize Supabase bucket:', error.message);
                console.warn('   You can create it manually in Supabase dashboard or it will be created on first upload');
            }
        }

        // Start server
        app.listen(PORT, () => {
            console.log(`\n🚀 Server is running on port ${PORT}`);
            console.log(`📊 Health check: http://localhost:${PORT}/api/health\n`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Start the server
startServer();

module.exports = app;

