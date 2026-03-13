import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { BookmarkProvider } from './context/BookmarkContext';
import Navbar from './components/Navbar.jsx';
import Home from './pages/Home.jsx';
import Browse from './pages/Browse.jsx';
import Announcements from './pages/Announcements.jsx';
import SeriesDetail from './pages/SeriesDetail.jsx';
import ChapterReader from './pages/ChapterReader.jsx';

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
            </Routes>
          </main>
          <footer className="bg-gray-800 p-4 text-center">© 2026 Manwhanted</footer>
        </div>
      </BookmarkProvider>
    </AuthProvider>
  );
}