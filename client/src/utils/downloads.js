import JSZip from 'jszip';
import api, { buildApiUrl } from '../api';
import { buildImageCandidates } from './images';

const parseContentDispositionFileName = (contentDisposition = '') => {
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim());
    } catch (error) {
      return utf8Match[1].trim();
    }
  }

  const asciiMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  return asciiMatch?.[1]?.trim() || '';
};

const triggerBrowserDownload = (blob, fileName) => {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
};

const sanitizeFileName = (value, fallback = 'download') => {
  const normalizedValue = typeof value === 'string' ? value : '';
  const sanitizedValue = normalizedValue
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return sanitizedValue || fallback;
};

const getFileExtensionFromResponse = (response, url, fallback = 'jpg') => {
  const contentType = response?.headers?.get('content-type') || '';
  const normalizedContentType = contentType.split(';')[0].trim().toLowerCase();
  const contentTypeExtensions = {
    'image/avif': 'avif',
    'image/gif': 'gif',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/svg+xml': 'svg',
    'image/webp': 'webp',
  };

  if (contentTypeExtensions[normalizedContentType]) {
    return contentTypeExtensions[normalizedContentType];
  }

  try {
    const parsedUrl = new URL(url, window.location.origin);
    const pathname = parsedUrl.pathname || '';
    const extensionMatch = pathname.match(/\.([a-z0-9]{2,5})$/i);

    if (extensionMatch?.[1]) {
      return extensionMatch[1].toLowerCase();
    }
  } catch (error) {
    const extensionMatch = String(url || '').match(/\.([a-z0-9]{2,5})(?:[?#].*)?$/i);
    if (extensionMatch?.[1]) {
      return extensionMatch[1].toLowerCase();
    }
  }

  return fallback;
};

const fetchImageBlob = async (candidateUrls) => {
  let lastError = null;

  for (const candidateUrl of candidateUrls) {
    try {
      const response = await fetch(candidateUrl, {
        credentials: 'omit',
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`Image request failed with status ${response.status}.`);
      }

      return {
        blob: await response.blob(),
        extension: getFileExtensionFromResponse(response, candidateUrl),
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Unable to download one or more chapter pages.');
};

const getChapterPageEntries = (chapter) => {
  const rawPageSources = Array.isArray(chapter?.pageSources) && chapter.pageSources.length > 0
    ? chapter.pageSources
    : Array.isArray(chapter?.pages)
      ? chapter.pages.map((pageUrl) => ({ url: pageUrl, candidates: [pageUrl] }))
      : [];

  return rawPageSources
    .map((pageSource) => {
      if (!pageSource) {
        return null;
      }

      if (typeof pageSource === 'string') {
        const candidates = buildImageCandidates(pageSource, []);
        return candidates.length > 0 ? { candidates } : null;
      }

      const sourceUrl = typeof pageSource.url === 'string' ? pageSource.url : '';
      const sourceCandidates = Array.isArray(pageSource.candidates) ? pageSource.candidates : [];
      const candidates = buildImageCandidates(sourceUrl, sourceCandidates);

      return candidates.length > 0 ? { candidates } : null;
    })
    .filter(Boolean);
};

const buildChapterBaseFileName = (chapter, fallback = 'chapter') => {
  const chapterHeading = chapter?.title && /^chapter\b/i.test(chapter.title.trim())
    ? chapter.title.trim()
    : `Chapter ${chapter?.number || ''}`.trim();

  return sanitizeFileName(chapterHeading, fallback);
};

const buildChapterArchiveBlob = async (chapter, onProgress) => {
  const pageEntries = getChapterPageEntries(chapter);

  if (pageEntries.length === 0) {
    throw new Error('This chapter has no downloadable pages.');
  }

  const archive = new JSZip();

  for (let index = 0; index < pageEntries.length; index += 1) {
    const { blob, extension } = await fetchImageBlob(pageEntries[index].candidates);
    const pageNumber = String(index + 1).padStart(3, '0');
    archive.file(`${pageNumber}.${extension}`, blob);
    
    if (onProgress) {
      onProgress({
        phase: `Fetching page ${index + 1} of ${pageEntries.length}...`,
        percent: Math.round(((index + 1) / pageEntries.length) * 50)
      });
    }
  }

  return archive.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  }, (metadata) => {
    if (onProgress) {
      onProgress({
        phase: `Zipping chapter...`,
        percent: 50 + Math.round((metadata.percent / 100) * 50),
      });
    }
  });
};

export const downloadApiFile = async (path, fallbackFileName, onProgress) => {
  let response;

  try {
    response = await api.get(path, {
      responseType: 'blob',
      onDownloadProgress: (progressEvent) => {
        if (onProgress) {
          if (progressEvent.lengthComputable || progressEvent.total) {
            const total = progressEvent.total || 1;
            const percentCompleted = Math.round((progressEvent.loaded * 100) / total);
            onProgress({
              phase: 'Downloading file...',
              percent: percentCompleted,
            });
          } else {
            const loadedMb = (progressEvent.loaded / (1024 * 1024)).toFixed(1);
            onProgress({
              phase: `Downloading... (${loadedMb} MB)`,
              percent: 100, // indeterminate style could be inferred by phase presence
            });
          }
        }
      }
    });
  } catch (error) {
    const responseData = error?.response?.data;
    const contentType = error?.response?.headers?.['content-type'] || '';

    if (responseData instanceof Blob && contentType.includes('application/json')) {
      try {
        const parsedBody = JSON.parse(await responseData.text());
        const normalizedError = new Error(parsedBody?.message || 'Download failed.');
        normalizedError.response = error.response;
        throw normalizedError;
      } catch (parseError) {
        throw parseError;
      }
    }

    throw error;
  }

  const fileName =
    parseContentDispositionFileName(response.headers['content-disposition']) || fallbackFileName;
  const mimeType = response.headers['content-type'] || 'application/octet-stream';
  const blob = new Blob([response.data], { type: mimeType });

  triggerBrowserDownload(blob, fileName);

  return {
    fileName,
    url: buildApiUrl(path),
  };
};

export const downloadChapterAsCbz = async (chapter, fallbackFileName, onProgress) => {
  const archiveBlob = await buildChapterArchiveBlob(chapter, onProgress);
  const fileName = `${sanitizeFileName(
    fallbackFileName ? fallbackFileName.replace(/\.cbz$/i, '') : buildChapterBaseFileName(chapter),
    'chapter'
  )}.cbz`;

  triggerBrowserDownload(archiveBlob, fileName);

  return {
    fileName,
  };
};

export const downloadSeriesBatchAsZip = async (seriesTitle, chapters, fallbackFileName, onProgress) => {
  const normalizedChapters = Array.isArray(chapters) ? chapters.filter(Boolean) : [];

  if (normalizedChapters.length === 0) {
    throw new Error('No chapters are available to download.');
  }

  const archive = new JSZip();

  for (let i = 0; i < normalizedChapters.length; i++) {
    const chapter = normalizedChapters[i];
    
    const chapterProgress = (data) => {
      if (onProgress) {
        const chapterBasePercent = (i / normalizedChapters.length) * 90;
        const chapterFraction = 1 / normalizedChapters.length;
        onProgress({
          phase: `Chapter ${i + 1}/${normalizedChapters.length}: ${data.phase}`,
          percent: Math.round(chapterBasePercent + (data.percent / 100) * (chapterFraction * 90))
        });
      }
    };

    const chapterBlob = await buildChapterArchiveBlob(chapter, chapterProgress);
    const chapterFileName = `${buildChapterBaseFileName(chapter)}.cbz`;
    archive.file(chapterFileName, chapterBlob);
  }

  const zipBlob = await archive.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  }, (metadata) => {
    if (onProgress) {
      onProgress({
        phase: `Creating final ZIP archive...`,
        percent: 90 + Math.round((metadata.percent / 100) * 10),
      });
    }
  });
  const fileName = `${sanitizeFileName(
    fallbackFileName ? fallbackFileName.replace(/\.zip$/i, '') : seriesTitle,
    'series'
  )}.zip`;

  triggerBrowserDownload(zipBlob, fileName);

  return {
    fileName,
  };
};
