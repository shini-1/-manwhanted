import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import routes from './routes.js';
import { seedDatabase } from './seed.js';

dotenv.config();

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
export default async function handler(req: any, res: any) {
  try {
    // Connect to MongoDB per invocation (serverless)
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/manwhanted';
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected');

    // Use Express to handle request
    await new Promise<void>((resolve, reject) => {
      app(req, res);
      res.on('finish', () => resolve());
      res.on('error', reject);
    });
  } catch (err) {
    console.error('Handler error:', err);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Server error' });
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

