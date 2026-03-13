import React from 'react';
import { Link } from 'react-router-dom';

export default function SeriesCard({ series }) {
  return (
    <Link to={`/series/${series._id}`} className="bg-gray-700 p-4 rounded">
      <img src={series.coverImage || 'https://via.placeholder.com/150'} alt={series.title} className="w-full h-48 object-cover" />
      <h3 className="mt-2">{series.title}</h3>
      <p>Rating: {series.rating}</p>
    </Link>
  );
}