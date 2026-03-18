import { Request, Response } from 'express';
import Series from '../models/series.js';
import Chapter from '../models/chapter.js';
import { ensureDatabaseConnection } from '../services/database.js';
import { mangadexService } from '../services/mangadex.service.js';
import {
  getFallbackChapterById,
  getFallbackSeriesById,
  getFallbackSeriesChapters,
  listFallbackSeries,
} from '../services/fallbackCatalog.js';

export const listSeries = async (req: Request, res: Response) => {
  const { ids, source, limit } = req.query;
  const idList = typeof ids === 'string'
    ? ids.split(',').map(id => id.trim()).filter(Boolean)
    : undefined;
  const parsedLimit = typeof limit === 'string' ? Math.min(parseInt(limit, 10) || 12, 24) : 12;

  try {
    if (source === 'mangadex') {
      return res.json(await mangadexService.getPopularReadableManga(parsedLimit));
    }

    await ensureDatabaseConnection();

    if (idList?.length) {
      const series = await Series.find({ _id: { $in: idList } }).select('title coverImage genres status');
      return res.json(series);
    }

    const series = await Series.find().select('title coverImage genres status');
    return res.json(series);
  } catch (err) {
    console.error('List series error:', err);
    return res.json(listFallbackSeries(idList));
  }
};

export const getSeriesById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    if (mangadexService.isMangaDexSeriesId(id)) {
      return res.json(await mangadexService.getReadableMangaById(id));
    }

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
  } catch (err) {
    console.error('Get series error:', err);
    const fallbackSeries = getFallbackSeriesById(id);
    if (!fallbackSeries) {
      return res.status(404).json({ message: 'Series not found' });
    }
    return res.json(fallbackSeries);
  }
};

export const getSeriesChapters = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    if (mangadexService.isMangaDexSeriesId(id)) {
      const series = await mangadexService.getReadableMangaById(id);
      return res.json(series.chapters || []);
    }

    await ensureDatabaseConnection();
    const chapters = await Chapter.find({ series: id }).select('title number');
    return res.json(chapters);
  } catch (err) {
    console.error('Get series chapters error:', err);
    return res.json(getFallbackSeriesChapters(id));
  }
};

export const getChapterById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    if (mangadexService.isMangaDexChapterId(id)) {
      return res.json(await mangadexService.getReadableChapterById(id));
    }

    await ensureDatabaseConnection();
    const chapter = await Chapter.findById(id);
    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }
    return res.json(chapter);
  } catch (err) {
    console.error('Get chapter error:', err);
    const fallbackChapter = getFallbackChapterById(id);
    if (!fallbackChapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }
    return res.json(fallbackChapter);
  }
};
