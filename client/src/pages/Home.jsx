import React from 'react';

const Home = () => {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8 text-gray-900">Welcome to Manwhanted</h1>
      <p className="text-xl mb-12 text-gray-600">Your premier destination for manhwa and manga.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow">
          <h2 className="text-2xl font-semibold mb-4">Latest Releases</h2>
          <p>Browse the newest chapters across all series.</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow">
          <h2 className="text-2xl font-semibold mb-4">Popular Series</h2>
          <p>Discover trending titles loved by readers.</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow">
          <h2 className="text-2xl font-semibold mb-4">Your Bookmarks</h2>
          <p>Quick access to your saved favorites.</p>
        </div>
      </div>
    </div>
  );
};

export default Home;
