## [명령 프롬프트] 할리우드 시나리오 평가 시스템 기능 개발
<task>
"LLM과 RAG 패턴을 활용하여 시나리오의 구조적 특징을 분석하고, 상업적 흥행 가능성을 정량적으로 평가하는 3대 핵심 엔진(Creative, Market, Production)을 개발하라"
</task>

<context>

입력 데이터: 할리우드 표준 포맷(Fountain/PDF)의 시나리오 텍스트.

핵심 기술: RAG(Retrieval-Augmented Generation), Vector Database(Pinecone/Milvus), LangChain, Python/FastAPI.

목표: 단순 텍스트 요약을 넘어, 과거 흥행작들의 '구조적 벡터(Structural Vectors)'와 비교 분석하여 데이터 기반의 의사결정 리포트 생성.
</context>

<constraints>

데이터 구조화: 시나리오를 '씬(Scene)' 단위로 파싱하고, 각 씬의 감정선, 비트(Beat), 등장인물을 태깅하여 Vector DB에 저장할 것.

RAG 엔진 최적화: 단순 검색이 아닌, '3막 구조'와 '영웅의 여정' 등 할리우드 작법 프레임워크를 기반으로 한 구조적 유사도 검색(Structural Similarity Search) 기능을 구현할 것.

정량적 채점 로직: * Creative: 3막 구조 터닝 포인트 위치의 정확도 계산 (±5% 오차 범위).

Market: 유사 장르 흥행작 대비 소재 신선도 및 트로프(Trope) 중복률 산출.

Production: 씬별 로케이션 및 등장인물 수를 기반으로 한 제작비 가중치 모델링.

보안: 시나리오 유출 방지를 위해 인프라 내 Private LLM 활용 또는 데이터 익명화 처리 프로세스 포함.
</constraints>

### 기능별 세부 개발 요건
1. 시나리오 파싱 및 벡터화 모듈 (Data Pipeline)
표준 시나리오 포맷의 지문(Action), 대사(Dialogue), 장면 전환(Slugline)을 구분하는 파서 개발.

각 장면의 감정 상태(Positive/Negative/Neutral)를 추출하여 '감정 아크(Emotional Arc)' 데이터 생성.

2. 구조적 유사도 분석 모듈 (RAG Engine)
입력된 시나리오의 '비트 시트(Beat Sheet)'를 생성하고, 이를 과거 1만 편의 흥행작 DB와 대조.

"이 작품의 2막 진입 시점은 <다크 나이트>와 유사한 긴장감을 형성함"과 같은 컨텍스트 기반 리포팅 구현.

3. 제작 타당성 추산 알고리즘 (Production Logic)
텍스트에서 EXT. (외부) / INT. (내부) 및 NIGHT / DAY 비중을 추출하여 조명 및 로케이션 비용 가중치 계산.

등장인물 간의 대화 빈도를 통해 조연 및 보조출연 규모 예측.