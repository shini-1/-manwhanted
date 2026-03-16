import React, { useEffect, useState } from 'react';
import api from '../api';
import SeriesCard from '../SeriesCard';
import LoadingSpinner from '../LoadingSpinner';
import ErrorAlert from '../ErrorAlert';

const ITEMS_PER_PAGE = 12;

const Browse = () => {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const loadSeries = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/series');
        if (Array.isArray(res.data)) {
          setSeries(res.data);
        } else {
          console.warn('Expected series list to be an array, got:', res.data);
          setSeries([]);
          setError('Unexpected series response format.');
        }
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load series.');
      } finally {
        setLoading(false);
      }
    };

    loadSeries();
  }, []);

  const filtered = series.filter((item) => {
    if (!search) return true;
    const lower = search.toLowerCase();
    return (
      item.title?.toLowerCase().includes(lower) ||
      item.genres?.some((g) => g.toLowerCase().includes(lower))
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paged = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8 text-gray-900">Browse All Series</h1>
      <p className="text-xl mb-6 text-gray-600">Find your next favorite read from thousands of series.</p>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <input
          className="w-full md:w-1/2 border rounded px-3 py-2"
          placeholder="Search by title or genre..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <div className="text-sm text-gray-600">
          {filtered.length} series found
        </div>
      </div>

      {loading && <LoadingSpinner />}
      {error && <ErrorAlert message={error} />}

      {!loading && !error && (
        <>
          {filtered.length === 0 ? (
            <p className="text-gray-600">No series match your search.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.isArray(paged) && paged.map((item) => (
                  <SeriesCard key={item._id} series={item} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8">
                  <button
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                    disabled={page === 1}
                    onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                    disabled={page === totalPages}
                    onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Browse;
