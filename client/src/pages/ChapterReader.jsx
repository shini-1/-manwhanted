import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api';
import LoadingSpinner from '../LoadingSpinner';
import ErrorAlert from '../ErrorAlert';

const ChapterReader = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [chapter, setChapter] = useState(null);
  const [series, setSeries] = useState(null);
  const [chapterIndex, setChapterIndex] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadChapter = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);

      try {
        const res = await api.get(`/chapters/${id}`);
        setChapter(res.data);

        const seriesRes = await api.get(`/series/${res.data.series}`);
        setSeries(seriesRes.data);

        const chapterIds = (seriesRes.data.chapters || []).map((c) => c._id);
        const idx = chapterIds.findIndex((cId) => cId === id);
        setChapterIndex(idx);
      } catch (err) {
        if (err?.response?.status === 401) {
          navigate('/login');
          return;
        }
        setError(err?.response?.data?.message || 'Failed to load chapter.');
      } finally {
        setLoading(false);
      }
    };

    loadChapter();
  }, [id, navigate]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorAlert message={error} />;
  if (!chapter) return null;

  const prevChapterId = chapterIndex > 0 ? series?.chapters[chapterIndex - 1]._id : null;
  const nextChapterId = chapterIndex >= 0 && series?.chapters?.length
    ? series.chapters[chapterIndex + 1]?._id
    : null;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {prevChapterId ? (
            <Link
              to={`/read/${prevChapterId}`}
              className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              ← Prev
            </Link>
          ) : (
            <span className="px-3 py-2 text-gray-400">← Prev</span>
          )}
          <Link to={`/series/${chapter.series}`} className="text-blue-600 hover:underline">
            Back to series
          </Link>
          {nextChapterId ? (
            <Link
              to={`/read/${nextChapterId}`}
              className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Next →
            </Link>
          ) : (
            <span className="px-3 py-2 text-gray-400">Next →</span>
          )}
        </div>
        <div className="text-right">
          <h1 className="text-2xl font-bold">{chapter.title}</h1>
          <span className="text-gray-500">Chapter {chapter.number}</span>
        </div>
      </div>
      <div className="space-y-6">
        {chapter.pages && chapter.pages.length > 0 ? (
          chapter.pages.map((pageUrl, index) => (
            <div key={index} className="bg-white shadow-lg rounded-lg p-4">
              <img
                src={pageUrl}
                alt={`Page ${index + 1}`}
                className="w-full h-auto rounded-lg"
              />
            </div>
          ))
        ) : (
          <p className="text-gray-500">No pages available for this chapter.</p>
        )}
      </div>
    </div>
  );
};

export default ChapterReader;
