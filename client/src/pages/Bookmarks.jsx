import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../context/AuthContext';
import { BookmarkContext } from '../context/BookmarkContext';
import SeriesCard from '../SeriesCard';
import LoadingSpinner from '../LoadingSpinner';
import ErrorAlert from '../ErrorAlert';

const Bookmarks = () => {
  const { user } = useContext(AuthContext);
  const { bookmarks } = useContext(BookmarkContext);

  const isBookmarkedArray = Array.isArray(bookmarks);
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
if (!bookmarks || !isBookmarkedArray) {
      return;
    }

    const loadSeries = async () => {
      if (bookmarks.length === 0) {
        setSeries([]);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const ids = bookmarks.join(',');
        const res = await api.get(`/series?ids=${ids}`);
        setSeries(res.data);
      } catch (err) {
        if (err?.response?.status === 401) {
          navigate('/login');
          return;
        }
        setError(err?.response?.data?.message || 'Failed to load bookmarks.');
      } finally {
        setLoading(false);
      }
    };

    loadSeries();
  }, [bookmarks, navigate]);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-6">Your Bookmarks</h1>
      {loading && <LoadingSpinner />}
      {error && <ErrorAlert message={error} />}
      {!loading && !error && series.length === 0 && (
        <p className="text-gray-600">You haven't bookmarked any series yet.</p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.isArray(series) && series.map((item) => (
          <SeriesCard key={item._id} series={item} />
        ))}
      </div>
    </div>
  );
};

export default Bookmarks;
