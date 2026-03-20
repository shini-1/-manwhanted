import { Request, Response } from 'express';
import axios from 'axios';
import archiver from 'archiver';
import Series from '../models/series.js';
import Chapter from '../models/chapter.js';
import { ensureDatabaseConnection } from '../services/database.js';
import { mangadexService } from '../services/mangadex.service.js';
import {
  getFallbackChapterById,
  getFallbackSeriesWithPages,
} from '../services/fallbackCatalog.js';

const CONTENT_TYPE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

const sanitizeFileName = (value: string) =>
  value
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'chapter';

const wait = (durationMs: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });

const resolveFileExtension = (url: string, contentType?: string) => {
  if (contentType) {
    const normalizedContentType = contentType.split(';')[0]?.trim().toLowerCase();
    if (normalizedContentType && CONTENT_TYPE_EXTENSIONS[normalizedContentType]) {
      return CONTENT_TYPE_EXTENSIONS[normalizedContentType];
    }
  }

  try {
    const parsedUrl = new URL(url);
    const fileName = parsedUrl.pathname.split('/').pop() || '';
    const fileExtension = fileName.split('.').pop()?.toLowerCase();

    if (fileExtension && /^[a-z0-9]{2,5}$/.test(fileExtension)) {
      return fileExtension;
    }
  } catch (error) {
    const fileExtension = url.split('.').pop()?.toLowerCase();

    if (fileExtension && /^[a-z0-9]{2,5}$/.test(fileExtension)) {
      return fileExtension;
    }
  }

  return 'jpg';
};

const resolveChapterForDownload = async (chapterId: string) => {
  if (mangadexService.isMangaDexChapterId(chapterId)) {
    return null;
  }

  try {
    await ensureDatabaseConnection();
    const chapter = await Chapter.findById(chapterId).lean();

    if (chapter) {
      return chapter;
    }
  } catch (error) {
    console.error('Download chapter database lookup failed:', error);
  }

  return getFallbackChapterById(chapterId);
};

const normalizeRequestedChapterIds = (value: unknown) =>
  typeof value === 'string'
    ? value.split(',').map((entry) => entry.trim()).filter(Boolean)
    : [];

const parseChapterNumber = (value: unknown) => {
  if (typeof value !== 'string') {
    return Number.POSITIVE_INFINITY;
  }

  const normalizedValue = value.replace(/[^0-9.]/g, '');
  const parsedValue = Number.parseFloat(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : Number.POSITIVE_INFINITY;
};

const sortChaptersForDownload = <
  T extends {
    number?: string;
    title?: string;
  }
>(chapters: T[]) =>
  [...chapters].sort((left, right) => {
    const numericDifference = parseChapterNumber(left.number) - parseChapterNumber(right.number);

    if (Number.isFinite(numericDifference) && numericDifference !== 0) {
      return numericDifference;
    }

    return `${left.title || ''}`.localeCompare(`${right.title || ''}`);
  });

const fetchPageFile = async (pageUrl: string, index: number) => {
  const referer = (() => {
    try {
      return `${new URL(pageUrl).origin}/`;
    } catch (error) {
      return undefined;
    }
  })();

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await axios.get<ArrayBuffer>(pageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
        maxRedirects: 5,
        headers: {
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (compatible; Manwhanted/1.0)',
          Referer: referer,
        },
      });

      const extension = resolveFileExtension(pageUrl, response.headers['content-type']);

      return {
        name: `${String(index + 1).padStart(3, '0')}.${extension}`,
        data: Buffer.from(response.data),
      };
    } catch (error) {
      lastError = error;

      if (attempt < 3) {
        await wait(250 * attempt);
      }
    }
  }

  throw lastError;
};

