import axios from 'axios';
import archiver from 'archiver';
import Chapter from '../models/chapter.js';
import { ensureDatabaseConnection } from '../services/database.js';
import { mangadexService } from '../services/mangadex.service.js';
import { getFallbackChapterById } from '../services/fallbackCatalog.js';
const CONTENT_TYPE_EXTENSIONS = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/avif': 'avif',
};
const sanitizeFileName = (value) => value
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'chapter';
const resolveFileExtension = (url, contentType) => {
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
    }
    catch (error) {
        const fileExtension = url.split('.').pop()?.toLowerCase();
        if (fileExtension && /^[a-z0-9]{2,5}$/.test(fileExtension)) {
            return fileExtension;
        }
    }
    return 'jpg';
};
const resolveChapterForDownload = async (chapterId) => {
    if (mangadexService.isMangaDexChapterId(chapterId)) {
        return null;
    }
    try {
        await ensureDatabaseConnection();
        const chapter = await Chapter.findById(chapterId).lean();
        if (chapter) {
            return chapter;
        }
    }
    catch (error) {
        console.error('Download chapter database lookup failed:', error);
    }
    return getFallbackChapterById(chapterId);
};
export const downloadLocalChapter = async (req, res) => {
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
    const pageUrls = Array.isArray(chapter.pages)
        ? chapter.pages.filter((page) => typeof page === 'string' && page.trim().length > 0)
        : [];
    if (pageUrls.length === 0) {
        return res.status(400).json({ message: 'This chapter has no downloadable pages.' });
    }
    try {
        const pageFiles = await Promise.all(pageUrls.map(async (pageUrl, index) => {
            const response = await axios.get(pageUrl, {
                responseType: 'arraybuffer',
                timeout: 30000,
                headers: {
                    Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                    'User-Agent': 'Mozilla/5.0 (compatible; Manwhanted/1.0)',
                    Referer: (() => {
                        try {
                            return `${new URL(pageUrl).origin}/`;
                        }
                        catch (error) {
                            return undefined;
                        }
                    })(),
                },
            });
            const extension = resolveFileExtension(pageUrl, response.headers['content-type']);
            return {
                name: `${String(index + 1).padStart(3, '0')}.${extension}`,
                data: Buffer.from(response.data),
            };
        }));
        const chapterLabel = sanitizeFileName(`${chapter.title || 'Chapter'} ${chapter.number || ''}`);
        const archiveFileName = `${chapterLabel}.cbz`;
        res.setHeader('Content-Type', 'application/vnd.comicbook+zip');
        res.setHeader('Content-Disposition', `attachment; filename="${archiveFileName}"`);
        res.setHeader('Cache-Control', 'private, no-store');
        const archive = archiver('zip', { zlib: { level: 9 } });
        archive.on('error', (error) => {
            console.error('Chapter archive error:', error);
            if (!res.headersSent) {
                res.status(500).json({ message: 'Failed to create chapter archive.' });
                return;
            }
            res.end();
        });
        archive.pipe(res);
        for (const pageFile of pageFiles) {
            archive.append(pageFile.data, { name: pageFile.name });
        }
        await archive.finalize();
    }
    catch (error) {
        console.error('Download chapter error:', error);
        return res.status(502).json({ message: 'Failed to download one or more chapter pages.' });
    }
};
