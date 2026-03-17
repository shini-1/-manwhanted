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
exports.seedDatabase = void 0;
const series_1 = __importDefault(require("./models/series"));
const chapter_1 = __importDefault(require("./models/chapter"));
const user_1 = __importDefault(require("./models/user"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const DEFAULT_USER = {
    email: 'reader@example.com',
    password: 'password123',
};
const SAMPLE_SERIES = [
    {
        title: 'Skybound Chronicles',
        description: 'A young hero discovers hidden powers in a world of floating islands.',
        coverImage: 'https://images.unsplash.com/photo-1508780709619-79562169bc64?auto=format&fit=crop&w=800&q=80',
        genres: ['Adventure', 'Fantasy'],
        status: 'Ongoing',
        chapters: [
            {
                title: 'Chapter 1: Awakening',
                number: '1',
                pages: [
                    'https://picsum.photos/seed/sky1/800/1200',
                    'https://picsum.photos/seed/sky2/800/1200',
                    'https://picsum.photos/seed/sky3/800/1200',
                ],
            },
            {
                title: 'Chapter 2: Wind Whisper',
                number: '2',
                pages: [
                    'https://picsum.photos/seed/wind1/800/1200',
                    'https://picsum.photos/seed/wind2/800/1200',
                    'https://picsum.photos/seed/wind3/800/1200',
                ],
            },
        ],
    },
    {
        title: 'Neon Knights',
        description: 'Cyberpunk warriors fight for justice in a neon-lit metropolis.',
        coverImage: 'https://images.unsplash.com/photo-1517816428104-41553eab1e12?auto=format&fit=crop&w=800&q=80',
        genres: ['Action', 'Sci-Fi'],
        status: 'Completed',
        chapters: [
            {
                title: 'Chapter 1: Neon Streets',
                number: '1',
                pages: [
                    'https://picsum.photos/seed/neon1/800/1200',
                    'https://picsum.photos/seed/neon2/800/1200',
                    'https://picsum.photos/seed/neon3/800/1200',
                ],
            },
        ],
    },
];
function seedDatabase() {
    return __awaiter(this, void 0, void 0, function* () {
        // Only seed if collections are empty
        const seriesCount = yield series_1.default.countDocuments();
        const userCount = yield user_1.default.countDocuments();
        if (seriesCount === 0) {
            const createdSeries = [];
            for (const seriesData of SAMPLE_SERIES) {
                const series = new series_1.default({
                    title: seriesData.title,
                    description: seriesData.description,
                    coverImage: seriesData.coverImage,
                    genres: seriesData.genres,
                    status: seriesData.status,
                });
                yield series.save();
                const chapterIds = [];
                for (const chap of seriesData.chapters) {
                    const chapter = new chapter_1.default({
                        series: series._id,
                        title: chap.title,
                        number: chap.number,
                        pages: chap.pages,
                    });
                    yield chapter.save();
                    chapterIds.push(chapter._id.toString());
                }
                series.chapters = chapterIds;
                yield series.save();
                createdSeries.push(series);
            }
            console.log(`Seeded ${createdSeries.length} series`);
        }
        if (userCount === 0) {
            const hashedPassword = yield bcryptjs_1.default.hash(DEFAULT_USER.password, 10);
            yield new user_1.default({ email: DEFAULT_USER.email, password: hashedPassword }).save();
            console.log(`Seeded default user: ${DEFAULT_USER.email} / ${DEFAULT_USER.password}`);
        }
    });
}
exports.seedDatabase = seedDatabase;
