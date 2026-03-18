import { Response } from 'express';
import mongoose from 'mongoose';
import User from '../models/user.js';
import { AuthRequest } from '../middleware/auth.js';

export const getBookmarks = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json(user.bookmarks);
  } catch (err) {
    console.error('Get bookmarks error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const addBookmark = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const { seriesId } = req.params;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const alreadyBookmarked = user.bookmarks.some((id) => id.toString() === seriesId);
    if (!alreadyBookmarked) {
      user.bookmarks.push(new mongoose.Types.ObjectId(seriesId));
      await user.save();
    }

    return res.status(200).json({ bookmarks: user.bookmarks });
  } catch (err) {
    console.error('Add bookmark error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const removeBookmark = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const { seriesId } = req.params;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.bookmarks = user.bookmarks.filter((id) => id.toString() !== seriesId);
    await user.save();

    return res.status(200).json({ bookmarks: user.bookmarks });
  } catch (err) {
    console.error('Remove bookmark error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getReadingHistory = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const { seriesId } = req.params;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const entry = user.readingHistory.find(
      (h) => h.series.toString() === seriesId
    );

    return res.json({ chapterId: entry?.chapter || null });
  } catch (err) {
    console.error('Get reading history error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const setReadingHistory = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const { seriesId } = req.params;
  const { chapterId } = req.body;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!chapterId) {
    return res.status(400).json({ message: 'chapterId is required' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const existingIndex = user.readingHistory.findIndex(
      (h) => h.series.toString() === seriesId
    );

    if (existingIndex >= 0) {
      user.readingHistory[existingIndex].chapter = new mongoose.Types.ObjectId(chapterId);
      user.readingHistory[existingIndex].updatedAt = new Date();
    } else {
      user.readingHistory.push({
        series: new mongoose.Types.ObjectId(seriesId),
        chapter: new mongoose.Types.ObjectId(chapterId),
        updatedAt: new Date(),
      });
    }

    await user.save();

    return res.status(200).json({ chapterId });
  } catch (err) {
    console.error('Set reading history error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
