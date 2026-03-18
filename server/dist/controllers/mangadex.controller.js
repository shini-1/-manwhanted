import { mangadexService } from '../services/mangadex.service.js';
import Series from '../models/series.js';
export const importPopular = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        if (limit > 100) {
            return res.status(400).json({ message: 'Limit max 100' });
        }
        console.log(`Importing ${limit} popular series from MangaDex...`);
        const seriesData = await mangadexService.getPopularManga(limit);
        // Prepare upsert operations
        const operations = seriesData.map((data) => ({
            updateOne: {
                filter: { externalId: data.externalId },
                update: {
                    $setOnInsert: data,
                    $set: {
                        title: data.title,
                        description: data.description,
                        coverImage: data.coverImage,
                        genres: data.genres,
                        status: data.status,
                    },
                },
                upsert: true,
            },
        }));
        const result = await Series.bulkWrite(operations, { ordered: false });
        console.log(`Import complete: ${result.upsertedCount} inserted, ${result.modifiedCount} updated`);
        res.json({
            success: true,
            inserted: result.upsertedCount,
            updated: result.modifiedCount,
            total: result.upsertedCount + result.modifiedCount,
        });
    }
    catch (error) {
        console.error('Import popular error:', error);
        res.status(500).json({ message: error.message || 'Import failed' });
    }
};
