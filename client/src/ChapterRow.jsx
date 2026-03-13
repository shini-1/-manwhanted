import React from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

export default function ChapterRow({ chapter }) {
  return (
    <div className="flex justify-between p-2 border-b">
      <div>
        <Link to={`/series/${chapter.seriesId._id}`}>{chapter.seriesId.title}</Link>
        <p>Chapter {chapter.chapterNumber}: {chapter.title}</p>
      </div>
      <span>{formatDistanceToNow(new Date(chapter.releaseDate))} ago</span>
    </div>
  );
}