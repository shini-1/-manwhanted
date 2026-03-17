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
exports.mangadexService = void 0;
const axios_1 = __importDefault(require("axios"));
const BASE_URL = process.env.MANGADEX_API_BASE || 'https://api.mangadex.org';
class MangaDexService {
    constructor() {
        this.api = axios_1.default.create({
            baseURL: BASE_URL,
            timeout: 10000,
        });
    }
    delay(ms) {
        return __awaiter(this, void 0, void 0, function* () {
            return;
        });
    }
    getPopularManga(limit = 20) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield this.api.get('/manga', {
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
                    yield this.delay(200);
                }
                return seriesList;
            }
            catch (error) {
                console.error('MangaDex getPopularManga error:', error.message);
                throw new Error(`Failed to fetch popular manga: ${error.message}`);
            }
        });
    }
}
exports.mangadexService = new MangaDexService();
