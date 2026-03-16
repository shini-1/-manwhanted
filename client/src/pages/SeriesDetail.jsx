import React from 'react';
import { useParams } from 'react-router-dom';

const SeriesDetail = () => {
  const { id } = useParams();
  return (
    <div className="container mx-auto p-8">
      <div className="aspect-video bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg mb-8 flex items-center justify-center">
        <span className="text-white text-3xl font-bold">Series #{id}</span>
      </div>
      <h1 className="text-4xl font-bold mb-6">Series Title</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <h2 className="text-2xl font-semibold mb-4">Details</h2>
          <p className="text-lg mb-4">Genre: Action, Fantasy</p>
          <p className="text-lg mb-4">Status: Ongoing</p>
          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Add to Bookmarks
          </button>
        </div>
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-semibold mb-4">Chapters</h2>
          <div className="space-y-2">
            <div className="flex justify-between p-4 bg-gray-50 rounded-lg">
              <span>Chapter 1</span>
              <button className="text-blue-600 hover:underline">Read</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeriesDetail;
