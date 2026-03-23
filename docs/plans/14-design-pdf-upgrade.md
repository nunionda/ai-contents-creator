# Plan: Frontend Design Upgrade + PDF Report Upgrade

## Overview
Two-part visual upgrade: (A) modernize the web dashboard design with proper typography, hover effects, animations, and color polish; (B) enhance PDF export with table of contents, per-section page breaks, verdict badges, and print typography tuning.

## Scope

### Part A: Frontend Design (9 changes)
- **A1**: Fix Geist font — imported but never applied (globals.css used Arial)
- **A2**: Extend CSS palette with dim accent variants + hover border/panel colors
- **A3**: Glass panel hover elevation (translateY, shadow transition)
- **A4**: Stat card icon circular background + Geist Mono for numeric values
- **A5**: EmotionChart — 3-stop gradient, glass tooltip, activeDot styling
- **A6**: Badge glow effects (blockbuster gold, hit green, R outline)
- **A7**: Provider bar — Groq/DeepSeek color classes, hover highlight, backdrop-filter
- **A8**: SectionNav active border-left accent
- **A9**: fadeInUp animation with staggered stat card delays + prefers-reduced-motion

### Part B: PDF Report (10 changes)
- **B1**: Table of Contents on cover page (7 numbered items)
- **B2**: Page number via @page
- **B3**: Per-section page breaks (coverage, production, characters, arc, market, beats)
- **B4**: Orphan/widow control (3/3)
- **B5**: Stat card flexbox print layout + icon color preservation
- **B6**: Section header font size/border upgrade
- **B7**: Cover page verdict badge (Recommend/Consider/Pass) + AI provider info
- **B8**: Verdict criteria print styles
- **B9**: Print line-height tuning (body 1.5, titles 1.2)
- **B10**: Chart container height 200px for print

## Files

| File | Changes |
|------|---------|
| `apps/web/src/app/globals.css` | Geist font application |
| `apps/web/src/app/dashboard/dashboard.css` | Palette, elevation, stat cards, badges, provider bar, animations, all print styles |
| `apps/web/src/app/dashboard/components/EmotionChart.tsx` | Custom tooltip, gradient, dot styling |
| `apps/web/src/app/dashboard/components/ReportCover.tsx` | TOC, verdict badge, provider info |
| `apps/web/src/app/dashboard/page.tsx` | Pass providers prop to ReportCover |
