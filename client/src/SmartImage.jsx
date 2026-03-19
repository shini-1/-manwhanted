import React, { useEffect, useState } from 'react';
import { buildImageCandidates } from './utils/images';

export default function SmartImage({
  src,
  sources = [],
  fallbackSrc = '',
  alt,
  onError,
  referrerPolicy = 'no-referrer',
  ...props
}) {
  const sourceKey = Array.isArray(sources) ? sources.join('|') : '';
  const candidates = buildImageCandidates(src, sources);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    setCandidateIndex(0);
    setUsingFallback(false);
  }, [src, sourceKey, fallbackSrc]);

  const activeSrc = usingFallback
    ? fallbackSrc
    : candidates[candidateIndex] || fallbackSrc || '';

  const handleError = (event) => {
    if (!usingFallback && candidateIndex + 1 < candidates.length) {
      setCandidateIndex((current) => current + 1);
      return;
    }

    if (!usingFallback && fallbackSrc) {
      setUsingFallback(true);
      return;
    }

    onError?.(event);
  };

  if (!activeSrc) {
    return null;
  }

  return (
    <img
      {...props}
      key={`${candidateIndex}:${usingFallback ? 'fallback' : activeSrc}`}
      src={activeSrc}
      alt={alt}
      referrerPolicy={referrerPolicy}
      onError={handleError}
    />
  );
}
