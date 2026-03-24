# Result: Session 20 — Korean Romanization ScriptId Convention

## Overview
Added automatic Korean-to-English romanization prefix for scriptId naming, so users can easily identify Korean screenplay reports at a glance (e.g., `친구.fountain` → `[Chingu]친구$`).

## Changes

### Korean Romanization Engine
- Implemented `romanizeKorean()` using **Revised Romanization of Korean** standard
- Unicode Hangul Syllables decomposition (U+AC00–U+D7A3) into cho/jung/jong jamo
- Lookup tables for 19 initial consonants (CHO), 21 vowels (JUNG), 28 final consonants (JONG)
- `hasKorean()` detector using regex `/[\uAC00-\uD7A3]/`
- `capitalizeFirst()` helper for title-casing the romanized prefix

### ScriptId Naming Convention
- **Korean filename**: `[Romanized]korean$` — e.g., `친구.fountain` → `[Chingu]친구$`
- **English filename**: `filename$` — unchanged from Session 18
- **No filename**: falls back to `movieId` or `script-{timestamp}`

### Frontend URL Safety
- `loadReport` now uses `encodeURIComponent(scriptId)` for URL-safe API calls
- Handles brackets, Korean characters, and `$` in URLs

### Romanization Examples
| Korean | Romanized | ScriptId |
|--------|-----------|----------|
| 친구 | Chingu | `[Chingu]친구$` |
| 기생충 | Gisaengchung | `[Gisaengchung]기생충$` |
| 올드보이 | Oldeuboi | `[Oldeuboi]올드보이$` |
| 해운대 | Haeundae | `[Haeundae]해운대$` |

## Files Changed

| File | Changes |
|------|---------|
| `apps/api/src/index.ts` | `romanizeKorean()`, `hasKorean()`, `capitalizeFirst()` utilities; Korean-aware scriptId generation |
| `apps/web/src/app/dashboard/page.tsx` | `encodeURIComponent(scriptId)` in `loadReport` fetch URL |

## Verification
- `tsc --noEmit` — clean (0 errors)
- `bun test` — 23 tests pass (0 failures)
