import React from 'react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="bg-gray-800 p-4 flex justify-between items-center">
      <Link to="/" className="text-xl font-bold">Manwhanted</Link>
      <div className="flex space-x-4 items-center">
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
