import React, { useEffect, useRef, useState } from 'react';
import JSZip from 'jszip';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../LoadingSpinner';
import ErrorAlert from '../ErrorAlert';
import { getStoredHomePath } from '../utils/navigationState';

const OFFLINE_PROGRESS_PREFIX = 'manwhanted:offlineProgress:';
const IMAGE_ENTRY_PATTERN = /\.(avif|gif|jpe?g|png|webp)$/i;
const fileNameCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

const createFileFingerprint = (file) => `${file.name}:${file.size}:${file.lastModified}`;

const readSavedOfflineProgress = (fingerprint) => {
  if (typeof window === 'undefined' || !fingerprint) {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(`${OFFLINE_PROGRESS_PREFIX}${fingerprint}`);
    return rawValue ? JSON.parse(rawValue) : null;
  } catch (error) {
    return null;
  }
};

const OfflineReader = () => {
  const fileInputRef = useRef(null);
  const objectUrlsRef = useRef([]);
  const [pages, setPages] = useState([]);
  const [fileMeta, setFileMeta] = useState(null);
  const [savedPageIndex, setSavedPageIndex] = useState(0);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const homeHref = getStoredHomePath();

  const clearObjectUrls = () => {
    objectUrlsRef.current.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
    objectUrlsRef.current = [];
  };

  useEffect(() => () => {
    clearObjectUrls();
  }, []);

  useEffect(() => {
    if (!fileMeta?.fingerprint || pages.length === 0) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      `${OFFLINE_PROGRESS_PREFIX}${fileMeta.fingerprint}`,
      JSON.stringify({
        name: fileMeta.name,
        pageIndex: currentPageIndex,
        updatedAt: Date.now(),
      })
    );
  }, [currentPageIndex, fileMeta, pages.length]);

  useEffect(() => {
    if (pages.length === 0) {
      return undefined;
    }

    const pageNodes = Array.from(document.querySelectorAll('[data-offline-page-index]'));
    const observer = new IntersectionObserver(
      (entries) => {
        const bestVisibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        if (!bestVisibleEntry) {
          return;
        }

        const nextPageIndex = Number.parseInt(
          bestVisibleEntry.target.getAttribute('data-offline-page-index') || '0',
          10
        );

        if (Number.isFinite(nextPageIndex)) {
          setCurrentPageIndex(nextPageIndex);
        }
      },
      {
        rootMargin: '-12% 0px -55% 0px',
        threshold: [0.25, 0.5, 0.75],
      }
    );

    pageNodes.forEach((pageNode) => observer.observe(pageNode));

    if (savedPageIndex > 0) {
      requestAnimationFrame(() => {
        document
          .querySelector(`[data-offline-page-index="${savedPageIndex}"]`)
          ?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    return () => {
      observer.disconnect();
    };
  }, [pages, savedPageIndex]);

  const processFileOrBlob = async (fileOrBlob, name) => {
    let extractedPages = [];
    const archive = await JSZip.loadAsync(fileOrBlob);

    const cbzEntries = Object.values(archive.files)
      .filter((entry) => !entry.dir && /\.cbz$/i.test(entry.name))
      .sort((left, right) => fileNameCollator.compare(left.name, right.name));

    for (const cbzEntry of cbzEntries) {
      const cbzBlob = await cbzEntry.async('blob');
      const nestedPages = await processFileOrBlob(cbzBlob, cbzEntry.name);
      extractedPages = extractedPages.concat(nestedPages);
    }

    const imageEntries = Object.values(archive.files)
      .filter((entry) => !entry.dir && IMAGE_ENTRY_PATTERN.test(entry.name))
      .sort((left, right) => fileNameCollator.compare(left.name, right.name));

    const directPages = await Promise.all(
      imageEntries.map(async (entry) => {
        const imageBlob = await entry.async('blob');
        const objectUrl = URL.createObjectURL(imageBlob);
        objectUrlsRef.current.push(objectUrl);

        return {
          id: `${name}:${entry.name}`,
          label: entry.name,
          url: objectUrl,
        };
      })
    );

    return extractedPages.concat(directPages);
  };

  const loadCbzFiles = async (files) => {
    if (!files || files.length === 0) {
      return;
    }

    const fileArray = Array.from(files).sort((a, b) => fileNameCollator.compare(a.name, b.name));
    const validFiles = fileArray.filter((f) => /\.(cbz|zip)$/i.test(f.name));

    if (validFiles.length === 0) {
      setError('Please choose at least one .cbz or .zip file.');
      return;
    }

    setLoading(true);
    setError(null);
    clearObjectUrls();

    try {
      let allPages = [];
      let totalSize = 0;
      let collectiveName = validFiles.length === 1 ? validFiles[0].name : `${validFiles.length} files`;
      let fingerprints = [];

      for (const file of validFiles) {
        fingerprints.push(createFileFingerprint(file));
        totalSize += file.size || 0;
        const filePages = await processFileOrBlob(file, file.name);
        allPages = allPages.concat(filePages);
      }

      if (allPages.length === 0) {
        throw new Error('These files do not contain readable image pages.');
      }

      const combinedFingerprint = fingerprints.join('|');
      const savedProgress = readSavedOfflineProgress(combinedFingerprint);
      const initialPageIndex = Math.min(savedProgress?.pageIndex || 0, allPages.length - 1);

      const finalPages = allPages.map((p, index) => ({
        ...p,
        id: `${p.id}:${index}`
      }));

      setPages(finalPages);
      setFileMeta({
        fingerprint: combinedFingerprint,
        name: collectiveName,
        pageCount: finalPages.length,
        size: totalSize,
      });
      setSavedPageIndex(initialPageIndex);
      setCurrentPageIndex(initialPageIndex);
    } catch (loadError) {
      console.error('Offline files load error:', loadError);
      clearObjectUrls();
      setPages([]);
      setFileMeta(null);
      setSavedPageIndex(0);
      setCurrentPageIndex(0);
      setError(loadError.message || 'Failed to open the provided file(s).');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelection = async (event) => {
    await loadCbzFiles(event.target.files);
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    setDragActive(false);
    await loadCbzFiles(event.dataTransfer.files);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link to={homeHref} className="text-blue-400 hover:underline">
            Home
          </Link>
        </div>
        <button
          type="button"
          className="simple-button simple-button-success"
          onClick={() => fileInputRef.current?.click()}
        >
          Open Files
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".cbz,application/vnd.comicbook+zip,application/zip"
        className="hidden"
        onChange={handleFileSelection}
      />

      <section className="mb-8 rounded-3xl border border-slate-800 bg-slate-950/80 p-5 shadow-2xl">
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-slate-50">Offline Reader</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Open downloaded CBZ or ZIP files from your device. The files stay in your browser session and
            your reading progress is saved locally on this device.
          </p>
        </div>

        <label
          className={`block cursor-pointer rounded-3xl border-2 border-dashed px-6 py-10 text-center transition ${
            dragActive
              ? 'border-emerald-400 bg-emerald-500/10'
              : 'border-slate-700 bg-slate-900/70 hover:border-emerald-400/70 hover:bg-slate-900'
          }`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <p className="text-lg font-semibold text-slate-100">Tap to choose CBZ or ZIP files</p>
          <p className="mt-2 text-sm text-slate-400">
            Drag and drop also works on desktop. You can drop multiple .cbz files or a batch .zip file.
          </p>
        </label>
      </section>

      {loading && <LoadingSpinner />}
      {error && <ErrorAlert message={error} />}

      {fileMeta && !loading && (
        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/75 p-4 text-sm text-slate-200">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-slate-50">{fileMeta.name}</p>
              <p className="text-slate-400">
                {fileMeta.pageCount} pages · Currently on page {currentPageIndex + 1}
              </p>
            </div>
            {savedPageIndex > 0 && (
              <p className="text-xs text-emerald-200">
                Resumed near page {savedPageIndex + 1} from your last local session.
              </p>
            )}
          </div>
        </section>
      )}

      {pages.length > 0 && !loading && (
        <div className="space-y-4">
          {pages.map((page, index) => (
            <div
              key={page.id}
              data-offline-page-index={index}
              className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-3 shadow-xl"
            >
              <img
                src={page.url}
                alt={`Offline page ${index + 1}`}
                className="mx-auto w-full rounded-2xl"
                loading={index <= 1 ? 'eager' : 'lazy'}
                decoding="async"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OfflineReader;
