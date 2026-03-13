import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import { FaUser, FaBookmark } from 'react-icons/fa';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);

  return (
    <nav className="bg-gray-800 p-4 flex justify-between items-center">
      <Link to="/" className="text-xl font-bold">Manwhanted</Link>
      <div className="flex space-x-4">
        <Link to="/">Home</Link>
        <Link to="/browse">Browse</Link>
        <Link to="/announcements">Announcements</Link>
        {user ? (
          <>
            <Link to="/bookmarks"><FaBookmark /></Link>
            <button onClick={logout}><FaUser /></button>
          </>
        ) : null}
      </div>
    </nav>
  );
}