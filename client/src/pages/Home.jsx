import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import SeriesCard from '../SeriesCard';
import LoadingSpinner from '../LoadingSpinner';

const Home = () => {
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFeatured = async () => {
      try {
        const { data } = await api.get('/series');
        setFeatured(data.slice(0, 6));
      } catch (err) {
        console.error('Unable to load featured series', err);
      } finally {
        setLoading(false);
      }
    };

    loadFeatured();
  }, []);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-4 text-gray-900">Welcome to Manwhanted</h1>
      <p className="text-xl mb-12 text-gray-600">Your premier destination for manhwa and manga.</p>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Featured Series</h2>
        <Link to="/browse" className="text-blue-600 hover:underline">
          Browse all
        </Link>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.isArray(featured) && featured.map((series) => (
            <SeriesCard key={series._id} series={series} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;
