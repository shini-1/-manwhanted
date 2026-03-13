# Vercel Client Deployment Fix
- [x] 1. Plan approved by user
- [x] 2. Update client/package.json (add TS deps, type:module)
- [x] 3. Update client/tsconfig.json (target ES2020)
- [x] 4. Create client/.env.example (VITE_API_URL)
- [x] 5. Update README.md (add Vercel instructions)
- [x] 6. Local test: cd client && npm i && npm run build (PostCSS/Tailwind .cjs fix)
- [ ] 7. Commit/push & Vercel redeploy (set root=client, add VITE_API_URL)
- [ ] 8. Verify deployment & API calls
