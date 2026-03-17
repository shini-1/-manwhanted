import mongoose, { Schema } from 'mongoose';
const chapterSchema = new Schema({
    series: { type: Schema.Types.ObjectId, ref: 'Series', required: true },
    title: { type: String, required: true },
    number: { type: String, required: true },
    pages: [{ type: String }],
}, {
    timestamps: true,
});
export default mongoose.model('Chapter', chapterSchema);
