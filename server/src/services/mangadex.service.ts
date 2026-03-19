import axios, { AxiosInstance } from 'axios';
import { ISeries } from '../models/series.js';
import process from 'node:process';

const BASE_URL = process.env.MANGADEX_API_BASE || 'https://api.mangadex.org';
const MANGADEX_SERIES_PREFIX = 'md_';
const MANGADEX_CHAPTER_PREFIX = 'mdc_';

interface MangaDexManga {
  id: string;
  attributes: {
    title: Record<string, string>;
    altTitles?: Array<Record<string, string>>;
    description?: Record<string, string>;
    status: string;
    originalLanguage?: string;
    publicationDemographic?: string | null;
    contentRating?: string;
    tags?: Array<{
      type: string;
      attributes: {
        name: Record<string, string>;
        group: string;
      };
    }>;
  };
  relationships: Array<{
    type: string;
    id: string;
    attributes?: {
      fileName?: string;
    };
  }>;
}

interface MangaDexListResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

interface MangaDexChapter {
  id: string;
  attributes: {
    title: string | null;
    chapter: string | null;
    translatedLanguage: string;
    pages: number;
  };
}

interface MangaDexAtHomeResponse {
  baseUrl: string;
  chapter: {
    hash: string;
    data: string[];
    dataSaver: string[];
  };
}

interface MangaDexTag {
  id: string;
  attributes: {
    name: Record<string, string>;
    group: string;
  };
}

interface MangaDexAggregateChapter {
  chapter: string | null;
  id?: string;
  isUnavailable?: boolean;
  count?: number;
}

interface MangaDexAggregateVolume {
  volume: string;
  count: number;
  chapters: Record<string, MangaDexAggregateChapter>;
}

interface MangaDexAggregateResponse {
  result: string;
  volumes: Record<string, MangaDexAggregateVolume>;
}

type MangaDexFilterOptions = {
  origin?: string;
  status?: string;
  demographic?: string;
  contentRating?: string;
  includedTags?: string[];
  sort?: string;
};

type MangaDexReadableAvailability = {
  chapterCount: number;
  firstReadableChapter: string | null;
  lastReadableChapter: string | null;
  firstNumericChapter: number | null;
  lastNumericChapter: number | null;
  startsAtBeginning: boolean;
  missingMainChapterNumbers: number[];
  hasNoMissingMainChapters: boolean;
  shouldSurfaceInListings: boolean;
};

class MangaDexService {
  private api: AxiosInstance;
  private tagCache: Array<{ id: string; name: string; group: string }> | null = null;
  private availabilityCache = new Map<string, MangaDexReadableAvailability>();

