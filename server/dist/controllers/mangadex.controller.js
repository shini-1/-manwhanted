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
exports.importPopular = void 0;
const mangadex_service_1 = require("../services/mangadex.service");
const series_1 = __importDefault(require("../models/series"));
const importPopular = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const limit = parseInt(req.query.limit) || 20;
        if (limit > 100) {
            return res.status(400).json({ message: 'Limit max 100' });
        }
        console.log(`Importing ${limit} popular series from MangaDex...`);
        const seriesData = yield mangadex_service_1.mangadexService.getPopularManga(limit);
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
        const result = yield series_1.default.bulkWrite(operations, { ordered: false });
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
});
exports.importPopular = importPopular;
