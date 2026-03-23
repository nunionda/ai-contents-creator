# Plan 21: 엔진 검증 및 교정 (Engine Verification & Calibration)

## 문제 정의

3개 결정론적 엔진의 분석 결과에 다수 오류 발견. Groq LLM 실제 분석 결과를 Ground Truth로 사용하여 키워드 사전과 로직을 교정한다.

## Ground Truth 상태

| 엔진 | LLM Provider | 상태 | 신뢰도 |
|------|-------------|------|--------|
| ContentRating | Mock (fallback) | ❌ 비교 불가 | 낮음 |
| VFX | **Groq (실제)** | ✅ Ground Truth 확보 | 높음 |
| Trope | **Groq (실제)** | ✅ Ground Truth 확보 | 높음 |

## 엔진별 오류 분석 및 교정 계획

---

### 1. VFX Engine — 편차 150%

#### 현황

| 시나리오 | Groq (GT) shots | DET shots | Groq hours | DET hours | 문제 |
|----------|----------------|-----------|-----------|-----------|------|
| 전율미궁 (공포) | 24 | 5 | 1,280h | 150h | **Under-detect** — 공포 VFX 키워드 부족 |
| 더킹 (범죄) | 4 | 0 | 130h | 0h | **Zero-detect** — 범죄물 VFX 완전 누락 |
| 비트세비어 (스릴러) | 14 | 25 | 460h | 1,260h | **Over-detect** — False positive 과다 |

#### 근본 원인
1. **공포 장르 VFX 키워드 부재**: 빙의, 퇴마, 환영, 안개, 심령 효과 등 한국 공포 VFX 미커버
2. **범죄 장르 VFX 키워드 부재**: 총격 효과, 차량 추격, 유혈 분장, 낙하 스턴트 미커버
3. **False positive**: `'충돌'`, `'파괴'` 같은 범용 키워드가 비유적 문맥에서도 매칭
4. **dialogue 라인 무시 필요**: VFX는 action 라인만 검사하지만, 일부 VFX 관련 지문이 dialogue에 포함

#### 교정 내용
- 공포/초자연 VFX 키워드 20+ 추가 (simple tier)
- 범죄/액션 VFX 키워드 10+ 추가 (simple/moderate tier)
- 과다매칭 키워드 제거 또는 문맥 조건 추가
- dialogue 라인의 지문 부분도 VFX 검사 대상 포함

---

### 2. Trope Engine — Jaccard 23%

#### 현황

| 시나리오 | Overlap | LLM Only (못 찾음) | DET Only (오탐) | Jaccard |
|----------|---------|-------------------|-----------------|---------|
| 전율미궁 | 4/16 | Historical Curse, National Tragedy, Period Piece, Social Commentary, Confucian Hierarchy, Buddhist Philosophy | Family Sacrifice, Twist Ending, Isolation/Confinement, Ensemble Investigation, Mentor-Student, Double Identity | 25% |
| 더킹 | 4/16 | Class Divide, Generational Conflict, Filial Duty, Underdog Hero, Sacrifice & Redemption, Revenge Drama | Courtroom, Gangster Saga, Ensemble Investigation, Political Thriller, Noraebang/Drinking Scene, Workplace Drama | 25% |
| 비트세비어 | 3/17 | Corporate Corruption, Undercover, Double Identity, Corruption Exposé, Twist Ending, Political Thriller, Class Divide | Folk Horror, Military Action, Han/Collective Grief, Workplace Drama, Isolation/Confinement, Dark Comedy, Father-Son Bond | 18% |

#### 근본 원인
1. **키워드 과매칭**: '가족', '희생', '아들' 같은 범용어가 Family Sacrifice/Father-Son Bond를 잘못 트리거
2. **키워드 부족**: '복수', '계층', '불평등' 등이 실제 시나리오 텍스트에서 빈도가 낮아 threshold(2)를 못 넘음
3. **오탐 키워드**: '수사', '형사', '사건' → Ensemble Investigation 트리거하지만 실제는 공포/범죄물의 일반적 요소
4. **장르별 키워드 가중치 없음**: 공포물에서 '귀신', '시체'는 Folk Horror가 아니라 단순 장르 요소

#### 교정 내용
- False positive 유발 범용 키워드 제거/강화
- 미감지 트로프별 키워드 클러스터 보강
- minimum threshold를 트로프별로 차등 적용 (범용 트로프 3+, 특수 트로프 2+)
- 장르 키워드와 트로프 키워드 분리 (장르 자체는 트로프가 아님)

---

### 3. ContentRating Engine — 검증 (Mock 비교 불가)

#### 현황
- LLM이 Mock이라 100% 일치는 무의미
- DET content counts: 전율미궁 V=101/P=11/S=5/D=13, 더킹 V=73/P=197/S=15/D=82, 비트세비어 V=99/P=10/S=2/D=13
- 더킹 P=197, D=82는 과다 (범죄 대화체에서 비속어/음주 키워드 과매칭 가능성)

#### 교정 내용
- 더킹 profanity/drug 과다 카운트 원인 분석 → 키워드 정밀도 개선
- 장르별 기대 등급: 전율미궁=15+/19+, 더킹=15+, 비트세비어=15+ → 현재 15+ 결과 유지 확인

---

## Ground Truth Fixture

3개 시나리오의 검증된 기대 결과를 `calibrationGroundTruth.ts`에 정의하여 자동 검증.

```typescript
// Groq LLM 결과 기반 Ground Truth
export const GROUND_TRUTH = {
  '전율미궁_귀신의집': {
    rating: { expected: '15+', tolerance: 1 },  // 15+ or 19+ 허용
    vfx: { expectedShots: 24, tolerancePercent: 30 },  // ±30%
    trope: { expected: ['Folk Horror', 'Shamanism', 'Historical Curse', 'National Tragedy', ...], minJaccard: 0.50 },
  },
  // ...
};
```

## 파일 변경

| 파일 | 변경 내용 |
|------|----------|
| `VFXEstimator.ts` | 공포/범죄 VFX 키워드 추가, false positive 제거, dialogue 지문 검사 |
| `TropeAnalyzer.ts` | 키워드 클러스터 보강, false positive 키워드 제거, threshold 차등화 |
| `ContentRatingClassifier.ts` | profanity/drug 과매칭 키워드 정밀도 개선 |
| `calibrationGroundTruth.ts` (신규) | Groq 기반 Ground Truth fixture |
| `calibrationRunner.ts` | Ground Truth 자동 비교 로직 추가 |

## 검증 기준

| 메트릭 | 현재 | 목표 |
|--------|------|------|
| Rating 일치율 | N/A (Mock) | 자체 검증 통과 |
| VFX hours 편차 | 150% | ≤50% |
| Trope Jaccard | 23% | ≥50% |
