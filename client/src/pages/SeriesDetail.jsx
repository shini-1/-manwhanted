import React, { useEffect, useState, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import { BookmarkContext } from '../context/BookmarkContext';
import LoadingSpinner from '../LoadingSpinner';
import ErrorAlert from '../ErrorAlert';
import { getStoredHomePath } from '../utils/navigationState';
import { downloadApiFile, downloadChapterAsCbz, downloadSeriesBatchAsZip } from '../utils/downloads';
import SmartImage from '../SmartImage';
import ProgressBar from '../components/ProgressBar';

const normalizeChapters = (value) =>
  Array.isArray(value) ? value.filter((chapter) => chapter && typeof chapter === 'object') : [];

const SeriesDetail = () => {
  const CHAPTERS_PER_PAGE = 25;
  const { id } = useParams();
  const { bookmarks, addBookmark, removeBookmark } = useContext(BookmarkContext);
  const [series, setSeries] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [resumeChapterId, setResumeChapterId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [activeDownload, setActiveDownload] = useState('');
  const [chapterDownloads, setChapterDownloads] = useState({});
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [chapterPage, setChapterPage] = useState(1);
  const isExternalSeries = Boolean(id?.startsWith('md_'));

  const isBookmarked = () => Array.isArray(bookmarks) && bookmarks.includes(id);

  const handleBookmarkToggle = async () => {
    if (!id) return;

    try {
      if (isBookmarked()) {
        await removeBookmark(id);
      } else {
        await addBookmark(id);
      }
      setActionError(null);
    } catch (err) {
      setActionError('Unable to update bookmarks.');
    }
  };

  const handleBatchDownload = async (mode) => {
    if (!id) {
      return;
    }

    const chapterIds = mode === 'visible' ? visibleChapterIds : [];
    const path = chapterIds.length > 0
      ? `/series/${id}/download?chapterIds=${chapterIds.join(',')}`
      : `/series/${id}/download`;
    const fallbackFileName = `${series?.title || 'series'} ${mode === 'visible' ? 'visible' : 'batch'}.zip`;

    try {
      setActiveDownload(mode);
      setDownloadProgress(null);
      setActionError(null);
      if (!isExternalSeries) {
        await downloadApiFile(path, fallbackFileName, setDownloadProgress);
        return;
      }

      const targetChapters = mode === 'visible' ? visibleChapters : chapters;
      const fullChapters = [];

      for (const chapter of targetChapters) {
        if (!chapter?._id) {
          continue;
        }

        const chapterRes = await api.get(`/chapters/${chapter._id}`);
        fullChapters.push(chapterRes.data);
      }

      await downloadSeriesBatchAsZip(series?.title || 'series', fullChapters, fallbackFileName, setDownloadProgress);
    } catch (err) {
      setActionError(
        err?.message || err?.response?.data?.message || 'Unable to download the selected CBZ batch.'
      );
    } finally {
      setActiveDownload('');
      setDownloadProgress(null);
    }
  };

  const handleChapterDownload = async (chapter) => {
    if (!chapter?._id) {
      return;
    }

    const chapterLabel = `${chapter.title || 'Chapter'} ${chapter.number || ''}`
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    try {
      setChapterDownloads((prev) => ({
        ...prev,
        [chapter._id]: { status: 'downloading', progress: null },
      }));
      setActionError(null);

      const onProgress = (progress) => {
        setChapterDownloads((prev) => ({
          ...prev,
          [chapter._id]: { status: 'downloading', progress },
        }));
      };

      if (!isExternalSeries) {
        await downloadApiFile(
          `/chapters/${chapter._id}/download`,
          `${chapterLabel || 'chapter'}.cbz`,
          onProgress
        );
        return;
      }

      const chapterRes = await api.get(`/chapters/${chapter._id}`);
      await downloadChapterAsCbz(chapterRes.data, `${chapterLabel || 'chapter'}.cbz`, onProgress);
    } catch (err) {
      setActionError(err?.message || 'Unable to download this chapter.');
    } finally {
      setChapterDownloads((prev) => {
        const next = { ...prev };
        delete next[chapter._id];
        return next;
      });
    }
  };

  useEffect(() => {
    const loadSeries = async () => {
      if (!id) return;
      setLoading(true);
      setLoadError(null);
      setActionError(null);
      try {
        const res = await api.get(`/series/${id}`);
        const nextSeries = res.data;
        const nextChapters = normalizeChapters(nextSeries?.chapters);

        setSeries(nextSeries);
        setChapters(nextChapters);
        setChapterPage(1);

        if (nextChapters.length === 0) {
          const chaptersRes = await api.get(`/series/${id}/chapters`);
          setChapters(normalizeChapters(chaptersRes.data));
        }

        const savedChapter = localStorage.getItem(`manwhanted:lastRead:${id}`);
        if (savedChapter) {
          setResumeChapterId(savedChapter);
        }
      } catch (err) {
        setLoadError(err?.response?.data?.message || 'Failed to load series.');
      } finally {
        setLoading(false);
      }
    };

    loadSeries();
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (loadError) return <ErrorAlert message={loadError} />;
  if (!series) return null;

  const chapterCount = chapters.length;
  const totalChapterPages = chapterCount > 0 ? Math.ceil(chapterCount / CHAPTERS_PER_PAGE) : 1;
  const chapterStartIndex = (chapterPage - 1) * CHAPTERS_PER_PAGE;
  const visibleChapters = chapters.slice(chapterStartIndex, chapterStartIndex + CHAPTERS_PER_PAGE);
  const homeHref = getStoredHomePath();
  const visibleChapterIds = visibleChapters.map((chapter) => chapter._id).filter(Boolean);
  const canDownloadVisibleBatch = visibleChapterIds.length > 0;
  const canDownloadFullBatch = chapterCount > 0;

  return (
    <div className="container mx-auto p-8">
      <div className="mb-6">
        <Link to={homeHref} className="text-blue-600 hover:underline">
          Home
        </Link>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <SmartImage
            src={series.thumbnailImage || series.coverImage}
            sources={series.coverImage ? [series.coverImage] : []}
            fallbackSrc="https://placehold.co/500x750/111827/f9fafb?text=Manwhanted"
            alt={series.title}
            className="w-full rounded-lg shadow-lg mb-6"
          />
          <h1 className="text-4xl font-bold mb-4">{series.title}</h1>
          <p className="text-lg mb-2">{series.description || 'No description available.'}</p>
          <p className="text-sm text-gray-500 mb-2">
            Genres: {series.genres?.join(', ') || 'N/A'}
          </p>
          <p className="text-sm text-gray-500 mb-6">Status: {series.status || 'Unknown'}</p>
          <div className="space-y-3">
            <button
              className={`simple-button w-full ${isBookmarked() ? 'simple-button-danger' : 'simple-button-primary'}`}
              onClick={handleBookmarkToggle}
            >
              {isBookmarked() ? 'Remove Bookmark' : 'Add to Bookmarks'}
            </button>

            {chapterCount > 0 && (
              <>
                <button
                  type="button"
                  className="simple-button simple-button-primary w-full text-center"
                  onClick={() => handleBatchDownload('all')}
                  disabled={activeDownload !== '' || !canDownloadFullBatch}
                >
                  {activeDownload === 'all' ? 'Preparing Series ZIP...' : 'Download Series ZIP'}
                </button>
                <button
                  type="button"
                  className="simple-button simple-button-success w-full text-center"
                  onClick={() => handleBatchDownload('visible')}
                  disabled={activeDownload !== '' || !canDownloadVisibleBatch}
                >
                  {activeDownload === 'visible' ? 'Preparing Visible Batch...' : 'Download Visible CBZs'}
                </button>
              </>
            )}
            
            {activeDownload !== '' && (
              <ProgressBar progress={downloadProgress} />
            )}

            {resumeChapterId && (
              <button
                className="simple-button simple-button-success w-full"
                onClick={() => window.location.assign(`/read/${resumeChapterId}`)}
              >
                Resume Reading
              </button>
            )}
            {actionError && (
              <ErrorAlert message={actionError} />
            )}
          </div>
        </div>
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Chapters</h2>
              <p className="text-sm text-gray-500">
                {chapterCount} total chapter{chapterCount === 1 ? '' : 's'}
              </p>
            </div>
            {chapterCount > CHAPTERS_PER_PAGE && (
              <div className="flex items-center gap-3">
                <button
                  className="simple-button simple-button-secondary"
                  onClick={() => setChapterPage((current) => Math.max(current - 1, 1))}
                  disabled={chapterPage === 1}
                >
                  Prev
                </button>
                <span className="text-sm text-gray-500">
                  Page {chapterPage} of {totalChapterPages}
                </span>
                <button
                  className="simple-button simple-button-primary"
                  onClick={() => setChapterPage((current) => Math.min(current + 1, totalChapterPages))}
                  disabled={chapterPage === totalChapterPages}
                >
                  Next
                </button>
              </div>
            )}
          </div>
          {visibleChapters.length > 0 ? (
            <div className="space-y-2">
              {visibleChapters.map((chapter) => (
                <div
                  key={chapter._id}
                  className="flex flex-col gap-3 rounded-lg bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold">{chapter.title}</p>
                    <p className="text-sm text-gray-500">Chapter {chapter.number}</p>
                  </div>
                  <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
                    <Link
                      to={`/read/${chapter._id}`}
                      className="simple-button simple-button-primary flex-1 sm:flex-none"
                    >
                      Read
                    </Link>
                    <button
                      type="button"
                      className="simple-button simple-button-success flex-1 sm:flex-none"
                      onClick={() => handleChapterDownload(chapter)}
                      disabled={chapterDownloads[chapter._id]?.status === 'downloading'}
                    >
                      {chapterDownloads[chapter._id]?.status === 'downloading' ? 'Preparing CBZ...' : 'Download CBZ'}
                    </button>
                    {chapterDownloads[chapter._id]?.status === 'downloading' && (
                      <div className="w-full">
                        <ProgressBar progress={chapterDownloads[chapter._id]?.progress} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No chapters available yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SeriesDetail;
