import express from 'express';
import { register, login, me } from './controllers/authController';
import { getBookmarks, addBookmark, removeBookmark, getReadingHistory, setReadingHistory } from './controllers/userController';
import {
  listSeries,
  getSeriesById,
  getSeriesChapters,
  getChapterById,
} from './controllers/seriesController';
import { authMiddleware } from './middleware/auth';
import { logError } from './controllers/logController';
import { importPopular } from './controllers/mangadex.controller';


const router = express.Router();

// Health check
router.get('/', (req, res) => {
  res.json({ message: 'Server is running' });
});

// Client-side logging
router.post('/logs', logError);

// Authentication
router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/me', authMiddleware, me);

// User actions
router.get('/users/bookmarks', authMiddleware, getBookmarks);
router.post('/users/bookmarks/:seriesId', authMiddleware, addBookmark);
router.delete('/users/bookmarks/:seriesId', authMiddleware, removeBookmark);

// Reading history
router.get('/users/history/:seriesId', authMiddleware, getReadingHistory);
router.post('/users/history/:seriesId', authMiddleware, setReadingHistory);

// MangaDex admin
router.post('/admin/import-popular', importPopular);

// Series / chapters
router.get('/series', listSeries);
router.get('/series/:id', getSeriesById);
router.get('/series/:id/chapters', getSeriesChapters);
router.get('/chapters/:id', getChapterById);

export default router;
