import api from '../api';

export function logError(error, info) {
  const payload = {
    message: error?.message || String(error),
    stack: error?.stack || null,
    info: info || null,
    time: new Date().toISOString(),
  };

  // Always log to console for local visibility
  console.error('Logged error:', payload);

  // Attempt to send to server (non-blocking)
  api.post('/logs', payload).catch(() => {
    // ignore failure; logging should never crash the app
  });
}
