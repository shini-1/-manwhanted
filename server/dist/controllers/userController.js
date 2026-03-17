"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setReadingHistory = exports.getReadingHistory = exports.removeBookmark = exports.addBookmark = exports.getBookmarks = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const user_1 = __importDefault(require("../models/user"));
const getBookmarks = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.userId;
    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
        const user = yield user_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        return res.json(user.bookmarks);
    }
    catch (err) {
        console.error('Get bookmarks error:', err);
        return res.status(500).json({ message: 'Server error' });
    }
});
exports.getBookmarks = getBookmarks;
const addBookmark = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.userId;
    const { seriesId } = req.params;
    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
        const user = yield user_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const alreadyBookmarked = user.bookmarks.some((id) => id.toString() === seriesId);
        if (!alreadyBookmarked) {
            user.bookmarks.push(new mongoose_1.default.Types.ObjectId(seriesId));
            yield user.save();
        }
        return res.status(200).json({ bookmarks: user.bookmarks });
    }
    catch (err) {
        console.error('Add bookmark error:', err);
        return res.status(500).json({ message: 'Server error' });
    }
});
exports.addBookmark = addBookmark;
const removeBookmark = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.userId;
    const { seriesId } = req.params;
    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
        const user = yield user_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        user.bookmarks = user.bookmarks.filter((id) => id.toString() !== seriesId);
        yield user.save();
        return res.status(200).json({ bookmarks: user.bookmarks });
    }
    catch (err) {
        console.error('Remove bookmark error:', err);
        return res.status(500).json({ message: 'Server error' });
    }
});
exports.removeBookmark = removeBookmark;
const getReadingHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.userId;
    const { seriesId } = req.params;
    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
        const user = yield user_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const entry = user.readingHistory.find((h) => h.series.toString() === seriesId);
        return res.json({ chapterId: (entry === null || entry === void 0 ? void 0 : entry.chapter) || null });
    }
    catch (err) {
        console.error('Get reading history error:', err);
        return res.status(500).json({ message: 'Server error' });
    }
});
exports.getReadingHistory = getReadingHistory;
const setReadingHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.userId;
    const { seriesId } = req.params;
    const { chapterId } = req.body;
    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    if (!chapterId) {
        return res.status(400).json({ message: 'chapterId is required' });
    }
    try {
        const user = yield user_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const existingIndex = user.readingHistory.findIndex((h) => h.series.toString() === seriesId);
        if (existingIndex >= 0) {
            user.readingHistory[existingIndex].chapter = new mongoose_1.default.Types.ObjectId(chapterId);
            user.readingHistory[existingIndex].updatedAt = new Date();
        }
        else {
            user.readingHistory.push({
                series: new mongoose_1.default.Types.ObjectId(seriesId),
                chapter: new mongoose_1.default.Types.ObjectId(chapterId),
                updatedAt: new Date(),
            });
        }
        yield user.save();
        return res.status(200).json({ chapterId });
    }
    catch (err) {
        console.error('Set reading history error:', err);
        return res.status(500).json({ message: 'Server error' });
    }
});
exports.setReadingHistory = setReadingHistory;
