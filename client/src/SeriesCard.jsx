import React from 'react';
import { Link } from 'react-router-dom';
import SmartImage from './SmartImage';

export default function SeriesCard({ series }) {
  const fallbackCover = `https://placehold.co/300x450/1f2937/f9fafb?text=${encodeURIComponent(series.title || 'Manwhanted')}`;

  return (
    <Link
      to={`/series/${series._id}`}
      className="bg-gray-700 p-4 rounded hover:shadow-lg transition"
    >
      <SmartImage
        src={series.thumbnailImage || series.coverImage}
        sources={series.coverImage ? [series.coverImage] : []}
        fallbackSrc={fallbackCover}
        alt={series.title}
        className="w-full h-48 object-cover rounded"
        loading="lazy"
      />
      <h3 className="mt-2 text-lg font-semibold">{series.title}</h3>
      <p className="text-sm text-gray-300">{series.status || 'Unknown status'}</p>
    </Link>
  );
}
