import React, { createContext, useState, useEffect } from 'react';

export const BookmarkContext = createContext();
const BOOKMARKS_STORAGE_KEY = 'manwhanted:bookmarks';

export const BookmarkProvider = ({ children }) => {
  const [bookmarks, setBookmarks] = useState([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
      setBookmarks(saved ? JSON.parse(saved) : []);
    } catch (err) {
      console.error('Unable to load local bookmarks', err);
      setBookmarks([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarks));
  }, [bookmarks]);

  const addBookmark = async (seriesId) => {
    setBookmarks((current) => (
      current.includes(seriesId) ? current : [...current, seriesId]
    ));
  };

  const removeBookmark = async (seriesId) => {
    setBookmarks((current) => current.filter((id) => id !== seriesId));
  };

  return (
    <BookmarkContext.Provider value={{ bookmarks, addBookmark, removeBookmark }}>
      {children}
    </BookmarkContext.Provider>
  );
};
