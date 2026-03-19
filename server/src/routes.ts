import express from 'express';
import {
  getSeriesFilters,
  listSeries,
  getSeriesById,
  getSeriesChapters,
  getChapterById,
} from './controllers/seriesController.js';
import { logError } from './controllers/logController.js';
import { importPopular } from './controllers/mangadex.controller.js';
import { proxyImage } from './controllers/imageController.js';
import { downloadLocalChapter } from './controllers/downloadController.js';


const router = express.Router();

// Health check
router.get('/', (req, res) => {
  res.json({ message: 'Server is running' });
});

// Client-side logging
router.post('/logs', logError);
router.get('/images/proxy', proxyImage);

// MangaDex admin
router.post('/admin/import-popular', importPopular);

// Series / chapters
router.get('/series', listSeries);
router.get('/series/filters', getSeriesFilters);
router.get('/series/:id', getSeriesById);
router.get('/series/:id/chapters', getSeriesChapters);
router.get('/chapters/:id/download', downloadLocalChapter);
router.get('/chapters/:id', getChapterById);

export default router;
