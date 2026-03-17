# Fix CORS + 404 for /api/series on Vercel

## Steps:
- [ ] 1. Edit server/src/index.ts: Add Vercel serverless handler export, adapt for serverless (connect inside handler, dev-only listen/seed).
- [ ] 2. Local test: cd server && npm run dev, curl http://localhost:5000/api/series (check CORS headers).
- [ ] 3. Set Vercel env vars: MONGO_URI, CLIENT_URL=https://manwhanted-client.vercel.app.
- [ ] 4. Deploy: cd server && vercel --prod.
- [ ] 5. Verify deployed: Browser Network tab shows /api/series 200 + Access-Control-Allow-Origin header.

## Status: Step 1 index.ts ✓ Step 3 ESM fixes applied (vercel.json, seed.ts). Run 'cd server &amp;&amp; npm run build &amp;&amp; vercel --prod' next.
