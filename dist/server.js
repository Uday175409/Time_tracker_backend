import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// .env is in backend root, src is one level up
const envPath = join(__dirname, '..', '.env');
dotenv.config({ path: envPath });
console.log('Environment loaded:', {
    MONGODB_URI: process.env.MONGODB_URI ? 'Set' : 'Not Set',
    PORT: process.env.PORT,
    FRONTEND_URL: process.env.FRONTEND_URL
});
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import dbConnect from './config/mongodb.js';
import trackRoutes from './routes/track.js';
import authRoutes from './routes/auth.js';
import { globalErrorHandler } from './utils/error-handler.js';
const app = express();
const PORT = process.env.PORT || 5000;
const configuredOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
const exactAllowedOrigins = configuredOrigins.filter((origin) => !origin.includes('*'));
const wildcardAllowedOrigins = configuredOrigins
    .filter((origin) => origin.includes('*'))
    .map((pattern) => {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp(`^${escaped}$`);
});
const isOriginAllowed = (origin) => {
    if (exactAllowedOrigins.includes(origin))
        return true;
    return wildcardAllowedOrigins.some((regex) => regex.test(origin));
};
// Middleware
app.use(cors({
    origin: (origin, callback) => {
        // Allow non-browser requests (no origin header) and configured origins.
        if (!origin || isOriginAllowed(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '100kb' }));
// Connect to MongoDB
dbConnect();
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/track', trackRoutes);
import analyticsRoutes from './routes/analytics.js';
app.use('/api/analytics', analyticsRoutes);
import notesRoutes from './routes/notes.js';
app.use('/api/notes', notesRoutes);
import eodRoutes from './routes/eod.js';
app.use('/api/eod', eodRoutes);
import categoryRoutes from './routes/categories.js';
app.use('/api/categories', categoryRoutes);
import pomodoroRoutes from './routes/pomodoro.js';
app.use('/api/pomodoro', pomodoroRoutes);
import templateRoutes from './routes/templates.js';
app.use('/api/templates', templateRoutes);
app.get('/', (req, res) => {
    res.json({ message: 'Time Tracker API' });
});
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found', errorType: 'route_not_found' });
});
app.use((err, req, res, next) => {
    globalErrorHandler(err, req, res, next);
});
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
