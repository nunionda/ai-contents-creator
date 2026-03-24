# Plan: Phase 6 - File Upload UI & Report History

## 1. Objective
Replace the hardcoded Fight Club data display with an interactive upload-driven dashboard. Users can drag & drop `.fountain`/`.txt` screenplay files for real-time analysis, browse past reports, and seamlessly switch between idle, analyzing, and viewing states.

## 2. Core Features (Scope)

### A. API CORS Configuration
- **Goal:** Enable cross-origin requests from the frontend (port 3000) to the API (port 4005).
- **Implementation:** Install `@elysiajs/cors` and add `.use(cors())` middleware chain to the Elysia app.

### B. Dashboard State Model Refactoring
- **Goal:** Replace the single `data`+`loading` pattern with a 3-mode state machine for clear UI transitions.
- **Implementation:**
  - `ViewMode` type: `idle` (upload waiting), `analyzing` (spinner active), `viewing` (results displayed).
  - Additional state: `selectedFile`, `movieId`, `uploadError`, `dragOver`, `reports[]`.
  - Remove hardcoded `GET /report/fight_club` auto-fetch on mount.

### C. Upload Panel
- **Goal:** Allow users to submit screenplay files directly from the dashboard.
- **Implementation:**
  - Drag & drop zone accepting `.fountain` and `.txt` files.
  - Click-to-browse fallback via programmatic `<input type="file">`.
  - `File.text()` reads file content, sends to `POST /analyze` with optional Movie ID.
  - Visual feedback: file info display, loading spinner, error messages.

### D. Report History Sidebar
- **Goal:** Provide quick access to previously analyzed scripts.
- **Implementation:**
  - Fetches `GET /reports?pageSize=10` on mount.
  - Clicking a history item loads the full report via `GET /report/:id`.
  - Refreshes after each new analysis completes.

### E. Conditional Results Rendering
- **Goal:** Show the analysis dashboard only when data is available.
- **Implementation:**
  - Header dynamically shows `scriptId` or "Upload a screenplay to begin".
  - Rating/ROI badges and the full grid layout render only when `data` exists.
  - "New Analysis" button resets to idle mode.

### F. CSS Extensions
- **Goal:** Style new UI components using the existing glassmorphism design system.
- **Implementation:** `.upload-row`, `.drop-zone`, `.input-glass`, `.btn-analyze`, `.btn-reset`, `.history-item`, `.upload-error`, `.spin` animation, responsive breakpoint at 768px.

## 3. Files Modified

| File | Change |
|------|--------|
| `apps/api/package.json` | `@elysiajs/cors` dependency |
| `apps/api/src/index.ts` | `cors()` middleware (2 lines) |
| `apps/web/src/app/dashboard/page.tsx` | Full rewrite: state machine + upload + history + conditional rendering |
| `apps/web/src/app/dashboard/dashboard.css` | Upload/history CSS classes added |
