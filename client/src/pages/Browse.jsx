import React from 'react';

const Browse = () => {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8 text-gray-900">Browse All Series</h1>
      <p className="text-xl mb-12 text-gray-600">Find your next favorite read from thousands of series.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        <div className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-all">
          <div className="aspect-video bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg mb-4 flex items-center justify-center">
            <span className="text-white font-bold text-lg">Cover</span>
          </div>
          <h3 className="font-semibold mb-2 truncate">Sample Series Title</h3>
          <p className="text-sm text-gray-500">Latest chapter updated</p>
        </div>
        {/* Repeat for demo */}
        <div className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-all">...</div>
        <div className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-all">...</div>
        <div className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-all">...</div>
      </div>
    </div>
  );
};

export default Browse;
