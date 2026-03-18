import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { buildPathWithSearch, getStoredHomePath } from './utils/navigationState';

export default function Navbar() {
  const location = useLocation();
  const homeHref = location.pathname === '/'
    ? buildPathWithSearch(location.pathname, location.search)
    : getStoredHomePath();

  return (
    <nav className="bg-gray-800 px-4 py-4 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
      <Link to={homeHref} className="text-xl font-bold">Manwhanted</Link>
      <div className="flex flex-wrap gap-x-4 gap-y-2 items-center text-sm sm:text-base">
        <Link to={homeHref}>Home</Link>
        <Link to="/browse">Browse</Link>
        <Link to="/announcements">Announcements</Link>
        <Link to="/bookmarks" className="flex items-center gap-1">
          <span className="hidden sm:inline">Bookmarks</span>
        </Link>
      </div>
    </nav>
  );
}
