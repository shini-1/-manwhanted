import { Request, Response } from 'express';
import Series from '../models/series.js';
import Chapter from '../models/chapter.js';

export const listSeries = async (req: Request, res: Response) => {
  try {
    const { ids } = req.query;

    if (ids) {
      const idList = (ids as string).split(',').map(id => id.trim()).filter(Boolean);
      const series = await Series.find({ _id: { $in: idList } }).select('title coverImage genres status');
      return res.json(series);
    }

    const series = await Series.find().select('title coverImage genres status');
    return res.json(series);
  } catch (err) {
    console.error('List series error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getSeriesById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const series = await Series.findById(id).populate({
      path: 'chapters',
      select: 'title number',
      options: { sort: { number: 1 } },
    });

    if (!series) {
      return res.status(404).json({ message: 'Series not found' });
    }

    return res.json(series);
  } catch (err) {
    console.error('Get series error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getSeriesChapters = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const chapters = await Chapter.find({ series: id }).select('title number');
    return res.json(chapters);
  } catch (err) {
    console.error('Get series chapters error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getChapterById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const chapter = await Chapter.findById(id);
    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }
    return res.json(chapter);
  } catch (err) {
    console.error('Get chapter error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
