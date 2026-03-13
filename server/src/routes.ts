import express from 'express';

const router = express.Router();

// Example route
router.get('/', (req, res) => {
  res.json({ message: 'Server is running' });
});

// Add more routes here as needed

export default router;