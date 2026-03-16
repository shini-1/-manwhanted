import mongoose, { Schema, Document } from 'mongoose';

export interface IChapter extends Document {
  series: mongoose.Types.ObjectId;
  title: string;
  number: string;
  pages: string[];
}

const chapterSchema = new Schema<IChapter>(
  {
    series: { type: Schema.Types.ObjectId, ref: 'Series', required: true },
    title: { type: String, required: true },
    number: { type: String, required: true },
    pages: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IChapter>('Chapter', chapterSchema);
