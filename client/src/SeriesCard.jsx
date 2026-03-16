import React from 'react';
import { Link } from 'react-router-dom';

export default function SeriesCard({ series }) {
  return (
    <Link
      to={`/series/${series._id}`}
      className="bg-gray-700 p-4 rounded hover:shadow-lg transition"
    >
      <img
        src={series.coverImage || 'https://via.placeholder.com/150'}
        alt={series.title}
        className="w-full h-48 object-cover rounded"
      />
      <h3 className="mt-2 text-lg font-semibold">{series.title}</h3>
      <p className="text-sm text-gray-300">{series.status || 'Unknown status'}</p>
    </Link>
  );
}