export const HOME_DISCOVERY_STORAGE_KEY = 'manwhanted:homePath';
export const DEFAULT_HOME_PATH = '/';

export function buildPathWithSearch(pathname, search = '') {
  if (!search) {
    return pathname;
  }

  return `${pathname}${search.startsWith('?') ? search : `?${search}`}`;
}

export function getStoredHomePath() {
  if (typeof window === 'undefined') {
    return DEFAULT_HOME_PATH;
  }

  return window.sessionStorage.getItem(HOME_DISCOVERY_STORAGE_KEY) || DEFAULT_HOME_PATH;
}

export function setStoredHomePath(path) {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(HOME_DISCOVERY_STORAGE_KEY, path || DEFAULT_HOME_PATH);
}
