import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import SeriesCard from '../SeriesCard';
import LoadingSpinner from '../LoadingSpinner';
import ErrorAlert from '../ErrorAlert';

// Fallback sample series so the UI is usable even if the backend isn't reachable.
const SAMPLE_SERIES = [
  {
    _id: 'sample-1',
    title: 'Skybound Chronicles',
    coverImage: 'https://images.unsplash.com/photo-1508780709619-79562169bc64?auto=format&fit=crop&w=800&q=80',
    status: 'Ongoing',
    genres: ['Adventure', 'Fantasy'],
    description: 'A young hero discovers hidden powers in a world of floating islands.',
  },
  {
    _id: 'sample-2',
    title: 'Neon Knights',
    coverImage: 'https://images.unsplash.com/photo-1517816428104-41553eab1e12?auto=format&fit=crop&w=800&q=80',
    status: 'Completed',
    genres: ['Action', 'Sci-Fi'],
    description: 'Cyberpunk warriors fight for justice in a neon-lit metropolis.',
  },
];

const Home = () => {
  // Use sample series as a fallback so the UI is usable even if the API is not available.
  const [featured, setFeatured] = useState(SAMPLE_SERIES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  useEffect(() => {
    const loadFeatured = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get('/series', {
          params: {
            source: 'mangadex',
            limit: 12,
            page,
          },
        });
        const items = Array.isArray(data) ? data : data?.items;
        if (Array.isArray(items) && items.length > 0) {
          setFeatured(items);
          setHasNextPage(Boolean(data?.pagination?.hasNextPage));
          setError(null);
        } else {
          console.warn('Expected series list to be a non-empty array, got:', data);
          setError('No series returned from the server. Showing sample content instead.');
          setHasNextPage(false);
        }
      } catch (err) {
        console.error('Unable to load featured series', err);
        setError(
          err?.response?.data?.message ||
            'Unable to load featured series. Showing sample content instead.'
        );
      } finally {
        setLoading(false);
      }
    };

    loadFeatured();
  }, [page]);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-4 text-gray-900">Welcome to Manwhanted</h1>
      <p className="text-xl mb-12 text-gray-600">Your premier destination for manhwa and manga.</p>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Featured Series</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">Page {page}</span>
          <Link to="/browse" className="text-blue-600 hover:underline">
            Browse all
          </Link>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {error && <ErrorAlert message={error} />}
          {featured.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">No series available yet.</p>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={() => window.location.reload()}
              >
                Reload
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {featured.map((series) => (
                  <SeriesCard key={series._id} series={series} />
                ))}
              </div>
              
              <div className="mt-8 flex items-center justify-center gap-4">
                <button
                  className="px-4 py-2 rounded bg-gray-200 text-gray-800 disabled:opacity-50"
                  onClick={() => setPage((current) => Math.max(current - 1, 1))}
                  disabled={page === 1}
                >
                  Previous
                </button>
                <span className="text-sm text-gray-500">Featured page {page}</span>
                <button
                  className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={!hasNextPage}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Home;
