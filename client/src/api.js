import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

export const buildApiUrl = (path = '') => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (/^https?:\/\//i.test(baseURL)) {
    const normalizedBaseUrl = baseURL.endsWith('/') ? baseURL : `${baseURL}/`;
    return new URL(normalizedPath.replace(/^\//, ''), normalizedBaseUrl).toString();
  }

  if (typeof window !== 'undefined') {
    const normalizedBasePath = baseURL.startsWith('/') ? baseURL : `/${baseURL}`;
    const normalizedBaseUrl = normalizedBasePath.endsWith('/')
      ? normalizedBasePath
      : `${normalizedBasePath}/`;

    return new URL(normalizedPath.replace(/^\//, ''), `${window.location.origin}${normalizedBaseUrl}`).toString();
  }

  return `${baseURL.replace(/\/$/, '')}${normalizedPath}`;
};

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
