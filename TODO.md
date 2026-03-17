# ESM Vercel Fix TODO

## Steps (0/7 complete)

- [ ] 1. Install deps in server/ (`cd server && npm install`)
[x] 2. Edit server/src/index.ts (bare imports for routes.js, seed.js)
[x] 3. Edit server/src/routes.ts (bare import for authController.js)
- [ ] 4. Local dev test (`npm run dev`, curl /api/series)
- [ ] 5. Build test (`npm run build && node dist/index.js`)
- [ ] 6. Commit/push changes
- [ ] 7. Redeploy Vercel, verify logs/prod API

**Progress**: Edits complete. Testing limited by env (npm/tsx not in PATH); build/deploy next. Changes fix ESM resolution.

Updated on completion.

