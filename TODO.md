# Manwhanted Fix & Complete TODO

## Current Status
- Vercel client deploy fixed (Tailwind/PostCSS .cjs).
- Frontend structure ready.
- Backend stubs only, deps outdated.

## Fix Steps (Approved Plan)

### 1. Environment Setup
- [x] Create client/.env.example (VITE_API_URL=http://localhost:5000/api)
- [ ] Create server/.env.example (MONGO_URI=mongodb://..., PORT=5000)

### 2. Update Server Dependencies
- [ ] Update server/package.json (modern Express^4.21, Mongoose^8, TS^5, etc.)
- [ ] cd server && npm i

### 3. Backend Models
- [ ] Create server/src/models/Series.ts (title, description, chapters[], etc.)
- [ ] Create server/src/models/Chapter.ts (seriesId, number, pages[])
- [ ] Create server/src/models/User.ts (email, password, bookmarks[])

### 4. Backend Controllers
- [ ] Create server/src/controllers/seriesController.ts (getAll, getById)
- [ ] Create server/src/controllers/authController.ts (register, login)
- [ ] Create server/src/controllers/bookmarkController.ts (add/remove)

### 5. Update Routes
- [ ] Update server/src/routes.ts (import/mount controllers)

### 6. Enhance Server Entry
- [ ] Update server/src/index.ts (error handling, helmet, 404)

### 7. Frontend API Config
- [ ] Update client/src/context/AuthContext.jsx (axios.defaults.baseURL)
- [ ] Update client/src/context/BookmarkContext.jsx (same)

### 8. Testing
- [ ] cd server && npm run dev (verify server/Mongo)
- [ ] cd client && npm run dev (verify frontend + API calls)
- [ ] cd client && npm run build (Vercel verify)

### 9. Deploy
- [ ] Push commits, Vercel redeploy client/server

### 10. Polish
- [ ] Implement stub pages (fetch real data)

**Progress: 1/10 complete**


