import axios from 'axios';
import process from 'node:process';
const BASE_URL = process.env.MANGADEX_API_BASE || 'https://api.mangadex.org';
class MangaDexService {
    api;
    constructor() {
        this.api = axios.create({
            baseURL: BASE_URL,
            timeout: 10000,
        });
    }
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
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
                // Title - prefer en, en_us, first available
                const titleObj = attributes.title;
                let title;
                if (titleObj['en']) {
                    title = titleObj['en'];
                }
                else if (titleObj['en_us']) {
                    title = titleObj['en_us'];
                }
                else {
                    const keys = Object.keys(titleObj);
                    title = titleObj[keys[0]] || 'Unknown Title';
                }
                // Description
                const descObj = attributes.description || {};
                let description;
                if (descObj['en']) {
                    description = descObj['en'];
                }
                else if (descObj['en_us']) {
                    description = descObj['en_us'];
                }
                else {
                    const keys = Object.keys(descObj);
                    description = descObj[keys[0]] || '';
                }
                const transformed = {
                    title,
                    description,
                    status: attributes.status || 'ongoing',
                    externalId: id,
                };
                // Genres - genre tags only, limit 5
                const genres = [];
                if (attributes.tags) {
                    for (const tag of attributes.tags) {
                        if (tag.type === 'tag' && tag.attributes.group === 'genre') {
                            const nameObj = tag.attributes.name;
                            let name;
                            if (nameObj['en']) {
                                name = nameObj['en'];
                            }
                            else if (nameObj['en_us']) {
                                name = nameObj['en_us'];
                            }
                            else {
                                const keys = Object.keys(nameObj);
                                name = nameObj[keys[0]];
                            }
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
}
export const mangadexService = new MangaDexService();
