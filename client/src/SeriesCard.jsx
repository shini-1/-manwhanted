import React from 'react';
import { Link } from 'react-router-dom';

export default function SeriesCard({ series }) {
  const fallbackCover = `https://placehold.co/300x450/1f2937/f9fafb?text=${encodeURIComponent(series.title || 'Manwhanted')}`;

  return (
    <Link
      to={`/series/${series._id}`}
      className="bg-gray-700 p-4 rounded hover:shadow-lg transition"
    >
      <img
        src={series.coverImage || fallbackCover}
        alt={series.title}
        className="w-full h-48 object-cover rounded"
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={(event) => {
          event.currentTarget.src = fallbackCover;
        }}
      />
      <h3 className="mt-2 text-lg font-semibold">{series.title}</h3>
      <p className="text-sm text-gray-300">{series.status || 'Unknown status'}</p>
    </Link>
  );
}
