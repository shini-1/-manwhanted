"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("./controllers/authController");
const userController_1 = require("./controllers/userController");
const seriesController_1 = require("./controllers/seriesController");
const auth_1 = require("./middleware/auth");
const logController_1 = require("./controllers/logController");
const mangadex_controller_1 = require("./controllers/mangadex.controller");
const router = express_1.default.Router();
// Health check
router.get('/', (req, res) => {
    res.json({ message: 'Server is running' });
});
// Client-side logging
router.post('/logs', logController_1.logError);
// Authentication
router.post('/auth/register', authController_1.register);
router.post('/auth/login', authController_1.login);
router.get('/auth/me', auth_1.authMiddleware, authController_1.me);
// User actions
router.get('/users/bookmarks', auth_1.authMiddleware, userController_1.getBookmarks);
router.post('/users/bookmarks/:seriesId', auth_1.authMiddleware, userController_1.addBookmark);
router.delete('/users/bookmarks/:seriesId', auth_1.authMiddleware, userController_1.removeBookmark);
// Reading history
router.get('/users/history/:seriesId', auth_1.authMiddleware, userController_1.getReadingHistory);
router.post('/users/history/:seriesId', auth_1.authMiddleware, userController_1.setReadingHistory);
// MangaDex admin
router.post('/admin/import-popular', mangadex_controller_1.importPopular);
// Series / chapters
router.get('/series', seriesController_1.listSeries);
router.get('/series/:id', seriesController_1.getSeriesById);
router.get('/series/:id/chapters', seriesController_1.getSeriesChapters);
router.get('/chapters/:id', seriesController_1.getChapterById);
exports.default = router;
