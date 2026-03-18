import React, { useEffect, useState } from 'react';
import api from '../api';
import SeriesCard from '../SeriesCard';
import LoadingSpinner from '../LoadingSpinner';
import ErrorAlert from '../ErrorAlert';

const ITEMS_PER_PAGE = 12;
const MAX_VISIBLE_TAGS = 24;

const Browse = () => {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
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
        console.error('Unable to load filter options', err);
      }
    };

    loadFilters();
  }, []);

  useEffect(() => {
    const loadSeries = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/series', {
          params: {
            source: 'mangadex',
            limit: ITEMS_PER_PAGE,
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
        const items = Array.isArray(res.data) ? res.data : res.data?.items;
        if (Array.isArray(items)) {
          setSeries(items);
          setHasNextPage(Boolean(res.data?.pagination?.hasNextPage));
        } else {
          console.warn('Expected series list to be an array, got:', res.data);
          setSeries([]);
          setError('Unexpected series response format.');
          setHasNextPage(false);
        }
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load series.');
      } finally {
        setLoading(false);
      }
    };

    loadSeries();
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
    <div className="container mx-auto px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-3xl sm:text-4xl font-bold mb-8 text-gray-100">Browse All Series</h1>
      <p className="text-base sm:text-xl mb-6 text-gray-300">Find your next favorite read from thousands of series.</p>

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
          Page {page}
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

      {loading && <LoadingSpinner />}
      {error && <ErrorAlert message={error} />}

      {!loading && !error && (
        <>
          {series.length === 0 ? (
            <p className="text-gray-600">No series match your search.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.isArray(series) && series.map((item) => (
                  <SeriesCard key={item._id} series={item} />
                ))}
              </div>

              <div className="flex flex-wrap justify-center items-center gap-2 mt-8">
                <button
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                  disabled={page === 1}
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {page}
                </span>
                <button
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                  disabled={!hasNextPage}
                  onClick={() => setPage((prev) => prev + 1)}
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

export default Browse;
