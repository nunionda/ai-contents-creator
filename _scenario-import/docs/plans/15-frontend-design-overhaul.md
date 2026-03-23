# Plan: Frontend Design Overhaul — Landing Page, Dashboard Frame, Grid & PDF Print

## Overview
Full frontend visual overhaul: (A) replace boilerplate homepage with product landing page, (B) add branded dashboard frame with header and welcome hero, (C) eliminate grid whitespace across all panels, (D) fix PDF export layout for full A4 coverage with orphan card handling.

## Scope

### Part A: Landing Page Redesign (1 page)
- **A1**: Dark glass-morphism theme matching dashboard aesthetic
- **A2**: Hero section with gradient text title, Korean description, gold CTA
- **A3**: Features grid (2×2) — Emotion Analysis, Character Intelligence, ROI Prediction, Production Analysis
- **A4**: How It Works (3-step) — Upload, AI Analysis, Report
- **A5**: Stats section (4 metrics) — ROI accuracy, analysis metrics, markets, AI engines
- **A6**: Bottom CTA panel + footer
- **A7**: Responsive breakpoints (1024, 768, 480px)

### Part B: Dashboard Frame (3 changes)
- **B1**: Branded header with home link icon and locale toggle
- **B2**: Welcome hero (idle state) — gradient text, description
- **B3**: Section labels (COVERAGE, PRODUCTION, ANALYSIS RESULTS) with gold accent

### Part C: Grid Whitespace Elimination (5 changes)
- **C1**: `main-chart` → span 12 (was span 8)
- **C2**: `sidebar-panel` → span 6 (was span 4)
- **C3**: `diversity-panel` → span 6 (was span 4)
- **C4**: `trope-panel` → span 12 (was span 4, orphaned in market grid)
- **C5**: Beat grid → `auto-fit` (was `auto-fill`, left empty columns)
- **C6**: Scene Explorer → `grid-column: 1 / -1`

### Part D: CSS Variable Unification (4 components)
- **D1**: CharacterIntelligence.tsx — voiceScore hex → `var(--color-success/warning)`
- **D2**: EmotionChart.tsx — engagement hex → CSS variables
- **D3**: MarketPredictions.tsx — badge hex → CSS variables
- **D4**: Various inline hex colors → semantic CSS custom properties

### Part E: PDF Print Layout (3 fixes)
- **E1**: Panels fill full A4 width (`width: 100% !important; display: block`)
- **E2**: Center alignment with `text-align: center` on container, `text-align: left` on content
- **E3**: Orphan card handling — `last-child:nth-child(odd)` span 2 for coverage-categories, comps-grid, scene-cards

## Files

| File | Changes |
|------|---------|
| `apps/web/src/app/page.tsx` | Complete rewrite — product landing page |
| `apps/web/src/app/page.module.css` | Complete rewrite — landing page styles |
| `apps/web/src/app/dashboard/page.tsx` | Header, welcome hero, section labels, dashboard-bg wrapper |
| `apps/web/src/app/dashboard/dashboard.css` | Grid spans, print styles, CSS variable unification |
| `apps/web/src/app/dashboard/components/SceneExplorer.css` | grid-column: 1/-1, print orphan fix |
| `apps/web/src/app/dashboard/components/CharacterIntelligence.tsx` | Hex → CSS variables |
| `apps/web/src/app/dashboard/components/EmotionChart.tsx` | Hex → CSS variables |
| `apps/web/src/app/dashboard/components/MarketPredictions.tsx` | Hex → CSS variables |
| `apps/web/src/app/dashboard/components/NarrativeArcPanel.tsx` | Hex → CSS variables |
| `apps/web/src/app/dashboard/components/ProductionBreakdown.tsx` | Hex → CSS variables |
| `apps/web/src/app/dashboard/components/UploadPanel.tsx` | Hex → CSS variables |
| `apps/web/src/app/dashboard/components/DraftComparison.tsx` | Hex → CSS variables |
| `apps/web/src/app/dashboard/components/DraftComparison.css` | Print styles |
| `apps/web/src/app/dashboard/components/StatisticalROIPanel.css` | Print styles |
