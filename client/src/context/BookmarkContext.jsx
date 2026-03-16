import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api';
import { AuthContext } from './AuthContext';

export const BookmarkContext = createContext();

export const BookmarkProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [bookmarks, setBookmarks] = useState([]);

  useEffect(() => {
    const loadBookmarks = async () => {
      if (!user) {
        setBookmarks([]);
        return;
      }

      try {
        const res = await api.get('/users/bookmarks');
        setBookmarks(res.data);
      } catch (err) {
        console.error('Unable to load bookmarks', err);
        setBookmarks([]);
      }
    };

    loadBookmarks();
  }, [user]);

  const addBookmark = async (seriesId) => {
    await api.post(`/users/bookmarks/${seriesId}`);
    setBookmarks([...bookmarks, seriesId]);
  };

  const removeBookmark = async (seriesId) => {
    await api.delete(`/users/bookmarks/${seriesId}`);
    setBookmarks(bookmarks.filter(id => id !== seriesId));
  };

  return (
    <BookmarkContext.Provider value={{ bookmarks, addBookmark, removeBookmark }}>
      {children}
    </BookmarkContext.Provider>
  );
};