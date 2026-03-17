import mongoose, { Schema } from 'mongoose';
const seriesSchema = new Schema({
    title: { type: String, required: true },
    description: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    genres: [{ type: String }],
    status: { type: String, default: 'ongoing' },
    chapters: [{ type: Schema.Types.ObjectId, ref: 'Chapter' }],
    externalId: { type: String, unique: true, sparse: true },
}, {
    timestamps: true,
});
export default mongoose.model('Series', seriesSchema);
