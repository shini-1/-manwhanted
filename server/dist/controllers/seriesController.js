import Series from '../models/series.js';
import Chapter from '../models/chapter.js';
import { ensureDatabaseConnection } from '../services/database.js';
import { getFallbackChapterById, getFallbackSeriesById, getFallbackSeriesChapters, listFallbackSeries, } from '../services/fallbackCatalog.js';
export const listSeries = async (req, res) => {
    const { ids } = req.query;
    const idList = typeof ids === 'string'
        ? ids.split(',').map(id => id.trim()).filter(Boolean)
        : undefined;
    try {
        await ensureDatabaseConnection();
        if (idList?.length) {
            const series = await Series.find({ _id: { $in: idList } }).select('title coverImage genres status');
            return res.json(series);
        }
        const series = await Series.find().select('title coverImage genres status');
        return res.json(series);
    }
    catch (err) {
        console.error('List series error:', err);
        return res.json(listFallbackSeries(idList));
    }
};
export const getSeriesById = async (req, res) => {
    const { id } = req.params;
    try {
        await ensureDatabaseConnection();
        const series = await Series.findById(id).populate({
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
        const fallbackSeries = getFallbackSeriesById(id);
        if (!fallbackSeries) {
            return res.status(404).json({ message: 'Series not found' });
        }
        return res.json(fallbackSeries);
    }
};
export const getSeriesChapters = async (req, res) => {
    const { id } = req.params;
    try {
        await ensureDatabaseConnection();
        const chapters = await Chapter.find({ series: id }).select('title number');
        return res.json(chapters);
    }
    catch (err) {
        console.error('Get series chapters error:', err);
        return res.json(getFallbackSeriesChapters(id));
    }
};
export const getChapterById = async (req, res) => {
    const { id } = req.params;
    try {
        await ensureDatabaseConnection();
        const chapter = await Chapter.findById(id);
        if (!chapter) {
            return res.status(404).json({ message: 'Chapter not found' });
        }
        return res.json(chapter);
    }
    catch (err) {
        console.error('Get chapter error:', err);
        const fallbackChapter = getFallbackChapterById(id);
        if (!fallbackChapter) {
            return res.status(404).json({ message: 'Chapter not found' });
        }
        return res.json(fallbackChapter);
    }
};
