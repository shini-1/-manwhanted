import React, { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookmarkContext } from './context/BookmarkContext';
import { downloadApiFile } from './utils/downloads';
import SmartImage from './SmartImage';

export default function SeriesCard({ series }) {
  const { bookmarks, addBookmark, removeBookmark } = useContext(BookmarkContext);
  const [actionError, setActionError] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const seriesId = typeof series?._id === 'string' ? series._id : '';
  const isExternalSeries = Boolean(seriesId?.startsWith('md_'));
  const isBookmarked = Array.isArray(bookmarks) && bookmarks.includes(seriesId);
  const fallbackCover = `https://placehold.co/300x450/1f2937/f9fafb?text=${encodeURIComponent(series.title || 'Manwhanted')}`;

  const handleBookmarkToggle = async (event) => {
    event.preventDefault();
    event.stopPropagation();

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
      setActionError('Unable to update bookmark.');
    }
  };

  const handleSeriesDownload = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!seriesId || isExternalSeries) {
      return;
    }

    try {
      setIsDownloading(true);
      setActionError(null);
      await downloadApiFile(
        `/series/${seriesId}/download`,
        `${(series.title || 'series').replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ').trim() || 'series'} batch.zip`
      );
    } catch (err) {
      setActionError(err?.message || 'Unable to download this series.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900 overflow-hidden transition hover:border-blue-500">
      <Link
        to={`/series/${seriesId}`}
        className="block"
      >
        <div className="flex h-44 items-center justify-center border-b border-gray-800 bg-slate-950/90 p-3">
          <SmartImage
            src={series.thumbnailImage || series.coverImage}
            sources={series.coverImage ? [series.coverImage] : []}
            fallbackSrc={fallbackCover}
            alt={series.title}
            className="h-full w-full object-contain"
            loading="lazy"
          />
        </div>
        <div className="p-3">
          <p className="text-sm font-semibold text-gray-100 line-clamp-2">{series.title}</p>
          <p className="mt-1 text-xs text-gray-400">{series.status || 'Unknown status'}</p>
          {Array.isArray(series.genres) && series.genres.length > 0 && (
            <p className="mt-1 text-xs text-gray-500 line-clamp-1">
              {series.genres.join(', ')}
            </p>
          )}
        </div>
      </Link>
      {!isExternalSeries && (
        <div className="border-t border-gray-800 p-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`simple-button flex-1 ${isBookmarked ? 'simple-button-danger' : 'simple-button-primary'}`}
              onClick={handleBookmarkToggle}
            >
              {isBookmarked ? 'Bookmarked' : 'Bookmark'}
            </button>
            <button
              type="button"
              className="simple-button simple-button-success flex-1 text-center"
              onClick={handleSeriesDownload}
              disabled={isDownloading}
            >
              {isDownloading ? 'Preparing Download...' : 'Download'}
            </button>
          </div>
          {actionError && (
            <p className="mt-2 text-xs text-red-400">{actionError}</p>
          )}
        </div>
      )}
    </div>
  );
}
