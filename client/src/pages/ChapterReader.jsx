import React from 'react';
import { useParams } from 'react-router-dom';

const ChapterReader = () => {
  const { id } = useParams();
  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-8 flex items-center space-x-4">
        <button className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300">← Prev Chapter</button>
        <h1 className="text-2xl font-bold flex-1 text-center">Chapter #{id}</h1>
        <button className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300">Next Chapter →</button>
      </div>
      <div className="space-y-4">
        {[1,2,3,4,5,6].map((page) => (
          <div key={page} className="bg-white shadow-lg rounded-lg p-4 mx-auto max-w-2xl">
            <img 
              src={`https://picsum.photos/800/1200?random=${page}`} 
              alt={`Page ${page}`}
              className="w-full h-auto rounded-lg shadow-md"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChapterReader;
