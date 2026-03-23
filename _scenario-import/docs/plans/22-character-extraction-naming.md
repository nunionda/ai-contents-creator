# Plan 22: Character Extraction Fix & Naming Convention Upgrade

## Scope

1. **Korean Character Extraction** — parser와 CharacterAnalyzer의 캐릭터 추출 정확도 개선
2. **PDF Print CSS** — 촬영지/VFX 섹션 출력 잘림 해결
3. **Gemini Model Chain** — 낮은 버전→높은 버전 순서로 재배열
4. **Naming Convention** — 한글 제목을 영어 번역 prefix로 변환

## Architecture

### Character Extraction Pipeline

```
PDF → parseFountain() → CharacterAnalyzer.analyze()
          │                      │
          ├─ excludedWords       ├─ Pass 1.6: suffix merge (강설희→설희)
          ├─ koreanCommonWordRe  ├─ Pass 1.6b: particle prefix strip (이리철→리철)
          ├─ orgSuffix filter    ├─ Pass 1.7: noise/org filter
          └─ verbEnding filter   └─ Pass 1.8: edge/dialoguePair cleanup
```

### Naming Convention

```
기존: 한글 제목 → 로마자 (jeonyul-migung)
신규: 한글 제목 → 영어 사전 번역 (thrill-maze) → fallback: 로마자
```

## Key Files

| File | Change |
|------|--------|
| `packages/core/src/script/infrastructure/parser.ts` | org suffix, 감탄사/대명사/장소 제외 |
| `packages/core/src/creative/application/CharacterAnalyzer.ts` | 이름 병합, 접두사 제거, 엣지 정리 |
| `apps/web/src/app/dashboard/dashboard.css` | @media print max-height 해제 |
| `packages/core/src/creative/infrastructure/llm/GeminiProvider.ts` | 모델 체인 low→high |
| `apps/api/src/utils/naming.ts` | KO→EN 사전 번역 + slug 생성 |
