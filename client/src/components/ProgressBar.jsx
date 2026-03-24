import React from 'react';

const ProgressBar = ({ progress, className = '' }) => {
  if (!progress) return null;

  const { phase, percent } = progress;
  // If percent is >= 100 but phase doesn't indicate completion, we might have an indeterminate total, 
  // but let's constrain the bar graph to 0-100.
  const constrainedPercent = Math.max(0, Math.min(100, percent || 0));
  const isIndeterminate = percent == null || percent < 0; // if we want to support this later

  return (
    <div className={`w-full mt-3 mb-2 px-1 ${className}`}>
      <div className="flex justify-between items-end text-xs text-gray-400 mb-1.5 font-medium tracking-wide">
        <span className="truncate pr-2">{phase || 'Downloading...'}</span>
        {!isIndeterminate && <span className="shrink-0">{constrainedPercent}%</span>}
      </div>
      <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden ring-1 ring-inset ring-white/5">
        <div 
          className="bg-indigo-500 h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${isIndeterminate ? 100 : constrainedPercent}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
