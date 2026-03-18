import React from 'react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="bg-gray-800 px-4 py-4 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
      <Link to="/" className="text-xl font-bold">Manwhanted</Link>
      <div className="flex flex-wrap gap-x-4 gap-y-2 items-center text-sm sm:text-base">
        <Link to="/">Home</Link>
        <Link to="/browse">Browse</Link>
        <Link to="/announcements">Announcements</Link>
        <Link to="/bookmarks" className="flex items-center gap-1">
          <span className="hidden sm:inline">Bookmarks</span>
        </Link>
      </div>
    </nav>
  );
}
