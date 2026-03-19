import React from 'react';
import { Link } from 'react-router-dom';
import SmartImage from './SmartImage';

export default function SeriesCard({ series }) {
  const fallbackCover = `https://placehold.co/300x450/1f2937/f9fafb?text=${encodeURIComponent(series.title || 'Manwhanted')}`;

  return (
    <Link
      to={`/series/${series._id}`}
      className="rounded-lg border border-gray-700 bg-gray-900 overflow-hidden transition hover:border-blue-500"
    >
      <div className="flex h-44 items-center justify-center border-b border-gray-800 bg-slate-950/90 p-3">
        <SmartImage
          src={series.thumbnailImage || series.coverImage}
          sources={series.coverImage ? [series.coverImage] : []}
          fallbackSrc={fallbackCover}
          alt={series.title}
          className="h-full w-full object-contain"
          loading="lazy"
        />
      </div>
      <div className="p-3">
        <p className="text-sm font-semibold text-gray-100 line-clamp-2">{series.title}</p>
        <p className="mt-1 text-xs text-gray-400">{series.status || 'Unknown status'}</p>
        {Array.isArray(series.genres) && series.genres.length > 0 && (
          <p className="mt-1 text-xs text-gray-500 line-clamp-1">
            {series.genres.join(', ')}
          </p>
        )}
      </div>
    </Link>
  );
}
