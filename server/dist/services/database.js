import mongoose from 'mongoose';
let mongoConnectionPromise = null;
export const isDatabaseConfigured = () => Boolean(process.env.MONGO_URI);
export const ensureDatabaseConnection = async () => {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        throw new Error('MONGO_URI is not configured for the server deployment.');
    }
    if (mongoose.connection.readyState === 1) {
        return mongoose;
    }
    if (!mongoConnectionPromise) {
        mongoConnectionPromise = mongoose.connect(mongoUri);
    }
    try {
        await mongoConnectionPromise;
        return mongoose;
    }
    catch (error) {
        mongoConnectionPromise = null;
        throw error;
    }
};
export const isDatabaseConfigurationError = (error) => error instanceof Error && error.message.includes('MONGO_URI');
export const isDatabaseUnavailableError = (error) => isDatabaseConfigurationError(error) ||
    (error instanceof Error &&
        /ECONN|ENOTFOUND|ETIMEDOUT|Mongo|buffering timed out/i.test(error.message));
