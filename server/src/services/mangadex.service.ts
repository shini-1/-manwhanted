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
    description?: Record<string, string>;
    status: string;
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
    attributes: {
      fileName: string;
    };
  }>;
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

class MangaDexService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: BASE_URL,
      timeout: 10000,
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

  private toSeriesId(externalId: string): string {
    return `${MANGADEX_SERIES_PREFIX}${externalId}`;
  }

  private toChapterId(chapterId: string): string {
    return `${MANGADEX_CHAPTER_PREFIX}${chapterId}`;
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

    const title = this.pickLocalizedValue(attributes.title) || 'Unknown Title';
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

        const transformed: Partial<ISeries> & { externalId?: string } = {
          title: this.pickLocalizedValue(attributes.title) || 'Unknown Title',
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
        if (coverRel) {
          transformed.coverImage = `https://uploads.mangadex.org/covers/${id}/${coverRel.attributes.fileName}.512.jpg`;
        }

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

  async getPopularReadableManga(limit: number = 12) {
    const response = await this.api.get<{ data: MangaDexManga[] }>('/manga', {
      params: {
        limit: Math.min(limit * 3, 50),
        includes: ['cover_art'],
        order: { followedCount: 'desc' },
        contentRating: ['safe'],
        availableTranslatedLanguage: ['en'],
      },
    });

    const readableSeries = [];

    for (const manga of response.data.data) {
      if (readableSeries.length >= limit) {
        break;
      }

      const feedResponse = await this.api.get<{ data: MangaDexChapter[] }>(`/manga/${manga.id}/feed`, {
        params: {
          translatedLanguage: ['en'],
          order: { chapter: 'asc' },
          limit: 5,
        },
      });

      const hasReadableChapter = feedResponse.data.data.some(
        (chapter) => chapter.attributes.translatedLanguage === 'en' && chapter.attributes.pages > 0
      );

      if (hasReadableChapter) {
        readableSeries.push(this.transformManga(manga));
      }
    }

    return readableSeries;
  }

  async getReadableMangaById(seriesId: string) {
    const externalId = this.getExternalSeriesId(seriesId);
    const [mangaResponse, feedResponse] = await Promise.all([
      this.api.get<{ data: MangaDexManga }>(`/manga/${externalId}`, {
        params: { includes: ['cover_art'] },
      }),
      this.api.get<{ data: MangaDexChapter[] }>(`/manga/${externalId}/feed`, {
        params: {
          translatedLanguage: ['en'],
          order: { chapter: 'asc' },
          limit: 100,
        },
      }),
    ]);

    const series = this.transformManga(mangaResponse.data.data);
    const seen = new Set<string>();
    const chapters = feedResponse.data.data
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

    return {
      ...series,
      chapters,
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
    const pages = (atHomeResponse.data.chapter.data || []).map(
      (fileName) => `${baseUrl}/data/${hash}/${fileName}`
    );

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
