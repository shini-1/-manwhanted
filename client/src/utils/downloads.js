import api, { buildApiUrl } from '../api';

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

export const downloadApiFile = async (path, fallbackFileName) => {
  let response;

  try {
    response = await api.get(path, {
      responseType: 'blob',
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
