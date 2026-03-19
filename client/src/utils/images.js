const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const toAbsoluteApiUrl = (path) => {
  const normalizedPath = path.replace(/^\//, '');

  if (/^https?:\/\//i.test(API_BASE_URL)) {
    const normalizedBaseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`;
    return new URL(normalizedPath, normalizedBaseUrl).toString();
  }

  if (typeof window !== 'undefined') {
    const normalizedBasePath = API_BASE_URL.startsWith('/') ? API_BASE_URL : `/${API_BASE_URL}`;
    const normalizedBaseUrl = normalizedBasePath.endsWith('/')
      ? normalizedBasePath
      : `${normalizedBasePath}/`;

    return new URL(normalizedPath, `${window.location.origin}${normalizedBaseUrl}`).toString();
  }

  return `${API_BASE_URL.replace(/\/$/, '')}/${normalizedPath}`;
};

export const buildImageProxySrc = (url) => {
  if (!url || !/^https?:\/\//i.test(url)) {
    return url || '';
  }

  return `${toAbsoluteApiUrl('/images/proxy')}?url=${encodeURIComponent(url)}`;
};

export const buildImageCandidates = (src, extraSources = []) => {
  const normalizedSources = [src, ...extraSources]
    .flat()
    .filter((candidate) => typeof candidate === 'string')
    .map((candidate) => candidate.trim())
    .filter(Boolean);

  const candidatesWithProxyFallbacks = normalizedSources.flatMap((candidate) => {
    const proxyCandidate = buildImageProxySrc(candidate);
    return proxyCandidate && proxyCandidate !== candidate
      ? [candidate, proxyCandidate]
      : [candidate];
  });

  return [...new Set(candidatesWithProxyFallbacks)];
};

export const buildCacheBustedImageSrc = (src, token) => {
  if (!src || token === undefined || token === null || token === '') {
    return src || '';
  }

  try {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const parsedUrl = new URL(src, baseUrl);
    parsedUrl.searchParams.set('mwcb', String(token));

    if (/^https?:\/\//i.test(src) || src.startsWith('/')) {
      return parsedUrl.toString();
    }

    return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
  } catch (error) {
    const separator = src.includes('?') ? '&' : '?';
    return `${src}${separator}mwcb=${encodeURIComponent(String(token))}`;
  }
};
