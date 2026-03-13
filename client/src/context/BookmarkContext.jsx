import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';

export const BookmarkContext = createContext();

export const BookmarkProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [bookmarks, setBookmarks] = useState([]);

  useEffect(() => {
    if (user) {
      axios.get('/api/users/bookmarks').then(res => setBookmarks(res.data));
    }
  }, [user]);

  const addBookmark = async (seriesId) => {
    await axios.post(`/api/users/bookmarks/${seriesId}`);
    setBookmarks([...bookmarks, seriesId]);
  };

  const removeBookmark = async (seriesId) => {
    await axios.delete(`/api/users/bookmarks/${seriesId}`);
    setBookmarks(bookmarks.filter(id => id !== seriesId));
  };

  return (
    <BookmarkContext.Provider value={{ bookmarks, addBookmark, removeBookmark }}>
      {children}
    </BookmarkContext.Provider>
  );
};