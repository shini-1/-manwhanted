import express from 'express';
import { register, login, me } from './controllers/authController';
import { getBookmarks, addBookmark, removeBookmark } from './controllers/userController';
import {
  listSeries,
  getSeriesById,
  getSeriesChapters,
  getChapterById,
} from './controllers/seriesController';
import { authMiddleware } from './middleware/auth';

const router = express.Router();

// Health check
router.get('/', (req, res) => {
  res.json({ message: 'Server is running' });
});

// Authentication
router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/me', authMiddleware, me);

// User actions
router.get('/users/bookmarks', authMiddleware, getBookmarks);
router.post('/users/bookmarks/:seriesId', authMiddleware, addBookmark);
router.delete('/users/bookmarks/:seriesId', authMiddleware, removeBookmark);

// Series / chapters
router.get('/series', listSeries);
router.get('/series/:id', getSeriesById);
router.get('/series/:id/chapters', getSeriesChapters);
router.get('/chapters/:id', getChapterById);

export default router;