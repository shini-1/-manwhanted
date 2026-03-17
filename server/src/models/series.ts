import mongoose, { Schema, Document } from 'mongoose';

export interface ISeries extends Document {
  title: string;
  description: string;
  coverImage: string;
  genres: string[];
  status: string;
  chapters: mongoose.Types.ObjectId[];
  externalId?: string;
}

const seriesSchema = new Schema<ISeries>(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    genres: [{ type: String }],
    status: { type: String, default: 'ongoing' },
    chapters: [{ type: Schema.Types.ObjectId, ref: 'Chapter' }],
    externalId: { type: String, unique: true, sparse: true },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ISeries>('Series', seriesSchema);
