import Series from './models/series.js';
import Chapter from './models/chapter.js';
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
export async function seedDatabase() {
    // Only seed if collections are empty
    const seriesCount = await Series.countDocuments();
    if (seriesCount === 0) {
        const createdSeries = [];
        for (const seriesData of SAMPLE_SERIES) {
            const series = new Series({
                title: seriesData.title,
                description: seriesData.description,
                coverImage: seriesData.coverImage,
                genres: seriesData.genres,
                status: seriesData.status,
            });
            await series.save();
            const chapterIds = [];
            for (const chap of seriesData.chapters) {
                const chapter = new Chapter({
                    series: series._id,
                    title: chap.title,
                    number: chap.number,
                    pages: chap.pages,
                });
                await chapter.save();
                chapterIds.push(chapter._id.toString());
            }
            series.chapters = chapterIds;
            await series.save();
            createdSeries.push(series);
        }
        console.log(`Seeded ${createdSeries.length} series`);
    }
}