  constructor() {
    this.api = axios.create({
      baseURL: BASE_URL,
      timeout: 20000,
    });
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private pickLocalizedValue(values?: Record<string, string>): string {
    if (!values) return '';
    if (values.en) return values.en;
    if (values.en_us) return values.en_us;
    return Object.values(values)[0] || '';
  }

  private pickEnglishAltTitle(altTitles?: Array<Record<string, string>>): string {
    if (!Array.isArray(altTitles)) {
      return '';
    }

    for (const altTitle of altTitles) {
      if (altTitle.en) return altTitle.en;
      if (altTitle.en_us) return altTitle.en_us;
    }

    return '';
  }

  private pickSeriesTitle(attributes: MangaDexManga['attributes']): string {
    const directEnglishTitle = attributes.title?.en || attributes.title?.en_us || '';
    const englishAltTitle = this.pickEnglishAltTitle(attributes.altTitles);

    if (directEnglishTitle) {
      return directEnglishTitle;
    }

    if (['ko', 'zh', 'zh-hk'].includes(attributes.originalLanguage || '') && englishAltTitle) {
      return englishAltTitle;
    }

    return englishAltTitle || this.pickLocalizedValue(attributes.title) || 'Unknown Title';
  }

  private toSeriesId(externalId: string): string {
    return `${MANGADEX_SERIES_PREFIX}${externalId}`;
  }

  private toChapterId(chapterId: string): string {
    return `${MANGADEX_CHAPTER_PREFIX}${chapterId}`;
  }

  private buildCoverImage(externalId: string, fileName?: string): string {
    return fileName
      ? `https://uploads.mangadex.org/covers/${externalId}/${fileName}.512.jpg`
      : '';
  }

  private async getMangaFeedPage(externalId: string, limit: number, offset: number = 0) {
    return this.api.get<MangaDexListResponse<MangaDexChapter>>(`/manga/${externalId}/feed`, {
      params: {
        translatedLanguage: ['en'],
        order: { chapter: 'asc' },
        limit,
        offset,
      },
    });
  }

  private async getAllReadableChapters(externalId: string) {
    const chapters = await this.getAllMangaChapters(externalId);
    const seen = new Set<string>();

    return chapters
      .filter((chapter) => chapter.attributes.translatedLanguage === 'en')
      .filter((chapter) => chapter.attributes.pages > 0)
      .filter((chapter) => {
        const key = `${chapter.attributes.chapter || ''}:${chapter.attributes.title || ''}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((chapter) => ({
        _id: this.toChapterId(chapter.id),
        title: chapter.attributes.title || `Chapter ${chapter.attributes.chapter || '?'}`,
        number: chapter.attributes.chapter || '?',
      }));
  }

  private async getAllMangaChapters(externalId: string) {
    const chapters: MangaDexChapter[] = [];
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

    return chapters;
  }

  private mapChaptersForSeries(chapters: MangaDexChapter[]) {
    const seen = new Set<string>();

    return chapters
      .filter((chapter) => chapter.attributes.translatedLanguage === 'en')
      .filter((chapter) => {
        const key = chapter.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((chapter) => ({
        _id: this.toChapterId(chapter.id),
        title: chapter.attributes.title || `Chapter ${chapter.attributes.chapter || '?'}`,
        number: chapter.attributes.chapter || '?',
        pages: chapter.attributes.pages,
      }));
  }

  private parseChapterNumber(chapter: string | null | undefined): number | null {
    if (!chapter) {
      return null;
    }

    const normalized = chapter.replace(/[^0-9.]/g, '');
    if (!normalized) {
      return null;
    }

    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private getAvailabilityEntries(aggregate: MangaDexAggregateResponse) {
    const entries: Array<{ chapter: string | null; numeric: number | null }> = [];

    for (const volume of Object.values(aggregate.volumes || {})) {
      for (const chapter of Object.values(volume.chapters || {})) {
        if (chapter.isUnavailable) {
          continue;
        }

        entries.push({
          chapter: chapter.chapter || null,
          numeric: this.parseChapterNumber(chapter.chapter),
        });
      }
    }

    return entries.sort((left, right) => {
      if (left.numeric === null && right.numeric === null) {
        return (left.chapter || '').localeCompare(right.chapter || '');
      }

      if (left.numeric === null) {
        return 1;
      }

      if (right.numeric === null) {
        return -1;
      }

      return left.numeric - right.numeric;
    });
  }

  private async getReadableAvailability(externalId: string): Promise<MangaDexReadableAvailability> {
    const cached = this.availabilityCache.get(externalId);
    if (cached) {
      return cached;
    }

    const response = await this.api.get<MangaDexAggregateResponse>(`/manga/${externalId}/aggregate`, {
      params: {
        translatedLanguage: ['en'],
      },
    });

    const entries = this.getAvailabilityEntries(response.data);
    const numericEntries = entries
      .map((entry) => entry.numeric)
      .filter((value): value is number => value !== null);
    const firstReadableChapter = entries[0]?.chapter || null;
    const lastReadableChapter = entries[entries.length - 1]?.chapter || null;
    const firstNumericChapter = numericEntries[0] ?? null;
    const lastNumericChapter = numericEntries[numericEntries.length - 1] ?? null;
    const startsAtBeginning = firstNumericChapter !== null && firstNumericChapter <= 1.5;
    const coveredMainChapters = new Set(
      numericEntries
        .filter((chapter) => chapter >= 1)
        .map((chapter) => Math.floor(chapter))
    );
    const maxMainChapter = coveredMainChapters.size > 0 ? Math.max(...coveredMainChapters) : 0;
    const missingMainChapterNumbers: number[] = [];

    for (let chapterNumber = 1; chapterNumber <= maxMainChapter; chapterNumber += 1) {
      if (!coveredMainChapters.has(chapterNumber)) {
        missingMainChapterNumbers.push(chapterNumber);
      }
    }

    const hasNoMissingMainChapters = missingMainChapterNumbers.length === 0;
    const shouldSurfaceInListings = entries.length > 0 && startsAtBeginning && hasNoMissingMainChapters;

    const availability = {
      chapterCount: entries.length,
      firstReadableChapter,
      lastReadableChapter,
      firstNumericChapter,
      lastNumericChapter,
      startsAtBeginning,
      missingMainChapterNumbers,
      hasNoMissingMainChapters,
      shouldSurfaceInListings,
    };

    this.availabilityCache.set(externalId, availability);
    return availability;
  }

  private normalizeSearchText(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  private getListingScore(
    series: ReturnType<MangaDexService['transformManga']> & {
      chapterCount?: number;
      firstReadableChapter?: string | null;
      hasNoMissingMainChapters?: boolean;
    },
    query?: string
  ) {
    let score = series.chapterCount || 0;
    const normalizedTitle = this.normalizeSearchText(series.title || '');

    if (series.firstReadableChapter === '1' || series.firstReadableChapter === '0' || series.firstReadableChapter === '0.5') {
      score += 50;
    }

    if (series.hasNoMissingMainChapters) {
      score += 250;
    }

    if (!query) {
      return score;
    }

    const normalizedQuery = this.normalizeSearchText(query);
    if (!normalizedQuery) {
      return score;
    }

    if (normalizedTitle === normalizedQuery) {
      score += 1000;
    } else if (normalizedTitle.startsWith(normalizedQuery)) {
      score += 700;
    } else if (normalizedTitle.includes(normalizedQuery)) {
      score += 350;
    }

    if (normalizedTitle.includes('doujinshi')) {
      score -= 400;
    }

    if (normalizedTitle.includes('anthology')) {
      score -= 250;
    }

    if (normalizedTitle.includes('official comic anthology')) {
      score -= 250;
    }

    return score;
  }

  isMangaDexSeriesId(id: string): boolean {
    return id.startsWith(MANGADEX_SERIES_PREFIX);
  }

  isMangaDexChapterId(id: string): boolean {
    return id.startsWith(MANGADEX_CHAPTER_PREFIX);
  }

  getExternalSeriesId(id: string): string {
    return this.isMangaDexSeriesId(id) ? id.slice(MANGADEX_SERIES_PREFIX.length) : id;
  }

  getExternalChapterId(id: string): string {
    return this.isMangaDexChapterId(id) ? id.slice(MANGADEX_CHAPTER_PREFIX.length) : id;
  }

  private transformManga(manga: MangaDexManga) {
    const attributes = manga.attributes;
    const externalId = manga.id;

    const title = this.pickSeriesTitle(attributes);
    const description = this.pickLocalizedValue(attributes.description);

    const genres: string[] = [];
    if (attributes.tags) {
      for (const tag of attributes.tags) {
        if (tag.type === 'tag' && tag.attributes.group === 'genre') {
          const name = this.pickLocalizedValue(tag.attributes.name);
          if (name) genres.push(name);
        }
      }
    }

    const coverRel = manga.relationships.find((rel) => rel.type === 'cover_art');
    const coverImage = this.buildCoverImage(externalId, coverRel?.attributes?.fileName);

    return {
      _id: this.toSeriesId(externalId),
      externalId,
      title,
      description,
      coverImage,
      thumbnailImage: coverImage,
      genres: genres.slice(0, 5),
      status: attributes.status || 'ongoing',
      originalLanguage: attributes.originalLanguage || 'unknown',
      publicationDemographic: attributes.publicationDemographic || '',
      contentRating: attributes.contentRating || 'safe',
      source: 'mangadex',
    };
  }

  private matchesOriginFilter(manga: MangaDexManga, origin?: string) {
    if (!origin || origin === 'all') {
      return true;
    }

    const language = manga.attributes.originalLanguage || '';

    if (origin === 'manga') return language === 'ja';
    if (origin === 'manhwa') return language === 'ko';
    if (origin === 'manhua') return language === 'zh' || language === 'zh-hk';
    if (origin === 'other') return !['ja', 'ko', 'zh', 'zh-hk'].includes(language);

    return true;
  }

  private buildMangaListParams(
    limit: number,
    offset: number,
    extraParams: Record<string, string>,
    filters: MangaDexFilterOptions
  ) {
    const params: Record<string, unknown> = {
      limit,
      offset,
      includes: ['cover_art'],
      contentRating: filters.contentRating && filters.contentRating !== 'all'
        ? [filters.contentRating]
        : ['safe'],
      availableTranslatedLanguage: ['en'],
      ...extraParams,
    };

    if (!extraParams.title) {
      const sortKey = filters.sort || 'followedCount';
      params.order = { [sortKey]: 'desc' };
    }

    if (filters.status && filters.status !== 'all') {
      params.status = [filters.status];
    }

    if (filters.demographic && filters.demographic !== 'all') {
      params.publicationDemographic = [filters.demographic];
    }

    if (filters.includedTags?.length) {
      params.includedTags = filters.includedTags;
      params.includedTagsMode = 'AND';
    }

    if (filters.origin && ['manga', 'manhwa', 'manhua'].includes(filters.origin)) {
      if (filters.origin === 'manga') params.originalLanguage = ['ja'];
      if (filters.origin === 'manhwa') params.originalLanguage = ['ko'];
      if (filters.origin === 'manhua') params.originalLanguage = ['zh', 'zh-hk'];
    }

    return params;
  }

  async getPopularManga(limit: number = 20): Promise<Partial<ISeries>[]> {
    try {
      const response = await this.api.get<{ data: MangaDexManga[] }>('/manga', {
        params: {
          limit,
          includes: ['cover_art'],
          order: { rating: 'desc' },
          contentRating: ['safe'],
        },
      });

      const mangaList = response.data.data;
      const seriesList: Partial<ISeries>[] = [];

      for (const manga of mangaList) {
        const attributes = manga.attributes;
        const id = manga.id;

        const transformed: Partial<ISeries> & {
          externalId?: string;
          thumbnailImage?: string;
        } = {
          title: this.pickSeriesTitle(attributes),
          description: this.pickLocalizedValue(attributes.description),
          status: attributes.status || 'ongoing',
          externalId: id,
        };

        // Genres - genre tags only, limit 5
        const genres: string[] = [];
        if (attributes.tags) {
          for (const tag of attributes.tags) {
            if (tag.type === 'tag' && tag.attributes.group === 'genre') {
              const name = this.pickLocalizedValue(tag.attributes.name);
              if (name) genres.push(name);
            }
          }
        }
        transformed.genres = genres.slice(0, 5);

        // Cover art
        const coverRel = manga.relationships.find((rel) => rel.type === 'cover_art');
        transformed.coverImage = this.buildCoverImage(id, coverRel?.attributes?.fileName);
        transformed.thumbnailImage = transformed.coverImage;

        seriesList.push(transformed as Partial<ISeries>);

        // Rate limit: 200ms delay (~5 req/s)
        await this.delay(200);
      }

      return seriesList;
    } catch (error: any) {
      console.error('MangaDex getPopularManga error:', error.message);
      throw new Error(`Failed to fetch popular manga: ${error.message}`);
    }
  }

  async getPopularReadableManga(page: number = 1, limit: number = 12, filters: MangaDexFilterOptions = {}) {
    return this.getReadableMangaListing({}, page, limit, filters);
  }

  async searchReadableManga(
    query: string,
    page: number = 1,
    limit: number = 12,
    filters: MangaDexFilterOptions = {}
  ) {
    return this.getReadableMangaListing({ title: query }, page, limit, filters);
  }

  private async getReadableMangaListing(
    extraParams: Record<string, string>,
    page: number = 1,
    limit: number = 12,
    filters: MangaDexFilterOptions = {}
  ) {
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 24);
    const batchSize = Math.min(Math.max(safeLimit * 3, 20), 100);
    const skip = (safePage - 1) * safeLimit;
    const targetCount = skip + safeLimit + (extraParams.title ? safeLimit * 2 : 1);
    const readableSeries: Array<ReturnType<MangaDexService['transformManga']> & {
      chapterCount: number;
      firstReadableChapter: string | null;
      lastReadableChapter: string | null;
      hasNoMissingMainChapters: boolean;
    }> = [];
    let rawOffset = 0;
    let rawTotal = Number.POSITIVE_INFINITY;

    while (readableSeries.length < targetCount && rawOffset < rawTotal) {
      const response = await this.api.get<MangaDexListResponse<MangaDexManga>>('/manga', {
        params: this.buildMangaListParams(batchSize, rawOffset, extraParams, filters),
      });
      const mangaBatch = response.data.data || [];
      rawTotal = response.data.total || mangaBatch.length;
      rawOffset += mangaBatch.length;

      const readableChecks = await Promise.all(
        mangaBatch
          .filter((manga) => this.matchesOriginFilter(manga, filters.origin))
          .map(async (manga) => {
            const availability = await this.getReadableAvailability(manga.id);
            if (!availability.shouldSurfaceInListings) {
              return null;
            }

            return {
              ...this.transformManga(manga),
              chapterCount: availability.chapterCount,
              firstReadableChapter: availability.firstReadableChapter,
              lastReadableChapter: availability.lastReadableChapter,
              hasNoMissingMainChapters: availability.hasNoMissingMainChapters,
            };
          })
      );

      const sortedBatch = readableChecks
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .sort((left, right) => this.getListingScore(right, extraParams.title) - this.getListingScore(left, extraParams.title));

      for (const readableSeriesItem of sortedBatch) {
        if (readableSeries.length >= targetCount) {
          break;
        }

        readableSeries.push(readableSeriesItem);
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

  async getFilterOptions() {
    if (!this.tagCache) {
      const response = await this.api.get<{ data: MangaDexTag[] }>('/manga/tag');
      this.tagCache = response.data.data
        .map((tag) => ({
          id: tag.id,
          name: this.pickLocalizedValue(tag.attributes.name),
          group: tag.attributes.group,
        }))
        .filter((tag) => ['genre', 'theme', 'format'].includes(tag.group))
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    return {
      origins: [
        { value: 'all', label: 'All' },
        { value: 'manga', label: 'Manga' },
        { value: 'manhwa', label: 'Manhwa' },
        { value: 'manhua', label: 'Manhua' },
        { value: 'other', label: 'Other' },
      ],
      statuses: [
        { value: 'all', label: 'Any status' },
        { value: 'ongoing', label: 'Ongoing' },
        { value: 'completed', label: 'Completed' },
        { value: 'hiatus', label: 'Hiatus' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
      demographics: [
        { value: 'all', label: 'Any demographic' },
        { value: 'shounen', label: 'Shounen' },
        { value: 'shoujo', label: 'Shoujo' },
        { value: 'seinen', label: 'Seinen' },
        { value: 'josei', label: 'Josei' },
      ],
      contentRatings: [
        { value: 'all', label: 'All ratings' },
        { value: 'safe', label: 'Safe' },
        { value: 'suggestive', label: 'Suggestive' },
        { value: 'erotica', label: 'Erotica' },
      ],
      sorts: [
        { value: 'followedCount', label: 'Popular' },
        { value: 'rating', label: 'Top rated' },
        { value: 'latestUploadedChapter', label: 'Latest updates' },
        { value: 'year', label: 'Newest series' },
      ],
      tags: this.tagCache,
    };
  }

  async getReadableMangaById(seriesId: string) {
    const externalId = this.getExternalSeriesId(seriesId);
    const [mangaResponse, chapters, availability] = await Promise.all([
      this.api.get<{ data: MangaDexManga }>(`/manga/${externalId}`, {
        params: { includes: ['cover_art'] },
      }),
      this.getAllMangaChapters(externalId),
      this.getReadableAvailability(externalId),
    ]);

    const series = this.transformManga(mangaResponse.data.data);

    return {
      ...series,
      chapterCount: availability.chapterCount,
      firstReadableChapter: availability.firstReadableChapter,
      lastReadableChapter: availability.lastReadableChapter,
      hasNoMissingMainChapters: availability.hasNoMissingMainChapters,
      missingMainChapterNumbers: availability.missingMainChapterNumbers,
      chapters: this.mapChaptersForSeries(chapters),
    };
  }

  async getReadableChapterById(chapterId: string) {
    const externalChapterId = this.getExternalChapterId(chapterId);

    const [chapterResponse, atHomeResponse] = await Promise.all([
      this.api.get<{ data: MangaDexChapter & { relationships: Array<{ type: string; id: string }> } }>(`/chapter/${externalChapterId}`),
      this.api.get<MangaDexAtHomeResponse>(`/at-home/server/${externalChapterId}`),
    ]);

    const chapter = chapterResponse.data.data;
    const mangaRelationship = chapterResponse.data.data.relationships.find((rel) => rel.type === 'manga');
    const seriesId = mangaRelationship ? this.toSeriesId(mangaRelationship.id) : '';
    const baseUrl = atHomeResponse.data.baseUrl;
    const hash = atHomeResponse.data.chapter.hash;
    const pageSources = (atHomeResponse.data.chapter.data || [])
      .map((fileName, index) => {
        const dataUrl = `${baseUrl}/data/${hash}/${fileName}`;
        const dataSaverFileName = atHomeResponse.data.chapter.dataSaver?.[index];
        const dataSaverUrl = dataSaverFileName
          ? `${baseUrl}/data-saver/${hash}/${dataSaverFileName}`
          : '';
        const candidates = [dataUrl, dataSaverUrl].filter(Boolean);

        if (candidates.length === 0) {
          return null;
        }

        return {
          url: candidates[0],
          candidates: [...new Set(candidates)],
        };
      })
      .filter((pageSource): pageSource is { url: string; candidates: string[] } => Boolean(pageSource));
    const pages = pageSources.map((pageSource) => pageSource.url);

    return {
      _id: this.toChapterId(chapter.id),
      series: seriesId,
      title: chapter.attributes.title || `Chapter ${chapter.attributes.chapter || '?'}`,
      number: chapter.attributes.chapter || '?',
      pages,
      pageSources,
      previewImage: pageSources[0]?.url || '',
    };
  }
}

export const mangadexService = new MangaDexService();
