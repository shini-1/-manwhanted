import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api';
import SeriesCard from '../SeriesCard';
import LoadingSpinner from '../LoadingSpinner';
import ErrorAlert from '../ErrorAlert';
import { buildPathWithSearch, setStoredHomePath } from '../utils/navigationState';
const MAX_VISIBLE_TAGS = 24;
const HOME_PAGE_SIZE = 12;

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

const parsePageNumber = (value, fallback = 1) => {
  const parsedValue = Number.parseInt(value || '', 10);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
};

const parseIncludedTags = (value) =>
  value
    ? value.split(',').map((tag) => tag.trim()).filter(Boolean)
    : [];

const Home = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  // Use sample series as a fallback so the UI is usable even if the API is not available.
  const [featured, setFeatured] = useState(SAMPLE_SERIES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(() => parsePageNumber(searchParams.get('page')));
  const [pageInput, setPageInput] = useState(() => String(parsePageNumber(searchParams.get('page'))));
  const [hasNextPage, setHasNextPage] = useState(false);
  const [search, setSearch] = useState(() => searchParams.get('q') || '');
  const [showFilters, setShowFilters] = useState(() => searchParams.get('filters') === '1');
  const [filterOptions, setFilterOptions] = useState({
    origins: [],
    statuses: [],
    demographics: [],
    contentRatings: [],
    sorts: [],
    tags: [],
  });
  const [filters, setFilters] = useState({
    origin: searchParams.get('origin') || 'all',
    status: searchParams.get('status') || 'all',
    demographic: searchParams.get('demographic') || 'all',
    contentRating: searchParams.get('contentRating') || 'all',
    sort: searchParams.get('sort') || 'followedCount',
    includedTags: parseIncludedTags(searchParams.get('includedTags')),
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
            limit: HOME_PAGE_SIZE,
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

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  useEffect(() => {
    const nextParams = new URLSearchParams();

    if (page > 1) {
      nextParams.set('page', String(page));
    }

    if (search.trim()) {
      nextParams.set('q', search.trim());
    }

    if (showFilters) {
      nextParams.set('filters', '1');
    }

    if (filters.origin !== 'all') {
      nextParams.set('origin', filters.origin);
    }

    if (filters.status !== 'all') {
      nextParams.set('status', filters.status);
    }

    if (filters.demographic !== 'all') {
      nextParams.set('demographic', filters.demographic);
    }

    if (filters.contentRating !== 'all') {
      nextParams.set('contentRating', filters.contentRating);
    }

    if (filters.sort !== 'followedCount') {
      nextParams.set('sort', filters.sort);
    }

    if (filters.includedTags.length > 0) {
      nextParams.set('includedTags', filters.includedTags.join(','));
    }

    const nextSearch = nextParams.toString();
    setSearchParams(nextParams, { replace: true });
    setStoredHomePath(buildPathWithSearch('/', nextSearch));
  }, [filters, page, search, setSearchParams, showFilters]);

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

  const handlePageJump = (event) => {
    event.preventDefault();
    const nextPage = parsePageNumber(pageInput, page);

    if (nextPage !== page) {
      setPage(nextPage);
    } else {
      setPageInput(String(page));
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-100">Welcome to Manwhanted</h1>
      <p className="text-base sm:text-xl mb-8 sm:mb-12 text-gray-300">Your premier destination for manhwa and manga.</p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-100">Featured Series</h2>
        <Link to="/browse" className="text-blue-600 hover:underline text-sm">
          Browse all
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex w-full flex-col sm:flex-row md:w-2/3 gap-3">
          <input
            className="w-full border border-gray-700 bg-gray-900 text-gray-100 placeholder:text-gray-400 rounded px-3 py-2"
            placeholder="Search MangaDex titles..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <button
            className="w-full sm:w-auto px-4 py-2 bg-gray-100 text-gray-900 rounded hover:bg-white"
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
        <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4 text-gray-900 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-gray-900">MangaDex Filters</h2>
            <button
              className="text-sm text-blue-700 hover:underline self-start"
              onClick={resetFilters}
            >
              Reset filters
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-gray-800">Type</span>
              <select
                className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900"
                value={filters.origin}
                onChange={(e) => updateFilter('origin', e.target.value)}
              >
                {filterOptions.origins.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-gray-800">Status</span>
              <select
                className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900"
                value={filters.status}
                onChange={(e) => updateFilter('status', e.target.value)}
              >
                {filterOptions.statuses.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-gray-800">Demographic</span>
              <select
                className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900"
                value={filters.demographic}
                onChange={(e) => updateFilter('demographic', e.target.value)}
              >
                {filterOptions.demographics.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-gray-800">Rating</span>
              <select
                className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900"
                value={filters.contentRating}
                onChange={(e) => updateFilter('contentRating', e.target.value)}
              >
                {filterOptions.contentRatings.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-gray-800">Sort</span>
              <select
                className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900"
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
            <p className="text-sm font-medium text-gray-800">Genres / Themes</p>
            <div className="flex flex-wrap gap-2">
              {filterOptions.tags.slice(0, MAX_VISIBLE_TAGS).map((tag) => {
                const active = filters.includedTags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    className={`rounded-full px-3 py-1 text-sm border ${
                      active
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-100'
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
              
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
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
                <form onSubmit={handlePageJump} className="flex flex-wrap items-center justify-center gap-2">
                  <label className="text-sm text-gray-400" htmlFor="home-page-input">
                    Go to page
                  </label>
                  <input
                    id="home-page-input"
                    type="number"
                    min="1"
                    inputMode="numeric"
                    className="w-24 rounded border border-gray-600 bg-gray-900 px-3 py-2 text-gray-100"
                    value={pageInput}
                    onChange={(event) => setPageInput(event.target.value)}
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded bg-gray-700 text-gray-100 hover:bg-gray-600"
                  >
                    Go
                  </button>
                </form>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Home;
