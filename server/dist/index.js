import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import routes from './routes.js';
import { seedDatabase } from './seed.js';
import { isDatabaseConfigurationError } from './services/database.js';
dotenv.config();
const allowedOrigins = (process.env.CLIENT_URL || 'https://manwhanted-client.vercel.app')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
const resolveCorsOrigin = (requestOrigin) => {
    if (!requestOrigin) {
        return allowedOrigins[0];
    }
    if (allowedOrigins.includes(requestOrigin)) {
        return requestOrigin;
    }
    return allowedOrigins[0];
};
const applyCorsHeaders = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', resolveCorsOrigin(req.headers.origin));
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Vary', 'Origin');
};
// Create app
const app = express();
app.use(helmet());
app.use(cors({
    origin: process.env.CLIENT_URL || 'https://manwhanted-client.vercel.app',
    credentials: true,
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/api', routes);
// Vercel serverless handler
export default async function handler(req, res) {
    applyCorsHeaders(req, res);
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }
    try {
        // Use Express to handle request
        await new Promise((resolve, reject) => {
            app(req, res);
            res.on('finish', () => resolve());
            res.on('error', reject);
        });
    }
    catch (err) {
        console.error('Handler error:', err);
        if (!res.headersSent) {
            res.status(500).json({
                message: isDatabaseConfigurationError(err) ? 'Server configuration error' : 'Server error',
            });
        }
    }
}
// Local development server
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/manwhanted')
        .then(async () => {
        console.log('MongoDB connected (dev)');
        if (process.env.SEED_DB === 'true') {
            await seedDatabase();
            console.log('Database seeded');
        }
    })
        .catch(err => console.error('MongoDB dev connection error:', err));
    app.listen(PORT, () => {
        console.log(`Dev server: http://localhost:${PORT}`);
    });
}
