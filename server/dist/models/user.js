import mongoose, { Schema } from 'mongoose';
const userSchema = new Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    bookmarks: [{ type: Schema.Types.ObjectId, ref: 'Series' }],
    readingHistory: [
        {
            series: { type: Schema.Types.ObjectId, ref: 'Series', required: true },
            chapter: { type: Schema.Types.ObjectId, ref: 'Chapter', required: true },
            updatedAt: { type: Date, default: Date.now },
        },
    ],
}, {
    timestamps: true,
});
export default mongoose.model('User', userSchema);
