import React from 'react';

const Announcements = () => {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8 text-gray-900">Announcements</h1>
      <p className="text-xl mb-12 text-gray-600">Stay updated with the latest news and updates.</p>
      <div className="space-y-6 max-w-2xl">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-6 rounded-lg">
          <h2 className="text-2xl font-semibold mb-3">🎉 Site Launch!</h2>
          <p className="text-gray-700 mb-3">Manwhanted is now live. Happy reading!</p>
          <span className="text-sm text-gray-500">Posted 2 days ago</span>
        </div>
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 p-6 rounded-lg">
          <h2 className="text-2xl font-semibold mb-3">📱 Mobile Optimized</h2>
          <p className="text-gray-700 mb-3">Fully responsive design for all devices.</p>
          <span className="text-sm text-gray-500">Posted 1 week ago</span>
        </div>
      </div>
    </div>
  );
};

export default Announcements;
