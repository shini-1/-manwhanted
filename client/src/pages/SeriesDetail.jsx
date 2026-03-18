import React, { useEffect, useState, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import { BookmarkContext } from '../context/BookmarkContext';
import LoadingSpinner from '../LoadingSpinner';
import ErrorAlert from '../ErrorAlert';

const SeriesDetail = () => {
  const { id } = useParams();
  const { bookmarks, addBookmark, removeBookmark } = useContext(BookmarkContext);
  const [series, setSeries] = useState(null);
  const [resumeChapterId, setResumeChapterId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
    } catch (err) {
      setError('Unable to update bookmarks.');
    }
  };

  useEffect(() => {
    const loadSeries = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/series/${id}`);
        setSeries(res.data);

        const savedChapter = localStorage.getItem(`manwhanted:lastRead:${id}`);
        if (savedChapter) {
          setResumeChapterId(savedChapter);
        }
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load series.');
      } finally {
        setLoading(false);
      }
    };

    loadSeries();
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorAlert message={error} />;
  if (!series) return null;

  return (
    <div className="container mx-auto p-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <img
            src={series.coverImage || 'https://via.placeholder.com/500x750'}
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
            {!isExternalSeries && (
              <button
                className={`w-full py-2 rounded-lg text-white ${isBookmarked() ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                onClick={handleBookmarkToggle}
              >
                {isBookmarked() ? 'Remove Bookmark' : 'Add to Bookmarks'}
              </button>
            )}

            {isExternalSeries && (
              <p className="text-sm text-gray-500">
                MangaDex series can be read here, but bookmarks stay limited to local library entries.
              </p>
            )}

            {resumeChapterId && (
              <button
                className="w-full py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
                onClick={() => window.location.assign(`/read/${resumeChapterId}`)}
              >
                Resume Reading
              </button>
            )}
          </div>
        </div>
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-semibold mb-4">Chapters</h2>
          {Array.isArray(series.chapters) && series.chapters.length > 0 ? (
            <div className="space-y-2">
              {series.chapters.map((chapter) => (
                <div
                  key={chapter._id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-semibold">{chapter.title}</p>
                    <p className="text-sm text-gray-500">Chapter {chapter.number}</p>
                  </div>
                  <Link
                    to={`/read/${chapter._id}`}
                    className="text-blue-600 hover:underline"
                  >
                    Read
                  </Link>
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
