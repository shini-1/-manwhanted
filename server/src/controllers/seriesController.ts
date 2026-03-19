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

const toPlainObject = <T>(value: T): T =>
  value && typeof value === 'object' && 'toObject' in (value as Record<string, unknown>)
    ? (value as unknown as { toObject: () => T }).toObject()
    : value;

const normalizeStringList = (value: unknown) =>
  Array.isArray(value)
    ? value
        .filter((entry): entry is string => typeof entry === 'string')
        .map((entry) => entry.trim())
        .filter(Boolean)
    : [];

const formatSeriesResponse = <T extends Record<string, unknown>>(series: T) => {
  const normalizedSeries = toPlainObject(series);
  const coverImage = typeof normalizedSeries.coverImage === 'string'
    ? normalizedSeries.coverImage.trim()
    : '';
  const thumbnailImage = typeof normalizedSeries.thumbnailImage === 'string'
    ? normalizedSeries.thumbnailImage.trim()
    : coverImage;

  return {
    ...normalizedSeries,
    coverImage,
    thumbnailImage,
  };
};

const formatChapterResponse = <T extends Record<string, unknown>>(chapter: T) => {
  const normalizedChapter = toPlainObject(chapter);
  const rawPageSources = Array.isArray(normalizedChapter.pageSources)
    ? normalizedChapter.pageSources
    : [];

  const pageSources = rawPageSources.length > 0
    ? rawPageSources
        .map((pageSource) => {
          if (typeof pageSource === 'string') {
            const url = pageSource.trim();
            return url ? { url, candidates: [url] } : null;
          }

          if (!pageSource || typeof pageSource !== 'object') {
            return null;
          }

          const candidateList = normalizeStringList(
            (pageSource as { candidates?: unknown }).candidates
          );
          const url = typeof (pageSource as { url?: unknown }).url === 'string'
            ? (pageSource as { url: string }).url.trim()
            : candidateList[0] || '';

          if (!url) {
            return null;
          }

          return {
            url,
            candidates: [...new Set([url, ...candidateList])],
          };
        })
        .filter((pageSource): pageSource is { url: string; candidates: string[] } => Boolean(pageSource))
    : normalizeStringList(normalizedChapter.pages).map((url) => ({
        url,
        candidates: [url],
      }));

  const pages = pageSources.map((pageSource) => pageSource.url);
  const previewImage = typeof normalizedChapter.previewImage === 'string'
    ? normalizedChapter.previewImage.trim()
    : pageSources[0]?.url || '';

  return {
    ...normalizedChapter,
    pages,
    pageSources,
    previewImage,
  };
};

export const listSeries = async (req: Request, res: Response) => {
  const { ids, source, limit, page, q, origin, status, demographic, contentRating, sort, includedTags } = req.query;
  const idList = typeof ids === 'string'
    ? ids.split(',').map(id => id.trim()).filter(Boolean)
    : undefined;
  const parsedLimit = typeof limit === 'string' ? Math.min(parseInt(limit, 10) || 12, 24) : 12;
  const parsedPage = typeof page === 'string' ? Math.max(parseInt(page, 10) || 1, 1) : 1;
  const parsedIncludedTags = typeof includedTags === 'string'
    ? includedTags.split(',').map((tag) => tag.trim()).filter(Boolean)
    : undefined;
  const filters = {
    origin: typeof origin === 'string' ? origin : undefined,
    status: typeof status === 'string' ? status : undefined,
    demographic: typeof demographic === 'string' ? demographic : undefined,
    contentRating: typeof contentRating === 'string' ? contentRating : undefined,
    sort: typeof sort === 'string' ? sort : undefined,
    includedTags: parsedIncludedTags,
  };

  try {
    if (source === 'mangadex') {
      const searchQuery = typeof q === 'string' ? q.trim() : '';
      if (searchQuery) {
        return res.json(await mangadexService.searchReadableManga(searchQuery, parsedPage, parsedLimit, filters));
      }

      return res.json(await mangadexService.getPopularReadableManga(parsedPage, parsedLimit, filters));
    }

    await ensureDatabaseConnection();

    if (idList?.length) {
      const series = await Series.find({ _id: { $in: idList } }).select('title coverImage genres status');
      return res.json(series.map((entry) => formatSeriesResponse(entry as unknown as Record<string, unknown>)));
    }

    const series = await Series.find().select('title coverImage genres status');
    return res.json(series.map((entry) => formatSeriesResponse(entry as unknown as Record<string, unknown>)));
  } catch (err) {
    console.error('List series error:', err);
    return res.json(listFallbackSeries(idList).map((entry) => formatSeriesResponse(entry)));
  }
};

export const getSeriesFilters = async (req: Request, res: Response) => {
  const { source } = req.query;

  if (source !== 'mangadex') {
    return res.json({
      origins: [],
      statuses: [],
      demographics: [],
      contentRatings: [],
      sorts: [],
      tags: [],
    });
  }

  try {
    return res.json(await mangadexService.getFilterOptions());
  } catch (err) {
    console.error('Get series filters error:', err);
    return res.status(500).json({ message: 'Failed to load filters.' });
  }
};

export const getSeriesById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    if (mangadexService.isMangaDexSeriesId(id)) {
      return res.json(formatSeriesResponse(await mangadexService.getReadableMangaById(id)));
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

    return res.json(formatSeriesResponse(series as unknown as Record<string, unknown>));
  } catch (err) {
    console.error('Get series error:', err);
    const fallbackSeries = getFallbackSeriesById(id);
    if (!fallbackSeries) {
      return res.status(404).json({ message: 'Series not found' });
    }
    return res.json(formatSeriesResponse(fallbackSeries));
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
      return res.json(formatChapterResponse(await mangadexService.getReadableChapterById(id)));
    }

    await ensureDatabaseConnection();
    const chapter = await Chapter.findById(id);
    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }
    return res.json(formatChapterResponse(chapter as unknown as Record<string, unknown>));
  } catch (err) {
    console.error('Get chapter error:', err);
    const fallbackChapter = getFallbackChapterById(id);
    if (!fallbackChapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }
    return res.json(formatChapterResponse(fallbackChapter));
  }
};
