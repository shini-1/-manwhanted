import { Request, Response } from 'express';
import axios from 'axios';

const ALLOWED_IMAGE_PROTOCOLS = new Set(['http:', 'https:']);

export const proxyImage = async (req: Request, res: Response) => {
  const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';

  if (!rawUrl) {
    return res.status(400).json({ message: 'Image URL is required.' });
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(rawUrl);
  } catch (error) {
    return res.status(400).json({ message: 'Image URL is invalid.' });
  }

  if (!ALLOWED_IMAGE_PROTOCOLS.has(parsedUrl.protocol)) {
    return res.status(400).json({ message: 'Image URL protocol is not supported.' });
  }

  try {
    const upstreamResponse = await axios.get(parsedUrl.toString(), {
      responseType: 'stream',
      timeout: 25000,
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (compatible; Manwhanted/1.0)',
        Origin: parsedUrl.origin,
        Referer: `${parsedUrl.origin}/`,
      },
      validateStatus: (status) => status >= 200 && status < 400,
    });

    const contentType = upstreamResponse.headers['content-type'];
    const cacheControl = upstreamResponse.headers['cache-control'];

    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    // These images are intentionally embedded by the separately deployed client.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    res.setHeader(
      'Cache-Control',
      cacheControl || 'public, max-age=86400, stale-while-revalidate=604800'
    );

    upstreamResponse.data.on('error', (streamError: Error) => {
      console.error('Proxy image stream error:', streamError);
      res.end();
    });

    upstreamResponse.data.pipe(res);
  } catch (error) {
    console.error('Proxy image error:', error);
    return res.status(502).json({ message: 'Failed to fetch image.' });
  }
};
