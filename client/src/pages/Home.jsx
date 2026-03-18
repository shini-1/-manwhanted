import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import SeriesCard from '../SeriesCard';
import LoadingSpinner from '../LoadingSpinner';
import ErrorAlert from '../ErrorAlert';
const MAX_VISIBLE_TAGS = 24;

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
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterOptions, setFilterOptions] = useState({
    origins: [],
    statuses: [],
    demographics: [],
    contentRatings: [],
    sorts: [],
    tags: [],
  });
  const [filters, setFilters] = useState({
    origin: 'all',
    status: 'all',
    demographic: 'all',
    contentRating: 'all',
    sort: 'followedCount',
    includedTags: [],
  });

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const res = await api.get('/series/filters', {
          params: { source: 'mangadex' },
        });
        setFilterOptions(res.data);
      } catch (err) {
        console.error('Unable to load home filter options', err);
      }
    };

    loadFilters();
  }, []);

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
            q: search.trim() || undefined,
            origin: filters.origin !== 'all' ? filters.origin : undefined,
            status: filters.status !== 'all' ? filters.status : undefined,
            demographic: filters.demographic !== 'all' ? filters.demographic : undefined,
            contentRating: filters.contentRating !== 'all' ? filters.contentRating : undefined,
            sort: filters.sort !== 'followedCount' ? filters.sort : undefined,
            includedTags: filters.includedTags.length ? filters.includedTags.join(',') : undefined,
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
  }, [page, search, filters]);

  const updateFilter = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
    setPage(1);
  };

  const toggleTag = (tagId) => {
    setFilters((current) => {
      const nextTags = current.includedTags.includes(tagId)
        ? current.includedTags.filter((id) => id !== tagId)
        : [...current.includedTags, tagId];

      return {
        ...current,
        includedTags: nextTags,
      };
    });
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({
      origin: 'all',
      status: 'all',
      demographic: 'all',
      contentRating: 'all',
      sort: 'followedCount',
      includedTags: [],
    });
    setPage(1);
  };

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

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex w-full md:w-2/3 gap-3">
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="Search MangaDex titles..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <button
            className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
            onClick={() => setShowFilters((current) => !current)}
          >
            Filters
          </button>
        </div>
        <div className="text-sm text-gray-600">
          {search.trim() ? `Results for "${search.trim()}"` : 'Popular readable series'}
        </div>
      </div>

      {showFilters && (
        <div className="mb-6 rounded-lg border bg-gray-50 p-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">MangaDex Filters</h2>
            <button
              className="text-sm text-blue-600 hover:underline"
              onClick={resetFilters}
            >
              Reset filters
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">Type</span>
              <select
                className="rounded border px-3 py-2"
                value={filters.origin}
                onChange={(e) => updateFilter('origin', e.target.value)}
              >
                {filterOptions.origins.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">Status</span>
              <select
                className="rounded border px-3 py-2"
                value={filters.status}
                onChange={(e) => updateFilter('status', e.target.value)}
              >
                {filterOptions.statuses.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">Demographic</span>
              <select
                className="rounded border px-3 py-2"
                value={filters.demographic}
                onChange={(e) => updateFilter('demographic', e.target.value)}
              >
                {filterOptions.demographics.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">Rating</span>
              <select
                className="rounded border px-3 py-2"
                value={filters.contentRating}
                onChange={(e) => updateFilter('contentRating', e.target.value)}
              >
                {filterOptions.contentRatings.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">Sort</span>
              <select
                className="rounded border px-3 py-2"
                value={filters.sort}
                onChange={(e) => updateFilter('sort', e.target.value)}
              >
                {filterOptions.sorts.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Genres / Themes</p>
            <div className="flex flex-wrap gap-2">
              {filterOptions.tags.slice(0, MAX_VISIBLE_TAGS).map((tag) => {
                const active = filters.includedTags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    className={`rounded-full px-3 py-1 text-sm border ${
                      active
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300'
                    }`}
                    onClick={() => toggleTag(tag.id)}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

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
