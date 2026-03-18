import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import LoadingSpinner from '../LoadingSpinner';
import ErrorAlert from '../ErrorAlert';
import { getStoredHomePath } from '../utils/navigationState';

const ChapterReader = () => {
  const { id } = useParams();
  const [chapter, setChapter] = useState(null);
  const [series, setSeries] = useState(null);
  const [chapterIndex, setChapterIndex] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [visiblePageCount, setVisiblePageCount] = useState(1);

  useEffect(() => {
    const loadChapter = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      setVisiblePageCount(1);

      try {
        const res = await api.get(`/chapters/${id}`);
        setChapter(res.data);

        const seriesRes = await api.get(`/series/${res.data.series}`);
        setSeries(seriesRes.data);

        const chapterIds = (seriesRes.data.chapters || []).map((c) => c._id);
        const idx = chapterIds.findIndex((cId) => cId === id);
        setChapterIndex(idx);

        // Persist last-read chapter per series (local cache)
        if (res.data.series) {
          localStorage.setItem(`manwhanted:lastRead:${res.data.series}`, id);
          localStorage.setItem(`manwhanted:lastReadAt:${res.data.series}`, String(Date.now()));
        }
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load chapter.');
      } finally {
        setLoading(false);
      }
    };

    loadChapter();
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorAlert message={error} />;
  if (!chapter) return null;

  const prevChapterId = chapterIndex > 0 ? series?.chapters?.[chapterIndex - 1]?._id : null;
  const nextChapterId = chapterIndex >= 0 && series?.chapters?.length
    ? series.chapters?.[chapterIndex + 1]?._id
    : null;
  const pageUrls = Array.isArray(chapter.pages) ? chapter.pages : [];
  const visiblePages = pageUrls.slice(0, visiblePageCount);
  const homeHref = getStoredHomePath();

  const revealNextPage = (pageIndex) => {
    setVisiblePageCount((current) => {
      if (current !== pageIndex + 1) {
        return current;
      }

      return Math.min(current + 1, pageUrls.length);
    });
  };

  const chapterNavigation = (
    <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
      {prevChapterId ? (
        <Link
          to={`/read/${prevChapterId}`}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Previous Chapter
        </Link>
      ) : (
        <span className="px-4 py-2 text-gray-500">Previous Chapter</span>
      )}
      {nextChapterId ? (
        <Link
          to={`/read/${nextChapterId}`}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Next Chapter
        </Link>
      ) : (
        <span className="px-4 py-2 text-gray-500">Next Chapter</span>
      )}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link to={homeHref} className="text-blue-600 hover:underline">
            Back to home results
          </Link>
          <Link to={`/series/${chapter.series}`} className="text-blue-600 hover:underline">
            Back to series
          </Link>
        </div>
        <div className="text-left sm:text-right">
          <h1 className="text-2xl font-bold">{chapter.title}</h1>
          <span className="text-gray-500">Chapter {chapter.number}</span>
        </div>
      </div>
      <div className="space-y-6">
        {pageUrls.length > 0 ? (
          <>
            {visiblePages.map((pageUrl, index) => (
              <div key={index} className="bg-white shadow-lg rounded-lg p-4">
                <img
                  src={pageUrl}
                  alt={`Page ${index + 1}`}
                  className="w-full h-auto rounded-lg"
                  loading={index === 0 ? 'eager' : 'lazy'}
                  onLoad={() => revealNextPage(index)}
                  onError={() => revealNextPage(index)}
                />
              </div>
            ))}
            {visiblePageCount < pageUrls.length && (
              <div className="rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-center text-sm text-gray-300">
                Loading page {visiblePageCount + 1} of {pageUrls.length}...
              </div>
            )}
          </>
        ) : (
          <p className="text-gray-500">No pages available for this chapter.</p>
        )}
      </div>
      {chapterNavigation}
    </div>
  );
};

export default ChapterReader;