const buildChapterCbzBuffer = async (chapter: {
  title?: string;
  number?: string;
  pages?: string[];
}) => {
  const pageUrls = Array.isArray(chapter.pages)
    ? chapter.pages.filter((page): page is string => typeof page === 'string' && page.trim().length > 0)
    : [];

  if (pageUrls.length === 0) {
    throw new Error('This chapter has no downloadable pages.');
  }

  const pageFiles: { name: string; data: Buffer }[] = [];

  for (const [index, pageUrl] of pageUrls.entries()) {
    pageFiles.push(await fetchPageFile(pageUrl, index));
  }

  return new Promise<{ fileName: string; buffer: Buffer }>((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks: Buffer[] = [];
    const chapterLabel = sanitizeFileName(`${chapter.title || 'Chapter'} ${chapter.number || ''}`);

    archive.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    archive.on('error', reject);

    archive.on('end', () => {
      resolve({
        fileName: `${chapterLabel}.cbz`,
        buffer: Buffer.concat(chunks),
      });
    });

    for (const pageFile of pageFiles) {
      archive.append(pageFile.data, { name: pageFile.name });
    }

    archive.finalize().catch(reject);
  });
};

const buildBatchChapterArchives = async (chapters: {
  title?: string;
  number?: string;
  pages?: string[];
}[]) => {
  const chapterArchives: { fileName: string; buffer: Buffer }[] = [];

  for (const chapter of chapters) {
    chapterArchives.push(await buildChapterCbzBuffer(chapter));
  }

  return chapterArchives;
};

const resolveSeriesForBatchDownload = async (seriesId: string, requestedChapterIds: string[]) => {
  if (mangadexService.isMangaDexSeriesId(seriesId)) {
    return null;
  }

  try {
    await ensureDatabaseConnection();
    const series = await Series.findById(seriesId).lean();

    if (series) {
      const chapterFilter = requestedChapterIds.length > 0
        ? { series: seriesId, _id: { $in: requestedChapterIds } }
        : { series: seriesId };
      const chapters = await Chapter.find(chapterFilter).lean();

      return {
        title: series.title || 'Series',
        chapters: sortChaptersForDownload(chapters),
      };
    }
  } catch (error) {
    console.error('Batch series database lookup failed:', error);
  }

  const fallbackSeries = getFallbackSeriesWithPages(seriesId);

  if (!fallbackSeries) {
    return null;
  }

  const chapters = requestedChapterIds.length > 0
    ? fallbackSeries.chapters.filter((chapter) => requestedChapterIds.includes(chapter._id))
    : fallbackSeries.chapters;

  return {
    title: fallbackSeries.title || 'Series',
    chapters: sortChaptersForDownload(chapters),
  };
};

export const downloadLocalChapter = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (mangadexService.isMangaDexChapterId(id)) {
    return res.status(403).json({
      message: 'Downloads are only available for local library chapters.',
    });
  }

  const chapter = await resolveChapterForDownload(id);

  if (!chapter) {
    return res.status(404).json({ message: 'Chapter not found.' });
  }

  try {
    const { fileName, buffer } = await buildChapterCbzBuffer(chapter);

    res.setHeader('Content-Type', 'application/vnd.comicbook+zip');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    return res.send(buffer);
  } catch (error) {
    console.error('Download chapter error:', error);
    return res.status(502).json({ message: 'Failed to download one or more chapter pages.' });
  }
};

export const downloadSeriesChapterBatch = async (req: Request, res: Response) => {
  const { id } = req.params;
  const requestedChapterIds = normalizeRequestedChapterIds(req.query.chapterIds);

  if (mangadexService.isMangaDexSeriesId(id)) {
    return res.status(403).json({
      message: 'Batch downloads are only available for local library series.',
    });
  }

  const series = await resolveSeriesForBatchDownload(id, requestedChapterIds);

  if (!series) {
    return res.status(404).json({ message: 'Series not found.' });
  }

  if (!Array.isArray(series.chapters) || series.chapters.length === 0) {
    return res.status(400).json({ message: 'No chapters are available to download.' });
  }

  try {
    const chapterArchives = await buildBatchChapterArchives(series.chapters);
    const archiveFileName = `${sanitizeFileName(series.title || 'Series')} Batch.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${archiveFileName}"`);
    res.setHeader('Cache-Control', 'private, no-store');

    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('error', (error) => {
      console.error('Series batch archive error:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Failed to create batch archive.' });
        return;
      }

      res.end();
    });

    archive.pipe(res);

    for (const { fileName, buffer } of chapterArchives) {
      archive.append(buffer, { name: fileName });
    }

    await archive.finalize();
  } catch (error) {
    console.error('Batch download error:', error);
    return res.status(502).json({ message: 'Failed to build the chapter batch download.' });
  }
};
