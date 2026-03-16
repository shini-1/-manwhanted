import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { BookmarkProvider } from './context/BookmarkContext';
import Navbar from './Navbar';
import Home from './pages/Home';
import Browse from './pages/Browse';
import Announcements from './pages/Announcements';
import SeriesDetail from './pages/SeriesDetail';
import ChapterReader from './pages/ChapterReader';
import Login from './pages/Login';
import Register from './pages/Register';
import Bookmarks from './pages/Bookmarks';

export default function App() {
  return (
    <AuthProvider>
      <BookmarkProvider>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-grow p-4">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/browse" element={<Browse />} />
              <Route path="/announcements" element={<Announcements />} />
              <Route path="/series/:id" element={<SeriesDetail />} />
              <Route path="/read/:id" element={<ChapterReader />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/bookmarks" element={<Bookmarks />} />
            </Routes>
          </main>
          <footer className="bg-gray-800 p-4 text-center">© 2026 Manwhanted</footer>
        </div>
      </BookmarkProvider>
    </AuthProvider>
  );
}