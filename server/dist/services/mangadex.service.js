import axios from 'axios';
import process from 'node:process';
const BASE_URL = process.env.MANGADEX_API_BASE || 'https://api.mangadex.org';
const MANGADEX_SERIES_PREFIX = 'md_';
const MANGADEX_CHAPTER_PREFIX = 'mdc_';
class MangaDexService {
    api;
    constructor() {
        this.api = axios.create({
            baseURL: BASE_URL,
            timeout: 20000,
        });
    }
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    pickLocalizedValue(values) {
        if (!values)
            return '';
        if (values.en)
            return values.en;
        if (values.en_us)
            return values.en_us;
        return Object.values(values)[0] || '';
    }
    toSeriesId(externalId) {
        return `${MANGADEX_SERIES_PREFIX}${externalId}`;
    }
    toChapterId(chapterId) {
        return `${MANGADEX_CHAPTER_PREFIX}${chapterId}`;
    }
    async getMangaFeedPage(externalId, limit, offset = 0) {
        return this.api.get(`/manga/${externalId}/feed`, {
            params: {
                translatedLanguage: ['en'],
                order: { chapter: 'asc' },
                limit,
                offset,
            },
        });
    }
    async getAllReadableChapters(externalId) {
        const chapters = [];
        const pageSize = 500;
        let offset = 0;
        let total = 0;
        do {
            const response = await this.getMangaFeedPage(externalId, pageSize, offset);
            const pageItems = response.data.data || [];
            total = response.data.total || pageItems.length;
            chapters.push(...pageItems);
            offset += pageItems.length;
            if (pageItems.length === 0) {
                break;
            }
        } while (offset < total);
        const seen = new Set();
        return chapters
            .filter((chapter) => chapter.attributes.translatedLanguage === 'en')
            .filter((chapter) => chapter.attributes.pages > 0)
            .filter((chapter) => {
            const key = `${chapter.attributes.chapter || ''}:${chapter.attributes.title || ''}`;
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        })
            .map((chapter) => ({
            _id: this.toChapterId(chapter.id),
            title: chapter.attributes.title || `Chapter ${chapter.attributes.chapter || '?'}`,
            number: chapter.attributes.chapter || '?',
        }));
    }
    isMangaDexSeriesId(id) {
        return id.startsWith(MANGADEX_SERIES_PREFIX);
    }
    isMangaDexChapterId(id) {
        return id.startsWith(MANGADEX_CHAPTER_PREFIX);
    }
    getExternalSeriesId(id) {
        return this.isMangaDexSeriesId(id) ? id.slice(MANGADEX_SERIES_PREFIX.length) : id;
    }
    getExternalChapterId(id) {
        return this.isMangaDexChapterId(id) ? id.slice(MANGADEX_CHAPTER_PREFIX.length) : id;
    }
    transformManga(manga) {
        const attributes = manga.attributes;
        const externalId = manga.id;
        const title = this.pickLocalizedValue(attributes.title) || 'Unknown Title';
        const description = this.pickLocalizedValue(attributes.description);
        const genres = [];
        if (attributes.tags) {
            for (const tag of attributes.tags) {
                if (tag.type === 'tag' && tag.attributes.group === 'genre') {
                    const name = this.pickLocalizedValue(tag.attributes.name);
                    if (name)
                        genres.push(name);
                }
            }
        }
        const coverRel = manga.relationships.find((rel) => rel.type === 'cover_art');
        const coverImage = coverRel
            ? `https://uploads.mangadex.org/covers/${externalId}/${coverRel.attributes.fileName}.512.jpg`
            : '';
        return {
            _id: this.toSeriesId(externalId),
            externalId,
            title,
            description,
            coverImage,
            genres: genres.slice(0, 5),
            status: attributes.status || 'ongoing',
            source: 'mangadex',
        };
    }
    async getPopularManga(limit = 20) {
        try {
            const response = await this.api.get('/manga', {
                params: {
                    limit,
                    includes: ['cover_art'],
                    order: { rating: 'desc' },
                    contentRating: ['safe'],
                },
            });
            const mangaList = response.data.data;
            const seriesList = [];
            for (const manga of mangaList) {
                const attributes = manga.attributes;
                const id = manga.id;
                const transformed = {
                    title: this.pickLocalizedValue(attributes.title) || 'Unknown Title',
                    description: this.pickLocalizedValue(attributes.description),
                    status: attributes.status || 'ongoing',
                    externalId: id,
                };
                // Genres - genre tags only, limit 5
                const genres = [];
                if (attributes.tags) {
                    for (const tag of attributes.tags) {
                        if (tag.type === 'tag' && tag.attributes.group === 'genre') {
                            const name = this.pickLocalizedValue(tag.attributes.name);
                            if (name)
                                genres.push(name);
                        }
                    }
                }
                transformed.genres = genres.slice(0, 5);
                // Cover art
                const coverRel = manga.relationships.find((rel) => rel.type === 'cover_art');
                if (coverRel) {
                    transformed.coverImage = `https://uploads.mangadex.org/covers/${id}/${coverRel.attributes.fileName}.512.jpg`;
                }
                seriesList.push(transformed);
                // Rate limit: 200ms delay (~5 req/s)
                await this.delay(200);
            }
            return seriesList;
        }
        catch (error) {
            console.error('MangaDex getPopularManga error:', error.message);
            throw new Error(`Failed to fetch popular manga: ${error.message}`);
        }
    }
    async getPopularReadableManga(page = 1, limit = 12) {
        const safePage = Math.max(page, 1);
        const safeLimit = Math.min(Math.max(limit, 1), 24);
        const batchSize = Math.min(Math.max(safeLimit * 3, 20), 100);
        const skip = (safePage - 1) * safeLimit;
        const readableSeries = [];
        let rawOffset = 0;
        let rawTotal = Number.POSITIVE_INFINITY;
        while (readableSeries.length < skip + safeLimit + 1 && rawOffset < rawTotal) {
            const response = await this.api.get('/manga', {
                params: {
                    limit: batchSize,
                    offset: rawOffset,
                    includes: ['cover_art'],
                    order: { followedCount: 'desc' },
                    contentRating: ['safe'],
                    availableTranslatedLanguage: ['en'],
                },
            });
            const mangaBatch = response.data.data || [];
            rawTotal = response.data.total || mangaBatch.length;
            rawOffset += mangaBatch.length;
            const readableChecks = await Promise.all(mangaBatch.map(async (manga) => {
                const feedResponse = await this.getMangaFeedPage(manga.id, 5, 0);
                const hasReadableChapter = feedResponse.data.data.some((chapter) => chapter.attributes.translatedLanguage === 'en' && chapter.attributes.pages > 0);
                return hasReadableChapter ? this.transformManga(manga) : null;
            }));
            for (const readableSeriesItem of readableChecks) {
                if (readableSeries.length >= skip + safeLimit + 1) {
                    break;
                }
                if (readableSeriesItem) {
                    readableSeries.push(readableSeriesItem);
                }
            }
            if (mangaBatch.length === 0) {
                break;
            }
        }
        const items = readableSeries.slice(skip, skip + safeLimit);
        return {
            items,
            pagination: {
                page: safePage,
                limit: safeLimit,
                hasNextPage: readableSeries.length > skip + safeLimit || rawOffset < rawTotal,
            },
        };
    }
    async getReadableMangaById(seriesId) {
        const externalId = this.getExternalSeriesId(seriesId);
        const [mangaResponse, chapters] = await Promise.all([
            this.api.get(`/manga/${externalId}`, {
                params: { includes: ['cover_art'] },
            }),
            this.getAllReadableChapters(externalId),
        ]);
        const series = this.transformManga(mangaResponse.data.data);
        return {
            ...series,
            chapters,
        };
    }
    async getReadableChapterById(chapterId) {
        const externalChapterId = this.getExternalChapterId(chapterId);
        const [chapterResponse, atHomeResponse] = await Promise.all([
            this.api.get(`/chapter/${externalChapterId}`),
            this.api.get(`/at-home/server/${externalChapterId}`),
        ]);
        const chapter = chapterResponse.data.data;
        const mangaRelationship = chapterResponse.data.data.relationships.find((rel) => rel.type === 'manga');
        const seriesId = mangaRelationship ? this.toSeriesId(mangaRelationship.id) : '';
        const baseUrl = atHomeResponse.data.baseUrl;
        const hash = atHomeResponse.data.chapter.hash;
        const pages = (atHomeResponse.data.chapter.data || []).map((fileName) => `${baseUrl}/data/${hash}/${fileName}`);
        return {
            _id: this.toChapterId(chapter.id),
            series: seriesId,
            title: chapter.attributes.title || `Chapter ${chapter.attributes.chapter || '?'}`,
            number: chapter.attributes.chapter || '?',
            pages,
        };
    }
}
export const mangadexService = new MangaDexService();
