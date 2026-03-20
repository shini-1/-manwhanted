const BASE_URL = process.env.DOWNLOAD_BASE_URL || 'http://127.0.0.1:5000/api';
const FALLBACK_SERIES_ID = '65f000000000000000000001';
const FALLBACK_CHAPTER_ONE_ID = '66f000000000000000000001';
const FALLBACK_CHAPTER_TWO_ID = '66f000000000000000000002';

const assert = (condition: unknown, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const hasZipSignature = (buffer: Buffer) =>
  buffer.length >= 4
  && buffer[0] === 0x50
  && buffer[1] === 0x4b
  && (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07)
  && (buffer[3] === 0x04 || buffer[3] === 0x06 || buffer[3] === 0x08);

const fetchBinaryDownload = async (path: string) => {
  const response = await fetch(`${BASE_URL}${path}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    response,
    buffer,
  };
};

const fetchJson = async (path: string) => {
  const response = await fetch(`${BASE_URL}${path}`);
  const body = await response.json().catch(() => ({}));
  return {
    response,
    body,
  };
};

const verifySingleChapterDownload = async () => {
  const { response, buffer } = await fetchBinaryDownload(`/chapters/${FALLBACK_CHAPTER_ONE_ID}/download`);
  const contentType = response.headers.get('content-type') || '';
  const contentDisposition = response.headers.get('content-disposition') || '';

  assert(response.ok, `Single chapter download failed with status ${response.status}.`);
  assert(contentType.includes('application/vnd.comicbook+zip'), `Unexpected CBZ content type: ${contentType}`);
  assert(contentDisposition.includes('.cbz'), `Expected .cbz filename, got: ${contentDisposition}`);
  assert(buffer.length > 1024, `Single chapter download is unexpectedly small: ${buffer.length} bytes.`);
  assert(hasZipSignature(buffer), 'Single chapter payload is not a valid zip/CBZ signature.');

  return buffer.length;
};

const verifyFullBatchDownload = async () => {
  const { response, buffer } = await fetchBinaryDownload(`/series/${FALLBACK_SERIES_ID}/download`);
  const contentType = response.headers.get('content-type') || '';
  const contentDisposition = response.headers.get('content-disposition') || '';

  assert(response.ok, `Full batch download failed with status ${response.status}.`);
  assert(contentType.includes('application/zip'), `Unexpected batch content type: ${contentType}`);
  assert(contentDisposition.includes('.zip'), `Expected .zip filename, got: ${contentDisposition}`);
  assert(buffer.length > 1024, `Full batch download is unexpectedly small: ${buffer.length} bytes.`);
  assert(hasZipSignature(buffer), 'Full batch payload is not a valid zip signature.');

  return buffer.length;
};

const verifyFilteredBatchDownload = async (fullBatchSize: number) => {
  const { response, buffer } = await fetchBinaryDownload(
    `/series/${FALLBACK_SERIES_ID}/download?chapterIds=${FALLBACK_CHAPTER_TWO_ID}`
  );
  const contentDisposition = response.headers.get('content-disposition') || '';

  assert(response.ok, `Filtered batch download failed with status ${response.status}.`);
  assert(contentDisposition.includes('.zip'), `Expected filtered batch .zip filename, got: ${contentDisposition}`);
  assert(buffer.length > 1024, `Filtered batch download is unexpectedly small: ${buffer.length} bytes.`);
  assert(hasZipSignature(buffer), 'Filtered batch payload is not a valid zip signature.');
  assert(
    buffer.length < fullBatchSize,
    `Filtered batch should be smaller than the full batch, got ${buffer.length} >= ${fullBatchSize}.`
  );
};

const verifyRejectedExternalDownloads = async () => {
  const { response: seriesResponse, body: seriesBody } = await fetchJson('/series/md_demo/download');
  assert(seriesResponse.status === 403, `Expected 403 for external series download, got ${seriesResponse.status}.`);
  assert(
    typeof seriesBody?.message === 'string' && seriesBody.message.length > 0,
    'External series rejection did not return a readable message.'
  );

  const { response: chapterResponse, body: chapterBody } = await fetchJson('/chapters/mdc_demo/download');
  assert(chapterResponse.status === 403, `Expected 403 for external chapter download, got ${chapterResponse.status}.`);
  assert(
    typeof chapterBody?.message === 'string' && chapterBody.message.length > 0,
    'External chapter rejection did not return a readable message.'
  );
};

const run = async () => {
  console.log(`Verifying download endpoints against ${BASE_URL}`);

  const singleChapterSize = await verifySingleChapterDownload();
  console.log(`PASS single chapter CBZ download (${singleChapterSize} bytes)`);

  const fullBatchSize = await verifyFullBatchDownload();
  console.log(`PASS full batch ZIP download (${fullBatchSize} bytes)`);

  await verifyFilteredBatchDownload(fullBatchSize);
  console.log('PASS filtered batch ZIP download');

  await verifyRejectedExternalDownloads();
  console.log('PASS external download guards');
};

run().catch((error) => {
  console.error('Download verification failed:', error);
  process.exitCode = 1;
});
