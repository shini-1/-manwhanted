type FallbackChapter = {
  _id: string;
  series: string;
  title: string;
  number: string;
  pages: string[];
};

type FallbackSeries = {
  _id: string;
  title: string;
  description: string;
  coverImage: string;
  genres: string[];
  status: string;
  chapters: FallbackChapter[];
};

const fallbackCatalog: FallbackSeries[] = [
  {
    _id: '65f000000000000000000001',
    title: 'Skybound Chronicles',
    description: 'A young hero discovers hidden powers in a world of floating islands.',
    coverImage: 'https://images.unsplash.com/photo-1508780709619-79562169bc64?auto=format&fit=crop&w=800&q=80',
    genres: ['Adventure', 'Fantasy'],
    status: 'Ongoing',
    chapters: [
      {
        _id: '66f000000000000000000001',
        series: '65f000000000000000000001',
        title: 'Chapter 1: Awakening',
        number: '1',
        pages: [
          'https://picsum.photos/seed/sky1/800/1200',
          'https://picsum.photos/seed/sky2/800/1200',
          'https://picsum.photos/seed/sky3/800/1200',
        ],
      },
      {
        _id: '66f000000000000000000002',
        series: '65f000000000000000000001',
        title: 'Chapter 2: Wind Whisper',
        number: '2',
        pages: [
          'https://picsum.photos/seed/wind1/800/1200',
          'https://picsum.photos/seed/wind2/800/1200',
          'https://picsum.photos/seed/wind3/800/1200',
        ],
      },
    ],
  },
  {
    _id: '65f000000000000000000002',
    title: 'Neon Knights',
    description: 'Cyberpunk warriors fight for justice in a neon-lit metropolis.',
    coverImage: 'https://images.unsplash.com/photo-1517816428104-41553eab1e12?auto=format&fit=crop&w=800&q=80',
    genres: ['Action', 'Sci-Fi'],
    status: 'Completed',
    chapters: [
      {
        _id: '66f000000000000000000003',
        series: '65f000000000000000000002',
        title: 'Chapter 1: Neon Streets',
        number: '1',
        pages: [
          'https://picsum.photos/seed/neon1/800/1200',
          'https://picsum.photos/seed/neon2/800/1200',
          'https://picsum.photos/seed/neon3/800/1200',
        ],
      },
    ],
  },
];

export const listFallbackSeries = (ids?: string[]) => {
  const series = ids?.length
    ? fallbackCatalog.filter((entry) => ids.includes(entry._id))
    : fallbackCatalog;

  return series.map(({ chapters, ...entry }) => entry);
};

export const getFallbackSeriesById = (id: string) => {
  const series = fallbackCatalog.find((entry) => entry._id === id);
  if (!series) {
    return null;
  }

  return {
    ...series,
    chapters: series.chapters.map(({ _id, title, number }) => ({
      _id,
      title,
      number,
    })),
  };
};

export const getFallbackSeriesChapters = (seriesId: string) => {
  const series = fallbackCatalog.find((entry) => entry._id === seriesId);
  if (!series) {
    return [];
  }

  return series.chapters.map(({ _id, title, number }) => ({
    _id,
    title,
    number,
  }));
};

export const getFallbackChapterById = (id: string) =>
  fallbackCatalog.flatMap((series) => series.chapters).find((chapter) => chapter._id === id) || null;
