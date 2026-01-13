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
import dbConnect from './config/mongodb.js';
import trackRoutes from './routes/track.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// Allow all origins
app.use(cors({
  origin: '*',
  credentials: false
}));
app.use(express.json());

// Connect to MongoDB
dbConnect();

// Routes
app.use('/api/track', trackRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Time Tracker API' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
