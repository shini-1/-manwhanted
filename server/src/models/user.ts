import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  bookmarks: mongoose.Types.ObjectId[];
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    bookmarks: [{ type: Schema.Types.ObjectId, ref: 'Series' }],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IUser>('User', userSchema);
