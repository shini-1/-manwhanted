import React, { useContext, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import LoadingSpinner from '../LoadingSpinner';
import ErrorAlert from '../ErrorAlert';
import { BookmarkContext } from '../context/BookmarkContext';
import { downloadApiFile, downloadChapterAsCbz } from '../utils/downloads';
import { getStoredHomePath } from '../utils/navigationState';
import { buildCacheBustedImageSrc, buildImageCandidates } from '../utils/images';
import ProgressBar from '../components/ProgressBar';

const ChapterReader = () => {
  const { id } = useParams();
  const { bookmarks, addBookmark, removeBookmark } = useContext(BookmarkContext);
  const [chapter, setChapter] = useState(null);
  const [series, setSeries] = useState(null);
  const [chapterIndex, setChapterIndex] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [visiblePageCount, setVisiblePageCount] = useState(1);
  const [pageStates, setPageStates] = useState({});
  const [mobileReaderMode, setMobileReaderMode] = useState(false);

  useEffect(() => {
    const loadChapter = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      setActionError(null);
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
  const chapterId = typeof chapter?._id === 'string' ? chapter._id : id || '';
  const seriesId = typeof chapter.series === 'string' ? chapter.series : '';
  const isExternalSeries = Boolean(seriesId?.startsWith('md_'));
  const isBookmarked = Array.isArray(bookmarks) && bookmarks.includes(seriesId);
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
  const chapterHeading = chapter.title && /^chapter\b/i.test(chapter.title.trim())
    ? chapter.title.trim()
    : `Chapter ${chapter.number}`;
  const canDownloadChapter = Boolean(chapterId) && pageEntries.length > 0;
  const downloadReason = pageEntries.length === 0
    ? 'Download unavailable for this chapter because no readable pages were found.'
    : 'Download unavailable for this chapter.';

  const handleChapterDownload = async () => {
    if (!canDownloadChapter) {
      return;
    }

    try {
      setIsDownloading(true);
      setDownloadProgress(null);
      setActionError(null);
      const fallbackFileName = `${chapterHeading.replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ').trim() || 'chapter'}.cbz`;

      if (!isExternalSeries) {
        await downloadApiFile(`/chapters/${chapterId}/download`, fallbackFileName, setDownloadProgress);
      } else {
        await downloadChapterAsCbz(chapter, fallbackFileName, setDownloadProgress);
      }
    } catch (err) {
      setActionError(err?.message || 'Unable to download this chapter.');
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  };

  const handleBookmarkToggle = async () => {
    if (!seriesId || isExternalSeries) {
      return;
    }

    try {
      if (isBookmarked) {
        await removeBookmark(seriesId);
      } else {
        await addBookmark(seriesId);
      }
      setActionError(null);
    } catch (err) {
      setActionError('Unable to update bookmarks for this series.');
    }
  };

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
          className="simple-button"
        >
          Previous
        </Link>
      ) : (
        <span className="simple-button simple-button-disabled">Previous</span>
      )}
      {nextChapterId ? (
        <Link
          to={`/read/${nextChapterId}`}
          className="simple-button"
        >
          Next
        </Link>
      ) : (
        <span className="simple-button simple-button-disabled">Next</span>
      )}
    </div>
  );

  return (
    <div className={`mx-auto p-4 ${mobileReaderMode ? 'reader-mobile-fit-shell' : 'max-w-4xl'}`}>
      <div className={mobileReaderMode ? 'reader-mobile-fit-surface' : ''}>
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Link to={homeHref} className="text-blue-600 hover:underline">
              Home
            </Link>
            <Link to={`/series/${chapter.series}`} className="text-blue-600 hover:underline">
              Series
            </Link>
          </div>
          <div className="relative z-10 flex flex-col gap-3 text-left sm:items-end sm:text-right">
            <div>
              <h1 className="text-2xl font-bold">{chapterHeading}</h1>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
              <button
                type="button"
                className={`simple-button ${mobileReaderMode ? 'simple-button-primary' : ''}`}
                onClick={() => setMobileReaderMode((current) => !current)}
              >
                {mobileReaderMode ? 'Exit Mobile Fit' : 'Mobile Fit'}
              </button>
              {!isExternalSeries && (
                <button
                  type="button"
                  className={`simple-button w-full sm:w-auto ${isBookmarked ? 'simple-button-danger' : 'simple-button-primary'}`}
                  onClick={handleBookmarkToggle}
                >
                  {isBookmarked ? 'Remove Bookmark' : 'Add to Bookmarks'}
                </button>
              )}
              {canDownloadChapter ? (
                <>
                  <button
                    type="button"
                    className="simple-button simple-button-success w-full sm:w-auto text-center"
                    onClick={handleChapterDownload}
                    disabled={isDownloading}
                  >
                    {isDownloading ? 'Preparing CBZ...' : 'Download CBZ'}
                  </button>
                  {isDownloading && (
                    <ProgressBar progress={downloadProgress} />
                  )}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="simple-button simple-button-disabled w-full sm:w-auto"
                    disabled
                    title={downloadReason}
                  >
                    Download CBZ
                  </button>
                  <span className="text-xs text-gray-400 sm:max-w-xs">
                    {downloadReason}
                  </span>
                </>
              )}
              {actionError && (
                <span className="text-xs text-red-400 sm:max-w-xs">{actionError}</span>
              )}
            </div>
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
                          className="simple-button simple-button-danger mt-4"
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
