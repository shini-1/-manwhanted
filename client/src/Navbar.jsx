import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);

  return (
    <nav className="bg-gray-800 p-4 flex justify-between items-center">
      <Link to="/" className="text-xl font-bold">Manwhanted</Link>
      <div className="flex space-x-4 items-center">
        <Link to="/">Home</Link>
        <Link to="/browse">Browse</Link>
        <Link to="/announcements">Announcements</Link>
        {user ? (
          <>
            <Link to="/bookmarks" className="flex items-center gap-1">
              <span className="hidden sm:inline">Bookmarks</span>
            </Link>
            <button onClick={logout} className="flex items-center gap-1">
              <span className="hidden sm:inline">Logout</span>
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
