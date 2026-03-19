import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import LoadingSpinner from '../LoadingSpinner';
import ErrorAlert from '../ErrorAlert';
import { getStoredHomePath } from '../utils/navigationState';
import { buildCacheBustedImageSrc, buildImageCandidates } from '../utils/images';

const ChapterReader = () => {
  const { id } = useParams();
  const [chapter, setChapter] = useState(null);
  const [series, setSeries] = useState(null);
  const [chapterIndex, setChapterIndex] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [visiblePageCount, setVisiblePageCount] = useState(1);
  const [pageStates, setPageStates] = useState({});
  const [mobileReaderMode, setMobileReaderMode] = useState(false);

  useEffect(() => {
    const loadChapter = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      setVisiblePageCount(1);
      setPageStates({});

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
  const rawPageSources = Array.isArray(chapter.pageSources) && chapter.pageSources.length > 0
    ? chapter.pageSources
    : pageUrls.map((pageUrl) => ({ url: pageUrl, candidates: [pageUrl] }));
  const pageEntries = rawPageSources
    .map((pageSource) => {
      if (!pageSource) {
        return null;
      }

      const sourceUrl = typeof pageSource === 'string' ? pageSource : pageSource.url;
      const sourceCandidates =
        typeof pageSource === 'object' && Array.isArray(pageSource?.candidates)
          ? pageSource.candidates
          : [];
      const candidates = buildImageCandidates(sourceUrl, sourceCandidates);

      if (candidates.length === 0) {
        return null;
      }

      return {
        url: sourceUrl || candidates[0],
        candidates,
      };
    })
    .filter(Boolean);
  const visiblePages = pageEntries.slice(0, visiblePageCount);
  const homeHref = getStoredHomePath();

  const revealNextPage = (pageIndex) => {
    setVisiblePageCount((current) => {
      if (current !== pageIndex + 1) {
        return current;
      }

      return Math.min(current + 1, pageEntries.length);
    });
  };

  const handlePageLoad = (pageIndex) => {
    setPageStates((current) => {
      const existingState = current[pageIndex] || {
        candidateIndex: 0,
        requestVersion: 0,
        status: 'loading',
      };

      if (existingState.status === 'loaded') {
        return current;
      }

      return {
        ...current,
        [pageIndex]: {
          ...existingState,
          status: 'loaded',
        },
      };
    });

    revealNextPage(pageIndex);
  };

  const handlePageError = (pageIndex) => {
    const pageEntry = pageEntries[pageIndex];

    if (!pageEntry) {
      revealNextPage(pageIndex);
      return;
    }

    let pageExhausted = false;

    setPageStates((current) => {
      const existingState = current[pageIndex] || {
        candidateIndex: 0,
        requestVersion: 0,
        status: 'loading',
      };
      const nextCandidateIndex = existingState.candidateIndex + 1;

      if (nextCandidateIndex < pageEntry.candidates.length) {
        return {
          ...current,
          [pageIndex]: {
            candidateIndex: nextCandidateIndex,
            requestVersion: existingState.requestVersion + 1,
            status: 'retrying',
          },
        };
      }

      pageExhausted = true;

      return {
        ...current,
        [pageIndex]: {
          ...existingState,
          status: 'failed',
        },
      };
    });

    if (pageExhausted) {
      revealNextPage(pageIndex);
    }
  };

  const retryPage = (pageIndex) => {
    setPageStates((current) => ({
      ...current,
      [pageIndex]: {
        candidateIndex: 0,
        requestVersion: (current[pageIndex]?.requestVersion || 0) + 1,
        status: 'retrying',
      },
    }));
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
    <div className={`mx-auto p-4 ${mobileReaderMode ? 'reader-mobile-fit-shell' : 'max-w-4xl'}`}>
      <div className={mobileReaderMode ? 'reader-mobile-fit-surface' : ''}>
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Link to={homeHref} className="text-blue-600 hover:underline">
              Back to home results
            </Link>
            <Link to={`/series/${chapter.series}`} className="text-blue-600 hover:underline">
              Back to series
            </Link>
          </div>
          <div className="flex flex-col gap-3 text-left sm:items-end sm:text-right">
            <div>
              <h1 className="text-2xl font-bold">{chapter.title}</h1>
              <span className="text-gray-500">Chapter {chapter.number}</span>
            </div>
            <button
              type="button"
              className={`reader-mode-toggle ${mobileReaderMode ? 'reader-mode-toggle-active' : ''}`}
              onClick={() => setMobileReaderMode((current) => !current)}
            >
              {mobileReaderMode ? 'Exit Mobile Fit' : 'Mobile Fit 50%'}
            </button>
          </div>
        </div>
        <div className={mobileReaderMode ? 'space-y-4' : 'space-y-6'}>
          {pageEntries.length > 0 ? (
            <>
              {visiblePages.map((page, index) => {
                const pageState = pageStates[index] || {
                  candidateIndex: 0,
                  requestVersion: 0,
                  status: 'loading',
                };
                const activeCandidate = page.candidates[pageState.candidateIndex] || '';
                const activeSrc = buildCacheBustedImageSrc(
                  activeCandidate,
                  pageState.requestVersion > 0 ? `${index}-${pageState.requestVersion}` : ''
                );
                const isPageFailed = pageState.status === 'failed';

                return (
                  <div
                    key={`${index}:${page.url}`}
                    className={
                      mobileReaderMode
                        ? 'reader-mobile-page'
                        : 'bg-white shadow-lg rounded-lg p-4'
                    }
                  >
                    {isPageFailed ? (
                      <div className="rounded-lg border border-red-900 bg-red-950/40 px-4 py-6 text-center text-sm text-red-100">
                        <p className="font-semibold">Page {index + 1} could not be loaded.</p>
                        <p className="mt-2 text-red-200">
                          The reader skipped ahead so the chapter keeps moving.
                        </p>
                        <button
                          type="button"
                          className="mt-4 rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-500"
                          onClick={() => retryPage(index)}
                        >
                          Retry page
                        </button>
                      </div>
                    ) : (
                      <img
                        key={`${index}:${pageState.candidateIndex}:${pageState.requestVersion}`}
                        src={activeSrc}
                        alt={`Page ${index + 1}`}
                        className={
                          mobileReaderMode
                            ? 'reader-mobile-image'
                            : 'w-full h-auto rounded-lg'
                        }
                        loading={index === 0 ? 'eager' : 'lazy'}
                        decoding="async"
                        referrerPolicy="no-referrer"
                        onLoad={() => handlePageLoad(index)}
                        onError={() => handlePageError(index)}
                      />
                    )}
                  </div>
                );
              })}
              {visiblePageCount < pageEntries.length && (
                <div className="rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-center text-sm text-gray-300">
                  Loading page {visiblePageCount + 1} of {pageEntries.length}...
                </div>
              )}
            </>
          ) : (
            <p className="text-gray-500">No pages available for this chapter.</p>
          )}
        </div>
        {chapterNavigation}
      </div>
    </div>
  );
};

export default ChapterReader;
