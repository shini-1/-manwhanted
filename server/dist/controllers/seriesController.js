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
exports.getChapterById = exports.getSeriesChapters = exports.getSeriesById = exports.listSeries = void 0;
const series_1 = __importDefault(require("../models/series"));
const chapter_1 = __importDefault(require("../models/chapter"));
const listSeries = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ids } = req.query;
        if (ids) {
            const idList = ids.split(',').map(id => id.trim()).filter(Boolean);
            const series = yield series_1.default.find({ _id: { $in: idList } }).select('title coverImage genres status');
            return res.json(series);
        }
        const series = yield series_1.default.find().select('title coverImage genres status');
        return res.json(series);
    }
    catch (err) {
        console.error('List series error:', err);
        return res.status(500).json({ message: 'Server error' });
    }
});
exports.listSeries = listSeries;
const getSeriesById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const series = yield series_1.default.findById(id).populate({
            path: 'chapters',
            select: 'title number',
            options: { sort: { number: 1 } },
        });
        if (!series) {
            return res.status(404).json({ message: 'Series not found' });
        }
        return res.json(series);
    }
    catch (err) {
        console.error('Get series error:', err);
        return res.status(500).json({ message: 'Server error' });
    }
});
exports.getSeriesById = getSeriesById;
const getSeriesChapters = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const chapters = yield chapter_1.default.find({ series: id }).select('title number');
        return res.json(chapters);
    }
    catch (err) {
        console.error('Get series chapters error:', err);
        return res.status(500).json({ message: 'Server error' });
    }
});
exports.getSeriesChapters = getSeriesChapters;
const getChapterById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const chapter = yield chapter_1.default.findById(id);
        if (!chapter) {
            return res.status(404).json({ message: 'Chapter not found' });
        }
        return res.json(chapter);
    }
    catch (err) {
        console.error('Get chapter error:', err);
        return res.status(500).json({ message: 'Server error' });
    }
});
exports.getChapterById = getChapterById;
