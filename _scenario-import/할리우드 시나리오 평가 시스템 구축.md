# **할리우드 시나리오 의사결정 지능 시스템(Script Intelligence System) 아키텍처 및 구축 프레임워크**

## **현대 영화 제작 환경의 데이터 중심 전환**

할리우드 영화 산업은 지난 한 세기 동안 제작자의 직관과 네트워크, 그리고 주관적인 예술적 심미안에 의존하여 대규모 자본을 투입해 왔다.1 그러나 2026년에 접어들면서 영화 산업은 단순한 생성형 AI의 열풍을 넘어, 데이터 기반의 확신을 바탕으로 프로젝트의 예산을 승인하는 '의사결정 지능(Decision Intelligence)'의 시대로 완전히 진입했다.2 이러한 변화는 스트리밍 전쟁의 심화와 극장 시장의 변동성 속에서 스튜디오 경영진이 리스크를 최소화하고 확실한 투자 수익률(ROI)을 확보하려는 경제적 요구에서 비롯되었다.2

과거에는 시나리오의 성공 가능성을 점치기 위해 수많은 '리더(Reader)'들이 주관적인 커버리지 보고서를 작성하고 이를 검토하는 데 수주일이 소요되었다.4 하지만 현대의 의사결정 시스템은 대규모 언어 모델(LLM)과 정밀한 예측 알고리즘을 결합하여 단 몇 분 만에 수천 권의 시나리오를 분석하고, 과거 1만 편 이상의 흥행작 패턴과 대조하여 정량적인 성공 지표를 산출한다.4 이러한 시스템 구축의 핵심은 시나리오라는 비정형 텍스트 데이터를 어떻게 컴퓨터가 이해할 수 있는 특징(Feature)으로 추출하고, 이를 할리우드의 비즈니스 로직과 결합하느냐에 달려 있다.6

| 분석 지표 | 전통적 방식 | 지능형 시스템 방식 |
| :---- | :---- | :---- |
| **분석 소요 시간** | 수일 \~ 수주일 | 약 5분 이내 |
| **비용 효율성** | 편당 약 $100 (인건비) | 편당 $29 \~ $59 (API 비용) |
| **데이터 객관성** | 독자의 주관 및 피로도에 영향 | 76만 편 이상의 DB 기반 객관적 벤치마킹 |
| **예측 정확도** | 경험적 추측 | 94% \~ 96%의 박스오피스 매출 예측 정확도 |

이 보고서에서는 파이썬(Python) 기반의 현대적 기술 스택을 활용하여 시나리오의 창의적 품질, 시장 경쟁력, 그리고 제작 실무의 타당성을 통합적으로 평가하는 엔드투엔드(End-to-End) 스크립트 지능 시스템 구축 가이드를 상세히 제시한다.7

## **타겟 플랫폼 벤치마킹: ScriptBook과 OnDesk**

본 시스템이 지향해야 할 구체적인 비즈니스 모델과 성능 목표를 위해 두 가지 선도적인 AI 대본 분석 플랫폼을 벤치마킹 대상으로 삼는다.

1. **ScriptBook (재무 예측 및 딥러닝 분석 강점)**
   - **핵심 가치**: 과거 흥행 데이터를 기반으로 ROI, 예상 박스오피스, 타겟 관객층, 관람 등급 등을 87% 이상의 정확도로 예측.
   - **기능적 특징**: 대본을 업로드하면 몇 분 내로 400개 이상의 파라미터를 분석, 소니 픽쳐스나 워너 브라더스 같은 대형 스튜디오에서 수천 건의 대본을 필터링하는 데 실제로 활용됨.
   - **시사점**: 우리 시스템의 '시장성 예측 엔진(Stage 3)'은 단순한 정성적 평가를 넘어 **투자 의사결정을 위한 구체적인 화폐 단위(USD) 추정치**를 제공해야 함을 보여줌.

2. **OnDesk (빠르고 일관된 스크립트 커버리지 및 보안 강점)**
   - **핵심 가치**: 기존에 150~300달러(수주 소요)가 들던 리더들의 커버리지 작업을 2~5분 내로 단축하여 로그라인, 시놉시스, 캐릭터 분석, 패스/고려/추천(Pass/Consider/Recommend) 등의 구조화된 피드백 제공.
   - **보안 중심 구조**: SOC 2 인증 및 사용자 데이터를 AI 학습에 사용하지 않는 철저한 보안 원칙으로 작가들의 지적재산권(IP) 우려 불식.
   - **시사점**: 우리 시스템의 '창의성 분석 엔진(Stage 2)' 역시 기존 리더들의 보고서 양식을 AI로 대체할 수 있는 직관적인 포맷을 갖춰야 하며, 독립적인 벡터 데이터베이스 운용을 통한 완벽한 **IP 보안 아키텍처**를 최우선으로 고려해야 함.

이처럼 ScriptBook의 '정밀한 재무 예측 기술'과 OnDesk의 '빠른 구조화 피드백 및 보안성'을 결합한 하이브리드 모델이 본 시스템의 최종 개발 목표이다.

## **데이터 파이프라인 구성 및 스크립트 파싱 표준화**

성공적인 지능형 시스템 구축의 첫 단계는 할리우드의 표준 시나리오 포맷을 정확히 인식하고 구조화된 데이터로 변환하는 파이프라인을 구축하는 것이다.9 영화 시나리오는 단순히 줄글로 된 텍스트가 아니라, 시간과 공간, 캐릭터의 행동과 대사가 엄격한 규칙에 따라 배치된 설계도와 같다.11

### **할리우드 표준 포맷의 기술적 이해**

할리우드 시나리오는 일반적으로 12포인트 Courier 글꼴을 사용하며, 1페이지가 실제 상영 시간 1분과 대응하도록 설계되어 있다.11 시스템이 시나리오 PDF를 파싱할 때 가장 중요한 것은 텍스트의 좌표(x, y) 값을 기반으로 각 요소의 의미를 파악하는 레이아웃 분석이다.13 예를 들어, 왼쪽 여백에서 1.5인치 떨어진 텍스트는 지문(Action)으로 간주되며, 중앙에 위치한 대문자 텍스트는 캐릭터 이름으로 인식된다.11

| 요소 (Element) | 왼쪽 여백 (인치) | 텍스트 너비 (인치) | 스타일 및 특징 |
| :---- | :---- | :---- | :---- |
| **장면 번호/헤딩** | 1.5 | 6.0 | INT./EXT.로 시작, 대문자 |
| **캐릭터 이름** | 3.7 | 3.3 | 항상 대문자, 대사 위에 위치 |
| **대사 (Dialogue)** | 2.5 | 3.3 | 캐릭터 이름 아래 배치 |
| **지문 (Action)** | 1.5 | 6.0 | 현재 시제 서술형 |
| **괄호 지문** | 3.1 | 2.0 | 캐릭터의 말투나 짧은 행동 지시 |

이러한 물리적 좌표 기반의 파싱은 PDF가 논리적 구조가 아닌 위치 정보만을 저장하기 때문에 발생하는 문제를 해결해 준다.14 파이썬 환경에서는 Jouvence나 Screenplay-Tools와 같은 라이브러리를 사용하여 Fountain 마크업이나 표준 PDF를 JSON 형태의 구조화된 객체로 변환할 수 있으며, 이를 통해 특정 캐릭터의 대사 비중이나 장면별 배경 정보(실내/실외, 낮/밤)를 자동으로 추출하게 된다.10

### **외부 데이터 소스의 통합 및 정제**

시나리오 자체의 텍스트 분석 결과에 생명력을 불어넣기 위해서는 실제 시장 데이터와의 결합이 필수적이다.18 AWS Data Exchange를 통해 IMDb 및 Box Office Mojo API에 접근하여 역대 영화의 제작비, 전 세계 매출, 출연진의 '스타 파워' 지수 등을 수집해야 한다.20 특히 1990년대 이후의 데이터를 중점적으로 수집하는 것이 현대 관객의 트렌드를 반영하는 데 유리하며, 전 세계 시장 분석을 위해 모든 통화 단위는 파이썬의 통화 변환 라이브러리를 통해 미국 달러(USD)로 표준화되어야 한다.22

추출된 데이터는 모델 학습 전에 철저한 전처리를 거치며, 상관관계 분석을 통해 매출과 통계적 유의미성(상관계수 \-0.2 \~ \+0.2 사이의 변수 제거)이 없는 특징들은 필터링하여 모델의 과적합을 방지한다.23

## **창의성 분석 엔진(Creative NLP Engine)의 설계**

창의성 분석 엔진은 시나리오의 내적 논리와 예술적 구조를 평가하는 시스템의 두뇌 역할을 한다.24 이는 단순한 요약을 넘어, 관객이 이야기를 따라가며 느끼는 감정의 기복과 서사적 완성도를 정량화한다.25

### **서사 구조 분석 및 비트 시트 추출**

전형적인 할리우드 상업 영화는 3막 구조(3-Act Structure)를 따르며, 특정 페이지 지점에서 핵심적인 터닝 포인트가 발생해야 한다.26 AI 에이전트는 시나리오를 세부 세그먼트로 분할하고 각 세그먼트의 감정적 톤을 분석하여 '보상', '긴장', '승리', '처벌' 등의 범주로 분류한다.25

분석 모델은 시나리오의 감정 곡선을 추출하여 커트 보네거트(Kurt Vonnegut)가 정의한 6대 주요 서사 아크 중 하나로 분류하게 된다:

1. **개천에서 용 나기(Rags to Riches):** 주인공의 운명이 지속적으로 상승함.  
2. **용에서 개천으로(Riches to Rags):** 주인공의 지속적인 몰락.  
3. **구덩이에 빠진 사람(Man in a Hole):** 일시적인 위기 후 다시 회복함.  
4. **이카루스(Icarus):** 급격한 상승 후 처참한 추락.  
5. **신데렐라(Cinderella):** 고난 후 개선을 거쳐 행복한 결말을 맞이함.  
6. **오이디푸스(Oedipus):** 일시적 행운 뒤에 예정된 운명적인 비극.25

이러한 서사 아크 분류는 장르 적합성을 판단하는 중요한 지표가 된다. 예를 들어, 전형적인 액션 스릴러가 서사 중반에 긴장감이 지나치게 늘어지는 '새깅(Sagging)' 현상을 보인다면, 시스템은 이를 구조적 결함으로 판단하여 수정을 권고하는 '비트 시트' 보고서를 생성한다.4

### **캐릭터 아크 및 관계망 분석**

캐릭터는 이야기의 정서적 동력을 제공하는 핵심 요소다.27 시스템은 개체명 인식(NER) 및 상호 참조 해결(Coreference Resolution) 기술을 활용하여 시나리오 내의 모든 캐릭터 출연 빈도와 대사 비중을 계산한다.27 특히 'Portrayal' 시스템과 같은 고급 분석 도구는 주인공의 목표, 감정 상태, 직업적 변화를 추적하여 캐릭터가 정적으로 머물러 있는지, 아니면 극의 흐름에 따라 유기적으로 변화하는지를 시각화한다.29

사회적 네트워크 분석(SNA) 기법을 적용하면 캐릭터 간의 역학 관계도 파악할 수 있다.28 캐릭터를 노드(Node)로, 대화나 동반 출연 장면을 엣지(Edge)로 설정한 그래프 모델을 통해 극의 중심인물을 자동으로 식별하고 조연 캐릭터들이 서사에서 적절한 역할을 수행하고 있는지 검토한다.28 이는 할리우드 시나리오의 성별 및 인종적 균형성(Representation Analysis)을 평가하는 도구로도 확장될 수 있어, 제작사가 최근의 사회적 트렌드에 부합하는 결정을 내리도록 돕는다.29

| 분석 항목 | 제공되는 정량 지표 | 서사적 영향력 |
| :---- | :---- | :---- |
| **감정적 극성 분석** | Sentiment Graph (0 \~ 1.0) | 장르적 기대치와의 부합도 확인 |
| **대사 일관성** | Distinct Voice Score | 캐릭터 간 말투의 중복 여부 감지 |
| **구조적 배치** | Turning Point Percentile | 3막 구조의 핵심 비트 발생 시점 체크 |
| **네트워크 중심성** | Eigenvector Centrality | 출연 시간 대비 서사적 지배력 측정 |

## **시장성 예측 엔진(Market Intelligence Engine)과 흥행 지표**

시장성 예측 엔진의 주된 목표는 시나리오라는 창의적 자산의 외부적 가치를 화폐 단위와 확률로 환산하는 것이다.18 이는 단순한 매출 예측을 넘어 유사 경쟁작과의 비교를 통해 전략적 위치를 설정하는 데 도움을 준다.5

### **예측 모델링과 투자 수익률(ROI) 산출**

성공적인 영화 제작을 위해 시스템은 XGBoost, 랜덤 포레스트(Random Forest), 그리고 양방향 LSTM(Bidirectional LSTM)과 같은 고성능 머신러닝 알고리즘을 앙상블하여 활용한다.1 모델은 제작비, 장르 조합, 상영 시간, 개봉 시기, 그리고 출연진의 과거 수익성 기록(Profit-Based Star Power) 등 19개 이상의 핵심 변수를 처리한다.1

특히 ROI 예측 모델은 단순히 총매출을 맞추는 것이 아니라, "성공"의 기준을 매출이 제작비의 최소 2배 이상인 경우로 정의하여 이진 분류를 수행한다.32

* **수익 기반 스타 파워(Profit-Based Star Power):** 단순히 배우의 인지도나 팔로워 수에 의존하지 않고, 해당 배우가 출연한 과거 작품들이 투입 자본 대비 얼마나 높은 수익을 창출했는지에 대한 역사적 기록을 수치화한다.23  
* **협업 역학(Collaboration Dynamics):** 특정 감독과 작가, 배우들의 조합이 과거에 보여준 시너지 효과와 특정 장르에 대한 전문성을 네트워크 지표로 산출하여 성공 확률에 반영한다.23  
* **주제적 분포(Plot Topic Distribution):** BERT 모델 등을 활용하여 시나리오의 주제적 유사성을 추출하고, 현재 글로벌 관객이 선호하는 주제(예: AI 윤리, 다중 우주, 기후 위기 등)와의 상관관계를 분석한다.23

| 모델 유형 | 주요 강점 | 보고된 정확도 지표 |
| :---- | :---- | :---- |
| **XGBoost** | 복합 데이터 및 이상치 처리에 대한 강건함 | 약 90.39% |
| **Bidirectional LSTM** | 시계열적 흐름 및 트렌드 포착 우수 | 높은 R²값 / 낮은 오차율 |
| **Random Forest** | 제작비, 상영 시간 등 특징별 중요도 파악 용이 | 약 88.57% |
| **Linear Regression** | 초기 박스오피스 매출 추정을 위한 기본 모델 | 65% \~ (변동성 큼) |

### **유사 사례 매칭(Trope Analysis) 및 벤치마킹**

제작사 결정권자들은 "이 영화가 어떤 영화와 닮았는가?"라는 질문을 가장 많이 던진다.4 시스템은 시나리오를 고차원 벡터 공간(Vector Space)으로 투영하여 유사한 서사 구조와 트로프(Trope, 자주 반복되는 창의적 장치)를 가진 흥행작을 검색한다.33 Pinecone이나 ScyllaDB와 같은 벡터 데이터베이스를 활용하여 코사인 유사도(Cosine Similarity)를 계산함으로써, "이 시나리오는 \<존 윅\>의 복수 테마와 \<인셉션\>의 복합적 구조가 7:3으로 결합된 형태"라는 구체적인 벤치마킹 리포트를 생성할 수 있다.33

'TrUMAn' 데이터셋과 같은 전문 트로프 데이터베이스를 활용하면 '안티히어로(Anti-Hero)', '출생의 비밀(Hidden Depths)' 등 시나리오의 핵심 모티프를 자동으로 식별하고, 해당 모티프가 과거 관객들에게 어떤 정서적 반응을 이끌어냈는지 예측한다.37

### **MPAA 등급 및 타겟 관객층 예측**

영화의 관람 등급은 잠재적 관객 규모를 결정짓는 핵심적인 비즈니스 변수다.39 G(전체 관람가)와 R(청소년 관람불가) 사이의 등급 차이는 마케팅 전략과 극장 확보 수에 결정적인 영향을 미친다.39 지능형 시스템은 시나리오 내의 텍스트 신호를 분석하여 MPAA(미국영화협회) 등급을 사전 예측한다:

1. **폭력 및 유혈성:** 폭력적인 동사와 신체 손상에 대한 묘사 빈도 측정.41  
2. **비속어 활용:** 특정 비속어 리스트와의 대조 및 대화 맥락 분석.39  
3. **약물 및 성적 묘사:** 약물 사용과 관련된 키워드 및 관능적 지문의 농도 평가.40

연구 결과에 따르면 선형 SVM(LSVC) 및 어텐션 기반 RNN 모델은 약 89%의 정확도로 시나리오의 연령 적합성을 분류해낸다.39 이를 통해 제작자는 제작 전 단계에서 단어 하나를 수정함으로써 R 등급을 피하고 PG-13 등급을 확보하여 타겟 관객층을 확장하는 전략적 의사결정을 내릴 수 있다.39

## **제작 피드백 엔진(Production Feasibility)의 자동화**

시나리오는 예술 작품이기도 하지만, 수백 명의 인력이 움직이는 제작 현장의 작업 지시서이기도 하다.45 제작 피드백 엔진은 시나리오의 텍스트를 물리적인 자원 요구사항으로 변환하여 실무적인 타당성을 검토한다.47

### **자동화된 스크립트 브레이크다운(Breakdown)**

전통적인 방식에서 조감독이나 라인 프로듀서가 시나리오를 한 줄씩 읽으며 출연진, 소품, 의상, 장소를 분석하는 데에는 최대 100시간이 소요되었다.49 하지만 AI 기반의 브레이크다운 기술(예: Filmustage)은 단 2분 만에 모든 제작 요소를 자동으로 태깅한다.47

시스템은 장면 헤더를 인식하여 실내/실외(INT/EXT) 구분과 장소 명칭을 추출하고, 이를 기반으로 총 필요 로케이션 수와 캐스팅 규모를 산출한다.47 또한, 'AI Dude'와 같은 생산성 에이전트는 장면 간의 이동 거리와 배우의 출연 일정을 고려하여 최적의 촬영 스케줄을 제안함으로써 '컴퍼니 무브' 비용을 최소화한다.47

### **제작비 추산 및 EBITDA 누수 방지**

제작비 추산은 시나리오에 묘사된 물리적 복잡성을 금액으로 환산하는 과정이다.2 특히 현대 영화에서 큰 비중을 차지하는 시각 효과(VFX)와 로케이션 비용에 대한 정밀한 분석이 필요하다.52

| VFX 복잡도 등급 | 예상 투입 시간 (컷당) | 주요 작업 사례 |
| :---- | :---- | :---- |
| **단순 (Tier 1\)** | 20 \~ 40 시간 | 와이어 제거, 가벼운 색보정, 단순 합성 |
| **중간 (Tier 2\)** | 40 \~ 80 시간 | 3D 에셋 삽입, 통합 FX, 트래킹 마커 처리 |
| **복잡 (Tier 3\)** | 80 \~ 200+ 시간 | 유체 시뮬레이션, 대규모 환경 구축, 크리처 작업 |

시스템은 지문을 분석하여 "거대한 폭발", "공중전", "외계 도시" 등 높은 비용을 유발하는 VFX 요구사항을 사전에 식별하여 Low/Likely/High 세 가지 범위의 예산을 산출한다.46 로케이션의 경우, 야외 촬영 장면이 감지되면 자동으로 날씨 변동에 따른 리스크 비용과 대체 실내 촬영 옵션을 제안하여 촬영 지연에 따른 예산 초과를 방지한다.46 또한, 노조 규정에 따른 연금 및 건강 보험 등 급여의 35%\~45%를 차지하는 '프린지(Fringe)' 비용을 자동으로 적용하여 실제 집행 가능한 예산안을 도출한다.54

## **계층적 RAG 패턴 및 멀티테넌시 보안 아키텍처**

시나리오 지능 시스템은 수만 단어에 달하는 장문의 텍스트를 처리해야 하며, 스튜디오별 지식재산권(IP) 보안을 완벽하게 보장해야 한다.55 이를 위해 단순한 LLM 호출이 아닌 계층적 RAG(Retrieval-Augmented Generation) 패턴과 엄격한 데이터 격리 구조가 요구된다.7

### **계층적 RAG를 통한 장문 시나리오 분석**

일반적인 RAG 모델은 시나리오 중앙 부분의 맥락을 놓치는 'Lost in the Middle' 문제에 직면할 수 있다.15 이를 해결하기 위해 시스템은 이단계 검색 프로세스를 수행한다 58:

1. **상위 수준 자동 검색(Top-Level Auto-Retrieval):** 시나리오 전체의 요약본, 메타데이터, 비트 시트를 먼저 검색하여 사용자 질문이 어느 막(Act)이나 장면에 해당하는지를 식별한다.58  
2. **재귀적 검색(Recursive Retrieval):** 식별된 특정 장면이나 페이지의 고해상도 텍스트 청크(Chunk)에 접근하여 정밀한 분석을 수행한다.58

이 과정에서 LlamaIndex의 IndexNode 기술을 활용하여 요약 노드가 원본 문서의 세부 파트로 연결되도록 설계하며, text-embedding-3-large와 같은 임베딩 모델을 사용하여 256\~512 토큰 단위로 의미적 경계를 유지하며 청킹을 수행한다.59

### **데이터 보안 및 멀티테넌시 구현**

할리우드에서 시나리오는 유출 시 수조 원의 피해를 줄 수 있는 극비 자산이다.62 따라서 서로 다른 제작사의 시나리오가 동일한 임베딩 공간에서 섞이는 것을 방지하기 위해 Pinecone의 **네임스페이스(Namespaces)** 기능을 활용한 멀티테넌시 아키텍처를 구축해야 한다.56

| 분리 전략 | 데이터 격리 수준 | 리소스 효율성 | 보안성 및 특징 |
| :---- | :---- | :---- | :---- |
| **개별 인덱스 분리** | 최상 (물리적 분리) | 낮음 (관리 비용 증가) | 완전한 물리적 격리가 필요한 경우 사용 |
| **네임스페이스 활용** | 높음 (논리적 파티션) | 높음 (공유 리소스 활용) | 스튜디오별 독립적 검색 공간 보장, 권장 방식 |
| **메타데이터 필터링** | 중간 (태그 기반) | 높음 | 검색 속도 저하 및 유출 가능성 존재 |

보안 강화를 위해 모든 API 요청은 제로 트러스트(Zero-Trust) 아키텍처를 기반으로 인증되어야 하며, SpiceDB와 같은 관계 기반 액세스 제어(ReBAC) 시스템을 도입하여 특정 프로젝트에 권한이 있는 제작 인원만 해당 시나리오 분석 결과에 접근할 수 있도록 설계한다.59 또한, VPC 내부에 벡터 DB를 배치하고 저장 시 암호화(Encryption at Rest)를 의무화하여 인프라 수준의 보안을 확보한다.65

## **단계별 구축 로드맵 및 운영 전략**

시나리오 지능 시스템의 구축은 기술적 완성도와 현업의 비즈니스 로직을 동기화하는 4단계 프로세스로 진행된다.2

### **1단계: 데이터 파이프라인 및 인프라 구축**

과거 할리우드 흥행작 1만 권 이상의 시나리오와 연계된 박스오피스 데이터를 수집한다.6 IMSDB 등에서 스크립트를 확보하고, 박스오피스 모조 API를 통해 재무 데이터를 매칭한다.20 수집된 텍스트는 표준화된 파싱 엔진을 거쳐 캐릭터, 대사, 지문이 분리된 전처리 데이터셋으로 저장된다.10

### **2단계: 특징 추출 및 벡터 인덱싱**

LLM을 활용하여 각 시나리오에서 서사 비트, 감정 곡선, 캐릭터 아크 정보를 추출한다.24 추출된 특징은 계층적 RAG 구조에 따라 벡터 DB(Pinecone)에 인덱싱되며, 유사도 검색을 위한 트로프 매핑 체계가 마련된다.7

### **3단계: 예측 모델 학습 및 고도화**

과거 데이터를 기반으로 성공과 실패를 결정짓는 핵심 패턴을 분류하는 머신러닝 모델을 구축한다.22 단순 매출 예측을 넘어 ROI, MPAA 등급, 타겟 데모그래픽 정보를 출력하는 다중 출력 모델(Multi-output Model)을 학습시킨다.23

### **4단계: 시각화 대시보드 및 의사결정 인터페이스**

제작사 결정권자가 직관적으로 이해할 수 있는 Next.js 기반의 웹 대시보드를 구축한다.47 대시보드에는 '흥행 지수(1-100)', '유사 작품 매칭 결과', 'VFX 기반 예상 예산', '캐릭터 매력도 차트' 등이 포함되어야 하며, 에이전트와 대화를 통해 시나리오 수정을 시뮬레이션할 수 있는 챗봇 인터페이스를 제공한다.4

## **결론: 창의성과 지능의 상보적 결합**

할리우드 시나리오 평가 시스템의 목적은 인간 작가의 창의성을 대체하는 것이 아니라, 창의적인 영감이 수천억 원 규모의 비즈니스로 성공적으로 전환될 수 있도록 객관적인 등대 역할을 수행하는 것이다.3 데이터 분석 결과 "흥행 지수가 낮다"는 결과가 나오더라도, 이는 프로젝트의 폐기를 의미하는 것이 아니라 어떤 구조적 보완이 필요한지에 대한 '지능적인 가이드'를 제공하는 것으로 해석되어야 한다.4

제작비 추산의 정확도를 높여 EBITDA 누수를 막고, 유사 사례 매칭을 통해 마케팅 타겟을 정교화하며, 계층적 RAG를 통해 장대한 서사 속의 숨겨진 보석을 발견하는 것은 현대 영화 산업에서 생존하기 위한 필수 역량이다.2 기술 스택의 견고함과 할리우드 비즈니스 로직에 대한 깊은 이해가 결합된 이 시스템은 향후 글로벌 OTT 및 스튜디오들의 그린라이트(Greenlight) 위원회에서 핵심적인 의사결정 파트너로 자리매김할 것이다.2 결국, 데이터로 증명된 확신 위에서 피어나는 예술이야말로 불확실한 현대 영화 시장에서 가장 강력한 무기가 될 것이다.

#### **참고 자료**

1. AI Revolutionizes Box Office Predictions \- Kvibe Studios, 3월 20, 2026에 액세스, [https://www.kvibe.com/post/ai-revolutionizes-box-office-predictions](https://www.kvibe.com/post/ai-revolutionizes-box-office-predictions)  
2. Hollywood Shifts Focus from Generative AI to Decision Intelligence \- AI FILMS Studio, 3월 20, 2026에 액세스, [https://studio.aifilms.ai/blog/hollywood-decision-intelligence-2026](https://studio.aifilms.ai/blog/hollywood-decision-intelligence-2026)  
3. Why AI Screenplay Editors Are Taking Over Hollywood in 2025 \- Laper, 3월 20, 2026에 액세스, [https://laper.ai/recent-highlights/2025-11-16-why-ai-screenplay-editors-are-taking-over](https://laper.ai/recent-highlights/2025-11-16-why-ai-screenplay-editors-are-taking-over)  
4. AI Script Analysis ROI for Studio Executives: Faster Development ..., 3월 20, 2026에 액세스, [https://www.prescene.ai/blog/calculating-roi-for-studios](https://www.prescene.ai/blog/calculating-roi-for-studios)  
5. How AI Predicts Box Office Success from Scripts \- AIScriptReader, 3월 20, 2026에 액세스, [https://aiscriptreader.com/blog/filmmaking-innovations/how-ai-predicts-box-office-success-from-scripts](https://aiscriptreader.com/blog/filmmaking-innovations/how-ai-predicts-box-office-success-from-scripts)  
6. Movie's box office performance prediction \- CORE, 3월 20, 2026에 액세스, [https://files01.core.ac.uk/download/303774153.pdf](https://files01.core.ac.uk/download/303774153.pdf)  
7. Building Smarter AI Pipelines with LangChain, RAG and Hierarchical LLMs \- Nitor Infotech, 3월 20, 2026에 액세스, [https://www.nitorinfotech.com/blog/building-smarter-ai-pipelines-with-langchain-rag-and-hierarchical-llms/](https://www.nitorinfotech.com/blog/building-smarter-ai-pipelines-with-langchain-rag-and-hierarchical-llms/)  
8. World's Most Accurate RAG? Langchain/Pinecone, LlamaIndex and EyeLevel Duke it Out, 3월 20, 2026에 액세스, [https://www.eyelevel.ai/post/most-accurate-rag](https://www.eyelevel.ai/post/most-accurate-rag)  
9. Syntax \- Fountain, 3월 20, 2026에 액세스, [https://fountain.io/syntax/](https://fountain.io/syntax/)  
10. wildwinter/screenplay-tools: Multi-language utils for representing a screenplay, including parsing and writing the Fountain scriptwriting format and the Final Draft (FDX) format. \- GitHub, 3월 20, 2026에 액세스, [https://github.com/wildwinter/screenplay-tools](https://github.com/wildwinter/screenplay-tools)  
11. How to Format a Screenplay \- JotterPad, 3월 20, 2026에 액세스, [https://jotterpad.app/how-to-format-a-screenplay/](https://jotterpad.app/how-to-format-a-screenplay/)  
12. Screenplay Format Guide by Story Sense®, 3월 20, 2026에 액세스, [https://www.storysense.com/spformat.pdf](https://www.storysense.com/spformat.pdf)  
13. richardmrodriguez/screenplay-doc-parser: Library for parsing a screenplay-formatted PDF into a semantically-typed object. \- GitHub, 3월 20, 2026에 액세스, [https://github.com/richardmrodriguez/screenplay-doc-parser](https://github.com/richardmrodriguez/screenplay-doc-parser)  
14. How to Parse a PDF, Part 1 \- Unstructured, 3월 20, 2026에 액세스, [https://unstructured.io/blog/how-to-parse-a-pdf-part-1](https://unstructured.io/blog/how-to-parse-a-pdf-part-1)  
15. PDF Parsing Guide: Extract Sections & Tables \- LlamaIndex, 3월 20, 2026에 액세스, [https://www.llamaindex.ai/blog/mastering-pdfs-extracting-sections-headings-paragraphs-and-tables-with-cutting-edge-parser-faea18870125](https://www.llamaindex.ai/blog/mastering-pdfs-extracting-sections-headings-paragraphs-and-tables-with-cutting-edge-parser-faea18870125)  
16. Jouvence · PyPI, 3월 20, 2026에 액세스, [https://pypi.org/project/Jouvence/](https://pypi.org/project/Jouvence/)  
17. Fountain Movie Script Parser — JavaScript, Python, C\#, C++ | by Ian Thomas \- Medium, 3월 20, 2026에 액세스, [https://wildwinter.medium.com/fountain-movie-script-parser-javascript-python-c-c-ca088d63d298](https://wildwinter.medium.com/fountain-movie-script-parser-javascript-python-c-c-ca088d63d298)  
18. Movie Box Office Revenue Prediction using Python \+ NLP | by Janaki Ram | Medium, 3월 20, 2026에 액세스, [https://medium.com/@ramvipers777/movie-box-office-revenue-prediction-using-python-nlp-fc632955c637](https://medium.com/@ramvipers777/movie-box-office-revenue-prediction-using-python-nlp-fc632955c637)  
19. Early Predictions of Movie Success: the Who, What, and When of Profitability arXiv:1506.05382v2 \[cs.AI\] 29 Jan 2016, 3월 20, 2026에 액세스, [https://arxiv.org/pdf/1506.05382](https://arxiv.org/pdf/1506.05382)  
20. Getting Access to the API \- IMDb Developer, 3월 20, 2026에 액세스, [https://developer.imdb.com/documentation/api-documentation/getting-access/](https://developer.imdb.com/documentation/api-documentation/getting-access/)  
21. AWS Marketplace: IMDb and Box Office Mojo for Movies/TV/OTT (API) \- Amazon.com, 3월 20, 2026에 액세스, [https://aws.amazon.com/marketplace/pp/prodview-nzspap6vaousm](https://aws.amazon.com/marketplace/pp/prodview-nzspap6vaousm)  
22. Research : Movie Success Prediction Using ML \- Great Learning, 3월 20, 2026에 액세스, [https://www.mygreatlearning.com/blog/movie-success-prediction-using-ml/](https://www.mygreatlearning.com/blog/movie-success-prediction-using-ml/)  
23. Journal of Artificial Intelligence, Machine Learning and Data Science \- urfjournals.org — Virtualmin, 3월 20, 2026에 액세스, [https://urfjournals.org/open-access/predictive-analytics-for-box-office-success.pdf](https://urfjournals.org/open-access/predictive-analytics-for-box-office-success.pdf)  
24. How to Use AI in Screenwriting Ethically \- Script Reader Pro, 3월 20, 2026에 액세스, [https://www.scriptreaderpro.com/use-ai-in-screenwriting-ethically/](https://www.scriptreaderpro.com/use-ai-in-screenwriting-ethically/)  
25. Three Stage Narrative Analysis; Plot-Sentiment Breakdown, Structure Learning and Concept Detection \- arXiv.org, 3월 20, 2026에 액세스, [https://arxiv.org/html/2511.11857v1](https://arxiv.org/html/2511.11857v1)  
26. undefined \- AIScriptReader, 3월 20, 2026에 액세스, [https://aiscriptreader.com/blog/filmmaking-innovations/top-metrics-ai-uses-to-evaluate-screenplays](https://aiscriptreader.com/blog/filmmaking-innovations/top-metrics-ai-uses-to-evaluate-screenplays)  
27. CHARACTER ATTRIBUTE EXTRACTION FROM MOVIE SCRIPTS USING LLMS Sabyasachee Baruah, Shrikanth Narayanan Signal Analysis and Interpr \- IEEE SigPort, 3월 20, 2026에 액세스, [https://sigport.org/sites/default/files/docs/ICASSP\_2024%20%281%29.pdf](https://sigport.org/sites/default/files/docs/ICASSP_2024%20%281%29.pdf)  
28. Network mining of character relationships in novels and algorithm for shaping character relationships in TV dramas \- Learning Gate, 3월 20, 2026에 액세스, [https://learning-gate.com/index.php/2576-8484/article/download/7709/2643/10391](https://learning-gate.com/index.php/2576-8484/article/download/7709/2643/10391)  
29. How AI Analyzes Character Representation in Scripts \- AIScriptReader, 3월 20, 2026에 액세스, [https://aiscriptreader.com/blog/filmmaking-innovations/how-ai-analyzes-character-representation-in-scripts](https://aiscriptreader.com/blog/filmmaking-innovations/how-ai-analyzes-character-representation-in-scripts)  
30. How to Use AI for Film Script Analysis and Selection \- ProfileTree, 3월 20, 2026에 액세스, [https://profiletree.com/ai-for-film-script-analysis/](https://profiletree.com/ai-for-film-script-analysis/)  
31. Predicting Movie Box Office Based on Machine Learning, Deep Learning, and Statistical Methods \- ResearchGate, 3월 20, 2026에 액세스, [https://www.researchgate.net/publication/385334208\_Predicting\_Movie\_Box\_Office\_Based\_on\_Machine\_Learning\_Deep\_Learning\_and\_Statistical\_Methods](https://www.researchgate.net/publication/385334208_Predicting_Movie_Box_Office_Based_on_Machine_Learning_Deep_Learning_and_Statistical_Methods)  
32. Predicting Box Office Success with Machine Learning: Can Data Tell If a Movie Will Be a Hit? | by Shrish Sharma | Medium, 3월 20, 2026에 액세스, [https://medium.com/@shsh6015/predicting-box-office-success-with-machine-learning-can-data-tell-if-a-movie-will-be-a-hit-b15dfd96ac77](https://medium.com/@shsh6015/predicting-box-office-success-with-machine-learning-can-data-tell-if-a-movie-will-be-a-hit-b15dfd96ac77)  
33. Building a Movie Recommendation App with ScyllaDB Vector Search, 3월 20, 2026에 액세스, [https://www.scylladb.com/2025/10/21/building-a-movie-recommendation-app-with-scylladb-vector-search/](https://www.scylladb.com/2025/10/21/building-a-movie-recommendation-app-with-scylladb-vector-search/)  
34. Building a Movie Recommendation System: My Journey with Vectors | by Kenazjose, 3월 20, 2026에 액세스, [https://medium.com/@kenazjose007/building-a-movie-recommendation-system-my-journey-with-vectors-37fc83c7004e](https://medium.com/@kenazjose007/building-a-movie-recommendation-system-my-journey-with-vectors-37fc83c7004e)  
35. Vector Similarity-Recommender Movies System \- Kaggle, 3월 20, 2026에 액세스, [https://www.kaggle.com/code/zeyneloglum/vector-similarity-recommender-movies-system](https://www.kaggle.com/code/zeyneloglum/vector-similarity-recommender-movies-system)  
36. A Content-based Movie Recommendation System \- Semantic Scholar, 3월 20, 2026에 액세스, [https://pdfs.semanticscholar.org/0867/a1435be045f1bc636709296856444d8f6a36.pdf](https://pdfs.semanticscholar.org/0867/a1435be045f1bc636709296856444d8f6a36.pdf)  
37. (PDF) TrUMAn: Trope Understanding in Movies and Animations \- ResearchGate, 3월 20, 2026에 액세스, [https://www.researchgate.net/publication/353819435\_TrUMAn\_Trope\_Understanding\_in\_Movies\_and\_Animations](https://www.researchgate.net/publication/353819435_TrUMAn_Trope_Understanding_in_Movies_and_Animations)  
38. Chatter: A Character Attribution Dataset for Narrative Understanding \- arXiv.org, 3월 20, 2026에 액세스, [https://arxiv.org/html/2411.05227v2](https://arxiv.org/html/2411.05227v2)  
39. Prediction of Motion Picture Association of America Ratings Using Emotion Analysis and Text Classification Approaches \- http, 3월 20, 2026에 액세스, [http://arno.uvt.nl/show.cgi?fid=157412](http://arno.uvt.nl/show.cgi?fid=157412)  
40. MPAA Rating System | High Point, NC, 3월 20, 2026에 액세스, [https://www.highpointnc.gov/993/MPAA-Rating-System](https://www.highpointnc.gov/993/MPAA-Rating-System)  
41. Using Artificial Intelligence to Predict Violence in Movies \- USC Viterbi, 3월 20, 2026에 액세스, [https://viterbischool.usc.edu/news/2019/03/using-artificial-intelligence-to-predict-violence-in-movies/](https://viterbischool.usc.edu/news/2019/03/using-artificial-intelligence-to-predict-violence-in-movies/)  
42. Age Suitability Rating: Predicting the MPAA Rating Based on Movie Dialogues \- ACL Anthology, 3월 20, 2026에 액세스, [https://aclanthology.org/2020.lrec-1.166.pdf](https://aclanthology.org/2020.lrec-1.166.pdf)  
43. A look at sex, drugs, violence, and cursing in film over time through MPAA ratings, 3월 20, 2026에 액세스, [https://www.randalolson.com/2014/01/12/a-look-at-sex-drugs-violence-and-cursing-in-film-over-time-through-mpaa-ratings/](https://www.randalolson.com/2014/01/12/a-look-at-sex-drugs-violence-and-cursing-in-film-over-time-through-mpaa-ratings/)  
44. Age Suitability Rating: Predicting the MPAA Rating Based on Movie Dialogues, 3월 20, 2026에 액세스, [https://www.semanticscholar.org/paper/Age-Suitability-Rating%3A-Predicting-the-MPAA-Rating-Shafaei-Samghabadi/ed8643b5544f5ed3e1e81d49d99f72b9b7765247](https://www.semanticscholar.org/paper/Age-Suitability-Rating%3A-Predicting-the-MPAA-Rating-Shafaei-Samghabadi/ed8643b5544f5ed3e1e81d49d99f72b9b7765247)  
45. The Complete Guide to Script Breakdown: Master the Art of Film Pre-Production Planning, 3월 20, 2026에 액세스, [https://firstdraftfilmworks.com/blog/the-complete-guide-to-script-breakdown/](https://firstdraftfilmworks.com/blog/the-complete-guide-to-script-breakdown/)  
46. Using Script Breakdown to Enhance Budget Accuracy \- Filmustage ..., 3월 20, 2026에 액세스, [https://filmustage.com/blog/using-script-breakdown-to-enhance-budget-accuracy/](https://filmustage.com/blog/using-script-breakdown-to-enhance-budget-accuracy/)  
47. Filmustage: AI Pre-Production Assistant for Filmmakers & Studios, 3월 20, 2026에 액세스, [https://filmustage.com/](https://filmustage.com/)  
48. Script Breakdown Software & AI Screenplay Breakdown Tool | Studiovity, 3월 20, 2026에 액세스, [https://studiovity.com/script-breakdown-software/](https://studiovity.com/script-breakdown-software/)  
49. Automate Script Breakdown with AI: Save Time & Costs \- Filmustage, 3월 20, 2026에 액세스, [https://filmustage.com/script-breakdown/](https://filmustage.com/script-breakdown/)  
50. Script Breakdown Mastery: Techniques That Save Production Time and Budget \- Blooper.ai, 3월 20, 2026에 액세스, [https://blooper.ai/blog/script-breakdown-mastery-techniques-that-save-production-time-and-budget](https://blooper.ai/blog/script-breakdown-mastery-techniques-that-save-production-time-and-budget)  
51. Film and TV Production Budget Estimation with AI | by Dylan Nikol | Medium, 3월 20, 2026에 액세스, [https://medium.com/@dylan\_nikol/film-and-tv-production-budget-estimation-with-ai-ccd335079a56](https://medium.com/@dylan_nikol/film-and-tv-production-budget-estimation-with-ai-ccd335079a56)  
52. How VFX Breakdowns Can Cut Film Production Costs \- Filmustage Blog, 3월 20, 2026에 액세스, [https://filmustage.com/blog/how-vfx-breakdowns-can-cut-film-production-costs/](https://filmustage.com/blog/how-vfx-breakdowns-can-cut-film-production-costs/)  
53. VFX Bidding & Planning — Without Guesswork \- Filmustage, 3월 20, 2026에 액세스, [https://filmustage.com/vfx-breakdown/](https://filmustage.com/vfx-breakdown/)  
54. Film Budget 101: Key Principles for Production Success (2026) \- Saturation.io, 3월 20, 2026에 액세스, [https://saturation.io/blog/film-budget-101-the-key-to-successful-film-production](https://saturation.io/blog/film-budget-101-the-key-to-successful-film-production)  
55. CHATTER: A Character Attribution Dataset for Narrative Understanding \- ResearchGate, 3월 20, 2026에 액세스, [https://www.researchgate.net/publication/385701227\_CHATTER\_A\_Character\_Attribution\_Dataset\_for\_Narrative\_Understanding](https://www.researchgate.net/publication/385701227_CHATTER_A_Character_Attribution_Dataset_for_Narrative_Understanding)  
56. Multitenancy and namespaces | Python \- DataCamp, 3월 20, 2026에 액세스, [https://campus.datacamp.com/courses/vector-databases-for-embeddings-with-pinecone/performance-tuning-and-ai-applications?ex=5](https://campus.datacamp.com/courses/vector-databases-for-embeddings-with-pinecone/performance-tuning-and-ai-applications?ex=5)  
57. Implement multitenancy \- Pinecone Docs, 3월 20, 2026에 액세스, [https://docs.pinecone.io/guides/index-data/implement-multitenancy](https://docs.pinecone.io/guides/index-data/implement-multitenancy)  
58. Structured Hierarchical Retrieval | LlamaIndex OSS Documentation \- LlamaParse, 3월 20, 2026에 액세스, [https://developers.llamaindex.ai/python/examples/query\_engine/multi\_doc\_auto\_retrieval/multi\_doc\_auto\_retrieval/](https://developers.llamaindex.ai/python/examples/query_engine/multi_doc_auto_retrieval/multi_doc_auto_retrieval/)  
59. RAG with Access Control | Pinecone, 3월 20, 2026에 액세스, [https://www.pinecone.io/learn/rag-access-control/](https://www.pinecone.io/learn/rag-access-control/)  
60. LlamaIndex \- Pinecone Docs, 3월 20, 2026에 액세스, [https://docs.pinecone.io/integrations/llamaindex](https://docs.pinecone.io/integrations/llamaindex)  
61. Best Chunking Strategies for RAG (and LLMs) in 2026 \- Firecrawl, 3월 20, 2026에 액세스, [https://www.firecrawl.dev/blog/best-chunking-strategies-rag](https://www.firecrawl.dev/blog/best-chunking-strategies-rag)  
62. Multi-Tenancy in Vector Databases | Pinecone, 3월 20, 2026에 액세스, [https://www.pinecone.io/learn/series/vector-databases-in-production-for-busy-engineers/vector-database-multi-tenancy/](https://www.pinecone.io/learn/series/vector-databases-in-production-for-busy-engineers/vector-database-multi-tenancy/)  
63. Scaling RAG Application to Production \- Multi-tenant Architecture Questions \- Reddit, 3월 20, 2026에 액세스, [https://www.reddit.com/r/Rag/comments/1n21nq1/scaling\_rag\_application\_to\_production\_multitenant/](https://www.reddit.com/r/Rag/comments/1n21nq1/scaling_rag_application_to_production_multitenant/)  
64. IT Security Architecture: Frameworks & Best Practices \- Keystone Technology Consultants, 3월 20, 2026에 액세스, [https://keystonecorp.com/cybersecurity/it-security-architecture-frameworks-best-practices-phases/](https://keystonecorp.com/cybersecurity/it-security-architecture-frameworks-best-practices-phases/)  
65. Enterprise AI, Secured: Rubrik Annapurna and Pinecone Deliver a Smarter RAG Stack, 3월 20, 2026에 액세스, [https://www.rubrik.com/blog/company/25/enterprise-ai-secured-rubrik-annapurna-and-pinecone-deliver-a-smarter-rag-stack](https://www.rubrik.com/blog/company/25/enterprise-ai-secured-rubrik-annapurna-and-pinecone-deliver-a-smarter-rag-stack)  
66. AI Security Reference Architectures Secure design patterns & practices for teams developing LLM-powered applications \- AI Governance Library, 3월 20, 2026에 액세스, [https://www.aigl.blog/ai-security-reference-architectures-secure-design-patterns-practices-for-teams-developing-llm-powered-applications/](https://www.aigl.blog/ai-security-reference-architectures-secure-design-patterns-practices-for-teams-developing-llm-powered-applications/)  
67. Film Budgeting Software With Auto-Generated Template \- Filmustage, 3월 20, 2026에 액세스, [https://filmustage.com/budgeting/](https://filmustage.com/budgeting/)  
68. Analysis | Slated, 3월 20, 2026에 액세스, [https://get.slated.com/analysis/](https://get.slated.com/analysis/)

***할리우드 시나리오 분석의 핵심 지표 설정***

*단순한 텍스트 요약을 넘어 시나리오의 구조적 완성도와 상업적 가치를 동시에 평가하기 위한 다각도 분석 체계를 구상하고 있습니다. 특히 3막 구조의 전환점(Turning Point)이 적절한 시점에 배치되었는지 확인하는 '비트 시트(Beat Sheet)' 추출 기술과 캐릭터의 감정 변화를 수치화하는 정밀 NLP 방법론을 검토 중입니다. 이는 창의적 영역인 대본을 데이터 기반의 객관적 지표로 변환하는 핵심 과정이 될 것입니다.*

***시장성 예측 및 제작비 산출 모델 구체화***

*과거 할리우드 박스오피스 기록과 시나리오 데이터를 결합하여 흥행 수익(ROI)과 관람 등급을 예측하는 머신러닝 아키텍처를 설계하고 있습니다. 단순히 유사한 장르를 찾는 것에 그치지 않고, 시나리오 내에 등장하는 배경 장소의 수, 시각 효과(VFX)의 난이도, 출연진 규모 등을 텍스트에서 자동으로 식별하여 실제 제작 예산을 추산하는 정교한 프레임워크를 수립하는 데 집중하고 있습니다.*

***데이터 확보 및 기술적 구현 경로 탐색***

*신뢰도 높은 분석을 위해 대규모 시나리오 데이터베이스와 박스오피스 데이터를 연동하는 파이프라인 구축 방안을 살피고 있습니다. 앞으로는 표준 시나리오 포맷(Fountain, PDF)을 구조화된 데이터로 변환하는 최적의 파이썬 라이브러리를 탐색하고, 긴 텍스트를 효율적으로 처리하기 위한 계층적 RAG(검색 증강 생성) 기술 및 보안이 강화된 벡터 데이터베이스 활용 전략을 구체화할 계획입니다.*

***Researching websites...***

[files01.core.ac.uk](https://files01.core.ac.uk/download/303774153.pdf)

[Movie's box office performance prediction \- CORE](https://files01.core.ac.uk/download/303774153.pdf)

[laper.ai](https://laper.ai/recent-highlights/2025-11-16-why-ai-screenplay-editors-are-taking-over)

[Why AI Screenplay Editors Are Taking Over Hollywood in 2025 \- Laper](https://laper.ai/recent-highlights/2025-11-16-why-ai-screenplay-editors-are-taking-over)

[studio.aifilms.ai](https://studio.aifilms.ai/blog/hollywood-decision-intelligence-2026)

[Hollywood Shifts Focus from Generative AI to Decision Intelligence \- AI FILMS Studio](https://studio.aifilms.ai/blog/hollywood-decision-intelligence-2026)

[kvibe.com](https://www.kvibe.com/post/ai-revolutionizes-box-office-predictions)

[AI Revolutionizes Box Office Predictions \- Kvibe Studios](https://www.kvibe.com/post/ai-revolutionizes-box-office-predictions)

[prescene.ai](https://www.prescene.ai/blog/calculating-roi-for-studios)

[AI Script Analysis ROI for Studio Executives: Faster Development, Lower Costs, Better Greenlights \- Prescene](https://www.prescene.ai/blog/calculating-roi-for-studios)

[developer.imdb.com](https://developer.imdb.com/documentation/api-documentation/getting-access/)

[Getting Access to the API \- IMDb Developer](https://developer.imdb.com/documentation/api-documentation/getting-access/)

[scrapingbee.com](https://www.scrapingbee.com/scrapers/imdb-scraper-api/)

[Imdb Scraper API \- Easy Signup & Free Credits \- ScrapingBee](https://www.scrapingbee.com/scrapers/imdb-scraper-api/)

[apify.com](https://apify.com/urban_quidnunc/imdb-box-office-scraper)

[IMDB Box Office Scraper \- Apify](https://apify.com/urban_quidnunc/imdb-box-office-scraper)

[automatio.ai](https://automatio.ai/how-to-scrape/imdb)

[How to Scrape IMDb: The Complete Guide to Movie Data Extraction \- Automatio AI](https://automatio.ai/how-to-scrape/imdb)

[aws.amazon.com](https://aws.amazon.com/marketplace/pp/prodview-nzspap6vaousm)

[AWS Marketplace: IMDb and Box Office Mojo for Movies/TV/OTT (API) \- Amazon.com](https://aws.amazon.com/marketplace/pp/prodview-nzspap6vaousm)

[pypi.org](https://pypi.org/project/Jouvence/)

[Jouvence · PyPI](https://pypi.org/project/Jouvence/)

[github.com](https://github.com/Ovid/fountain-parser)

[Ovid/fountain-parser: A parser for the Fountain screenplay format \- GitHub](https://github.com/Ovid/fountain-parser)

[wildwinter.medium.com](https://wildwinter.medium.com/screenplay-tools-c7ed8d0a4da9)

[Screenplay Tools \- Ian Thomas](https://wildwinter.medium.com/screenplay-tools-c7ed8d0a4da9)

[github.com](https://github.com/ludovicchabant/Jouvence)

[ludovicchabant/Jouvence: A library for parsing and rendering Fountain screenplays. \- GitHub](https://github.com/ludovicchabant/Jouvence)

[fountain.io](https://fountain.io/apps/)

[Fountain apps](https://fountain.io/apps/)

[scriptreaderpro.com](https://www.scriptreaderpro.com/use-ai-in-screenwriting-ethically/)

[How to Use AI in Screenwriting Ethically \- Script Reader Pro](https://www.scriptreaderpro.com/use-ai-in-screenwriting-ethically/)

[arxiv.org](https://arxiv.org/html/2503.04817v1)

[Multi-Agent System for AI-Assisted Extraction of Narrative Arcs in TV Series \- arXiv](https://arxiv.org/html/2503.04817v1)

[simalabs.ai](https://www.simalabs.ai/resources/ai-script-analysis-storyboarding-tools-2025-filmmakers)

[5 AI Script Analysis & Storyboarding Tools That Give Filmmakers a Creative Edge](https://www.simalabs.ai/resources/ai-script-analysis-storyboarding-tools-2025-filmmakers)

[aiscriptreader.com](https://aiscriptreader.com/blog/filmmaking-innovations/how-ai-analyzes-character-representation-in-scripts)

[How AI Analyzes Character Representation in Scripts \- AIScriptReader](https://aiscriptreader.com/blog/filmmaking-innovations/how-ai-analyzes-character-representation-in-scripts)

[mygreatlearning.com](https://www.mygreatlearning.com/blog/movie-success-prediction-using-ml/)

[Research : Movie Success Prediction Using ML \- Great Learning](https://www.mygreatlearning.com/blog/movie-success-prediction-using-ml/)

[zenodo.org](https://zenodo.org/record/6938169/files/Movie%20Box%20Office%20Success%20Prediction%20using%20Machine%20Learning.pdf)

[Movie Box Office Success Prediction using Machine Learning \- Zenodo](https://zenodo.org/record/6938169/files/Movie%20Box%20Office%20Success%20Prediction%20using%20Machine%20Learning.pdf)

[cs229.stanford.edu](https://cs229.stanford.edu/proj2016/report/PengdaLiu-MachineLearningOnPredictingGrossBoxOffice-report.pdf)

[Machine learning on predicting gross box office](https://cs229.stanford.edu/proj2016/report/PengdaLiu-MachineLearningOnPredictingGrossBoxOffice-report.pdf)

[researchgate.net](https://www.researchgate.net/publication/385334208_Predicting_Movie_Box_Office_Based_on_Machine_Learning_Deep_Learning_and_Statistical_Methods)

[Predicting Movie Box Office Based on Machine Learning, Deep Learning, and Statistical Methods \- ResearchGate](https://www.researchgate.net/publication/385334208_Predicting_Movie_Box_Office_Based_on_Machine_Learning_Deep_Learning_and_Statistical_Methods)

[medium.com](https://medium.com/@shsh6015/predicting-box-office-success-with-machine-learning-can-data-tell-if-a-movie-will-be-a-hit-b15dfd96ac77)

[Predicting Box Office Success with Machine Learning: Can Data Tell If a Movie Will Be a Hit? | by Shrish Sharma | Medium](https://medium.com/@shsh6015/predicting-box-office-success-with-machine-learning-can-data-tell-if-a-movie-will-be-a-hit-b15dfd96ac77)

***헐리우드 의사결정 인텔리전스의 최신 동향 포착***

*단순한 텍스트 생성을 넘어, 프로젝트의 자금 조달 여부를 결정하는 '의사결정 인텔리전스(Decision Intelligence)'가 헐리우드 스튜디오의 핵심 우선순위로 급부상하고 있음을 확인했습니다. 2026년 상반기 기준으로 주요 제작사들은 흥행 수익 예측 정확도를 90% 이상으로 끌어올린 분석 플랫폼을 그린라이트(제작 승인) 위원회에 통합하고 있습니다. 저는 이러한 흐름을 반영하여 시나리오의 창의적 속성과 비즈니스 리스크를 동시에 관리할 수 있는 통합 시스템 구조를 정교화하고 있습니다.*

***데이터 기반의 다각적 흥행 예측 지표 분석***

*과거 20년 치의 박스오피스 데이터와 시나리오 텍스트를 결합하여 흥행 가능성을 수치화하는 구체적인 머신러닝 방법론을 도출했습니다. 특히 출연진의 소셜 미디어 영향력, 장르별 트렌드 적합성, 그리고 '세이브 더 캣(Save the Cat)'과 같은 표준 구조의 준수 여부를 포함한 19가지 핵심 변수를 추출하여 분석하는 체계를 검토 중입니다. 단순한 감성 분석을 넘어 XGBoost나 양방향 LSTM과 같은 모델을 활용해 복합적인 시장 반응을 예측하는 논리적 기반을 강화하고 있습니다.*

***실무 중심의 제작 비용 및 ROI 산출 로직 수립***

*시나리오 내 지문에서 배경 장소(Location)의 개수와 시각 효과(VFX)의 강도를 식별하여 예산 초과 위험을 사전에 경고하는 '스크립트 오딧(Script Audit)' 기술의 실효성을 확인했습니다. 앞으로는 표준 PDF 및 Fountain 포맷의 스크립트에서 장면 번호와 대사를 정밀하게 분리해내는 파싱 기술을 심화 탐구할 예정입니다. 또한, 대본의 행동 지문 대 대사 비율(Action-to-Dialogue ratio)이나 캐릭터의 감정 변동성 등을 독립적인 데이터 피처로 변환하여 제작비 대비 수익률(ROI)을 더욱 정밀하게 추산하는 액션 플랜을 실행할 것입니다.*

***Researching websites...***

[filmustage.com](https://filmustage.com/)

[Filmustage: AI Pre-Production Assistant for Filmmakers & Studios](https://filmustage.com/)

[filmustage.com](https://filmustage.com/budgeting/)

[Film Budgeting Software With Auto-Generated Template \- Filmustage](https://filmustage.com/budgeting/)

[shamelstudio.com](https://www.shamelstudio.com/products/budgeting)

[Film & TV Budgeting Software \- Shamel Studio](https://www.shamelstudio.com/products/budgeting)

[medium.com](https://medium.com/@dylan_nikol/film-and-tv-production-budget-estimation-with-ai-ccd335079a56)

[Film and TV Production Budget Estimation with AI | by Dylan Nikol | Medium](https://medium.com/@dylan_nikol/film-and-tv-production-budget-estimation-with-ai-ccd335079a56)

[medium.com](https://medium.com/@rivet.ai/from-script-to-funding-with-automated-film-budgets-c105005c8fd8)

[From Script to Funding with Automated Film Budgets | by RivetAI | Medium](https://medium.com/@rivet.ai/from-script-to-funding-with-automated-film-budgets-c105005c8fd8)

[files01.core.ac.uk](https://files01.core.ac.uk/download/303774153.pdf)

[Movie's box office performance prediction \- CORE](https://files01.core.ac.uk/download/303774153.pdf)

[westeastinstitute.com](https://www.westeastinstitute.com/wp-content/uploads/2016/03/Susan-Smith.pdf)

[Predicting Box Office from the Screenplay: A Text Analytical Approach \- West East Institute](https://www.westeastinstitute.com/wp-content/uploads/2016/03/Susan-Smith.pdf)

[github.com](https://github.com/PedroUria/NLP-Movie_Scripts)

[PedroUria/NLP-Movie\_Scripts: Trying to predict a movie's success based on the script (before filming) \- GitHub](https://github.com/PedroUria/NLP-Movie_Scripts)

[medium.com](https://medium.com/@ramvipers777/movie-box-office-revenue-prediction-using-python-nlp-fc632955c637)

[Movie Box Office Revenue Prediction using Python \+ NLP | by Janaki Ram | Medium](https://medium.com/@ramvipers777/movie-box-office-revenue-prediction-using-python-nlp-fc632955c637)

[arxiv.org](https://arxiv.org/pdf/1506.05382)

[Early Predictions of Movie Success: the Who, What, and When of Profitability arXiv:1506.05382v2 \[cs.AI\] 29 Jan 2016](https://arxiv.org/pdf/1506.05382)

[studiovity.com](https://studiovity.com/movie-budgeting-software/)

[Movie Budgeting Software for Film Production \- Studiovity](https://studiovity.com/movie-budgeting-software/)

[celtx.com](https://www.celtx.com/product/production/)

[Film Production Software | Budgeting, Call Sheets and Production Reports | Celtx](https://www.celtx.com/product/production/)

[get.slated.com](https://get.slated.com/analysis/)

[Analysis | Slated](https://get.slated.com/analysis/)

[nitorinfotech.com](https://www.nitorinfotech.com/blog/building-smarter-ai-pipelines-with-langchain-rag-and-hierarchical-llms/)

[Building Smarter AI Pipelines with LangChain, RAG and Hierarchical LLMs \- Nitor Infotech](https://www.nitorinfotech.com/blog/building-smarter-ai-pipelines-with-langchain-rag-and-hierarchical-llms/)

[pinecone.io](https://www.pinecone.io/learn/advanced-rag-techniques/)

[Advanced RAG Techniques \- Pinecone](https://www.pinecone.io/learn/advanced-rag-techniques/)

[ai-marketinglabs.com](https://ai-marketinglabs.com/lab-experiments/architecting-production-ready-rag-systems-a-comprehensive-guide-to-pinecone)

[Architecting Production-Ready RAG Systems: A Comprehensive Guide to Pinecone](https://ai-marketinglabs.com/lab-experiments/architecting-production-ready-rag-systems-a-comprehensive-guide-to-pinecone)

[saraswathilakshman.medium.com](https://saraswathilakshman.medium.com/comprehensive-rag-implementation-guide-a4be00826224)

[Comprehensive RAG Implementation Guide | by Saraswathi Lakshman \- Medium](https://saraswathilakshman.medium.com/comprehensive-rag-implementation-guide-a4be00826224)

[eyelevel.ai](https://www.eyelevel.ai/post/most-accurate-rag)

[World's Most Accurate RAG? Langchain/Pinecone, LlamaIndex and EyeLevel Duke it Out](https://www.eyelevel.ai/post/most-accurate-rag)

[cs229.stanford.edu](https://cs229.stanford.edu/proj2016/report/PengdaLiu-MachineLearningOnPredictingGrossBoxOffice-report.pdf)

[Machine learning on predicting gross box office \- CS229: Machine ...](https://cs229.stanford.edu/proj2016/report/PengdaLiu-MachineLearningOnPredictingGrossBoxOffice-report.pdf)

[prescene.ai](https://www.prescene.ai/blog/calculating-roi-for-studios)

[AI Script Analysis ROI for Studio Executives: Faster Development ...](https://www.prescene.ai/blog/calculating-roi-for-studios)

***헐리우드 의사결정 인텔리전스의 가시적 성과 확인***

*최근 헐리우드 스튜디오들이 단순한 시나리오 작성을 넘어, 프로젝트의 투자 여부를 결정하는 '의사결정 인텔리전스'로 무게중심을 옮기고 있음을 포착했습니다. 특히 인공지능을 통한 흥행 수익 예측 정확도가 90\~96%에 도달하며 그린라이트 위원회의 필수 도구로 자리 잡고 있습니다. 저는 이러한 시장의 요구를 반영하여, 시나리오의 창의적 속성과 비즈니스 리스크를 동시에 관리할 수 있는 통합 시스템 구조를 정교화하고 있습니다.*

***데이터 기반의 다각적 흥행 예측 지표 분석***

*과거 20년치 박스오피스 데이터와 시나리오 텍스트를 결합하여 흥행 가능성을 수치화하는 구체적인 머신러닝 방법론을 도출했습니다. 특히 출연진의 시장성, 장르별 트렌드 적합성, 그리고 '세이브 더 캣(Save the Cat)'과 같은 표준 구조의 준수 여부를 포함한 핵심 변수들을 추출하여 분석하는 체계를 검토 중입니다. 단순한 감성 분석을 넘어 XGBoost나 양방향 LSTM과 같은 모델을 활용해 복합적인 시장 반응을 예측하는 논리적 기반을 강화하고 있습니다.*

***실무 중심의 제작 비용 및 ROI 산출 로직 수립***

*시나리오 내 지문에서 배경 장소의 개수와 시각 효과(VFX)의 강도를 식별하여 예산 초과 위험을 사전에 경고하는 기술적 실효성을 확인했습니다. 앞으로는 '존 윅' 스타일의 액션이나 '인셉션'의 구조와 같은 특정 '트로프(Trope)'를 벡터 검색으로 식별하는 정교한 유사 사례 매칭 로직을 설계할 계획입니다. 또한, 시나리오 저작권 보호를 위한 독립적 벡터 공간 활용 방안과 대본의 대사 밀도, 감정 변동성 등을 독립적인 피처로 변환하여 수익률(ROI)을 더욱 정밀하게 추산하는 과정을 실행할 것입니다.*

***Researching websites...***

[geeksforgeeks.org](https://www.geeksforgeeks.org/nlp/vectorization-techniques-in-nlp/)

[Vectors and Vectorization Techniques in NLP \- GeeksforGeeks](https://www.geeksforgeeks.org/nlp/vectorization-techniques-in-nlp/)

[medium.com](https://medium.com/@harsh.vardhan7695/a-comprehensive-guide-to-word-embeddings-in-nlp-ee3f9e4663ed)

[A Comprehensive Guide to Word Embeddings in NLP | by Harsh Vardhan | Medium](https://medium.com/@harsh.vardhan7695/a-comprehensive-guide-to-word-embeddings-in-nlp-ee3f9e4663ed)

[bfi.uchicago.edu](https://bfi.uchicago.edu/wp-content/uploads/2022/09/BFI_WP_2022-128.pdf)

[Tales and Tropes: Gender Roles from Word Embeddings in a Century of Children's Books \- Becker Friedman Institute for Economics](https://bfi.uchicago.edu/wp-content/uploads/2022/09/BFI_WP_2022-128.pdf)

[researchgate.net](https://www.researchgate.net/publication/353819435_TrUMAn_Trope_Understanding_in_Movies_and_Animations)

[(PDF) TrUMAn: Trope Understanding in Movies and Animations \- ResearchGate](https://www.researchgate.net/publication/353819435_TrUMAn_Trope_Understanding_in_Movies_and_Animations)

[filmustage.com](https://filmustage.com/)

[Filmustage: AI Pre-Production Assistant for Filmmakers & Studios](https://filmustage.com/)

[studiovity.com](https://studiovity.com/script-breakdown-software/)

[Script Breakdown Software & AI Screenplay Breakdown Tool | Studiovity](https://studiovity.com/script-breakdown-software/)

[filmustage.com](https://filmustage.com/script-breakdown/)

[Automate Script Breakdown with AI: Save Time & Costs \- Filmustage](https://filmustage.com/script-breakdown/)

[studiobinder.com](https://www.studiobinder.com/script-breakdown-software/)

[Modern Script Breakdown Software for Film & TV \- StudioBinder](https://www.studiobinder.com/script-breakdown-software/)

[blooper.ai](https://blooper.ai/blog/script-breakdown-mastery-techniques-that-save-production-time-and-budget)

[Script Breakdown Mastery: Techniques That Save Production Time and Budget \- Blooper.ai](https://blooper.ai/blog/script-breakdown-mastery-techniques-that-save-production-time-and-budget)

[pinecone.io](https://www.pinecone.io/learn/rag-access-control/)

[RAG with Access Control | Pinecone](https://www.pinecone.io/learn/rag-access-control/)

[medium.com](https://medium.com/@ankurnitp/practical-guide-how-rag-works-with-pinecone-f792801c946e)

[Building Reliable RAG Pipelines with Pinecone | by Ankur Agarwal | Medium](https://medium.com/@ankurnitp/practical-guide-how-rag-works-with-pinecone-f792801c946e)

[useparagon.com](https://www.useparagon.com/learn/how-to-build-production-ready-rag/)

[How to Build Production-Ready RAG | Learn from Paragon](https://www.useparagon.com/learn/how-to-build-production-ready-rag/)

[rubrik.com](https://www.rubrik.com/blog/company/25/enterprise-ai-secured-rubrik-annapurna-and-pinecone-deliver-a-smarter-rag-stack)

[Enterprise AI, Secured: Rubrik Annapurna and Pinecone Deliver a Smarter RAG Stack](https://www.rubrik.com/blog/company/25/enterprise-ai-secured-rubrik-annapurna-and-pinecone-deliver-a-smarter-rag-stack)

[reddit.com](https://www.reddit.com/r/Rag/comments/1pcwkmk/rag_for_secure_files_in_company/)

[RAG for secure files in company \- Reddit](https://www.reddit.com/r/Rag/comments/1pcwkmk/rag_for_secure_files_in_company/)

[sigport.org](https://sigport.org/sites/default/files/docs/ICASSP_2024%20%281%29.pdf)

[CHARACTER ATTRIBUTE EXTRACTION FROM MOVIE SCRIPTS USING LLMS Sabyasachee Baruah, Shrikanth Narayanan Signal Analysis and Interpr \- IEEE SigPort](https://sigport.org/sites/default/files/docs/ICASSP_2024%20%281%29.pdf)

[cs230.stanford.edu](http://cs230.stanford.edu/projects_winter_2021/reports/70992925.pdf)

[CS 230: Film Success Prediction Using NLP Techniques \- CS230 Deep Learning](http://cs230.stanford.edu/projects_winter_2021/reports/70992925.pdf)

[pmc.ncbi.nlm.nih.gov](https://pmc.ncbi.nlm.nih.gov/articles/PMC9962670/)

[Movie Scene Event Extraction with Graph Attention Network Based on Argument Correlation Information \- PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC9962670/)

[learning-gate.com](https://learning-gate.com/index.php/2576-8484/article/download/7709/2643/10391)

[Network mining of character relationships in novels and algorithm for shaping character relationships in TV dramas \- Learning Gate](https://learning-gate.com/index.php/2576-8484/article/download/7709/2643/10391)

[github.com](https://github.com/PedroUria/NLP-Movie_Scripts)

[PedroUria/NLP-Movie\_Scripts: Trying to predict a movie's success based on the script (before filming) \- GitHub](https://github.com/PedroUria/NLP-Movie_Scripts)

[get.slated.com](https://get.slated.com/analysis/)

[Analysis | Slated](https://get.slated.com/analysis/)

***데이터 기반의 정밀한 흥행성 및 예산 예측 기술 확보***

*과거 20년 이상의 할리우드 박스오피스 기록과 시나리오 텍스트를 결합하여 흥행 가능성을 수치화하는 구체적인 머신러닝 방법론을 도출했습니다. 특히 출연진의 시장성, 장르별 트렌드 적합성, 그리고 '세이브 더 캣(Save the Cat)'과 같은 표준 구조의 준수 여부를 포함한 19가지 핵심 변수를 추출하여 분석하는 체계를 검토 중입니다. 단순한 감성 분석을 넘어 XGBoost나 양방향 LSTM과 같은 모델을 활용해 복합적인 시장 반응을 예측하고, 시나리오 내 지문에서 배경 장소와 시각 효과(VFX)의 강도를 식별하여 제작비 초과 위험을 사전에 경고하는 기술적 실효성을 확인했습니다.*

***시나리오 구조 및 캐릭터 아크의 자동 추출 메커니즘***

*자연어 처리(NLP)를 활용해 시나리오의 3막 구조와 비트 시트를 자동으로 생성하고, 캐릭터 간의 대사 비중 및 감정 변화를 그래프화하는 내부 로직을 체계화하고 있습니다. 인공지능이 수천 권의 성공적인 스크립트 패턴을 학습하여 플롯의 구멍(Plot hole)을 찾아내거나 대사 유효성을 평가하는 단계를 설정했습니다. 이는 창의적인 영역인 대본을 데이터 기반의 객관적 지표로 변환하여 의사결정권자에게 '데이터에 기반한 확신'을 제공하는 핵심 자산이 될 것입니다.*

***표준 포맷 파싱 및 유사 사례 매칭 시스템 구축***

*Fountain 및 표준 PDF 포맷의 스크립트에서 장면 번호, 대사, 지문을 정밀하게 분리해내는 파이썬 기반 파이프라인을 설계하고 있습니다. 이를 통해 '존 윅'의 액션이나 '인셉션'의 구조와 같은 특정 '트로프(Trope)'를 벡터 검색으로 식별하여 유사 흥행작과 비교 분석하는 기능을 구현할 계획입니다. 향후에는 시나리오의 지적재산권 보호를 위한 독립적인 벡터 공간 구축 전략과 더불어, 대본의 긴 문맥을 효율적으로 처리하기 위한 계층적 검색 증강 생성(RAG) 아키텍처를 완성하는 데 집중할 예정입니다.*

***Researching websites...***

[arxiv.org](https://arxiv.org/html/2511.11857v1)

[Three Stage Narrative Analysis; Plot-Sentiment Breakdown, Structure Learning and Concept Detection \- arXiv.org](https://arxiv.org/html/2511.11857v1)

[researchgate.net](https://www.researchgate.net/publication/397701586_Three_Stage_Narrative_Analysis_Plot-Sentiment_Breakdown_Structure_Learning_and_Concept_Detection)

[(PDF) Three Stage Narrative Analysis; Plot-Sentiment Breakdown, Structure Learning and Concept Detection \- ResearchGate](https://www.researchgate.net/publication/397701586_Three_Stage_Narrative_Analysis_Plot-Sentiment_Breakdown_Structure_Learning_and_Concept_Detection)

[medium.com](https://medium.com/@cwc.annex/ai-screenplay-coverage-conversations-with-claude-449ceca015f8)

[AI Screenplay Coverage: Conversations With Claude | by malcolm wong | Medium](https://medium.com/@cwc.annex/ai-screenplay-coverage-conversations-with-claude-449ceca015f8)

[arxiv.org](https://arxiv.org/html/2502.16153v1)

[Understanding Screenwriters' Practices, Attitudes, and Future Expectations in Human-AI Co-Creation \- arXiv](https://arxiv.org/html/2502.16153v1)

[scitepress.org](https://www.scitepress.org/Papers/2025/133696/133696.pdf)

[Multi-Agent System for AI-Assisted Extraction of Narrative Arcs in TV Series \- SciTePress](https://www.scitepress.org/Papers/2025/133696/133696.pdf)

[mygreatlearning.com](https://www.mygreatlearning.com/blog/movie-success-prediction-using-ml/)

[Research : Movie Success Prediction Using ML \- Great Learning](https://www.mygreatlearning.com/blog/movie-success-prediction-using-ml/)

[urfjournals.org](https://urfjournals.org/open-access/predictive-analytics-for-box-office-success.pdf)

[Journal of Artificial Intelligence, Machine Learning and Data Science \- urfjournals.org — Virtualmin](https://urfjournals.org/open-access/predictive-analytics-for-box-office-success.pdf)

[scribd.com](https://www.scribd.com/document/884557404/39-Movie-Success-Prediction-Using-Data-Mining)

[Movie Success Prediction Using Data Mining | PDF | Machine Learning \- Scribd](https://www.scribd.com/document/884557404/39-Movie-Success-Prediction-Using-Data-Mining)

[aiscriptreader.com](https://aiscriptreader.com/blog/filmmaking-innovations/how-ai-predicts-box-office-success-from-scripts)

[How AI Predicts Box Office Success from Scripts \- AIScriptReader](https://aiscriptreader.com/blog/filmmaking-innovations/how-ai-predicts-box-office-success-from-scripts)

[filmustage.com](https://filmustage.com/)

[Filmustage: AI Pre-Production Assistant for Filmmakers & Studios](https://filmustage.com/)

[studiovity.com](https://studiovity.com/script-breakdown-software/)

[Script Breakdown Software & AI Screenplay Breakdown Tool | Studiovity](https://studiovity.com/script-breakdown-software/)

[blooper.ai](https://blooper.ai/blog/script-breakdown-mastery-techniques-that-save-production-time-and-budget)

[Script Breakdown Mastery: Techniques That Save Production Time and Budget \- Blooper.ai](https://blooper.ai/blog/script-breakdown-mastery-techniques-that-save-production-time-and-budget)

[shamelstudio.com](https://www.shamelstudio.com/blog/film-budget-guide)

[Guide to Creating a Film Budget \- Shamel Studio](https://www.shamelstudio.com/blog/film-budget-guide)

[medium.com](https://medium.com/@rivet.ai/from-script-to-funding-with-automated-film-budgets-c105005c8fd8)

[From Script to Funding with Automated Film Budgets | by RivetAI | Medium](https://medium.com/@rivet.ai/from-script-to-funding-with-automated-film-budgets-c105005c8fd8)

[docs.pinecone.io](https://docs.pinecone.io/integrations/llamaindex)

[LlamaIndex \- Pinecone Docs](https://docs.pinecone.io/integrations/llamaindex)

[langtrace.ai](https://www.langtrace.ai/blog/implementing-rag-using-llamaindex-pinecone-and-langtrace-a-step-by-step-guide)

[Implementing RAG using LlamaIndex, Pinecone and Langtrace: A Step-by-Step Guide](https://www.langtrace.ai/blog/implementing-rag-using-llamaindex-pinecone-and-langtrace-a-step-by-step-guide)

[firecrawl.dev](https://www.firecrawl.dev/blog/best-chunking-strategies-rag)

[Best Chunking Strategies for RAG (and LLMs) in 2026 \- Firecrawl](https://www.firecrawl.dev/blog/best-chunking-strategies-rag)

[developers.llamaindex.ai](https://developers.llamaindex.ai/python/examples/query_engine/multi_doc_auto_retrieval/multi_doc_auto_retrieval/)

[Structured Hierarchical Retrieval | LlamaIndex OSS Documentation \- LlamaParse](https://developers.llamaindex.ai/python/examples/query_engine/multi_doc_auto_retrieval/multi_doc_auto_retrieval/)

[eyelevel.ai](https://www.eyelevel.ai/post/most-accurate-rag)

[World's Most Accurate RAG? Langchain/Pinecone, LlamaIndex and EyeLevel Duke it Out](https://www.eyelevel.ai/post/most-accurate-rag)

[youtube.com](https://www.youtube.com/watch?v=UMYtqHptYvA)

[Guide to Architect Secure AI Agents: Best Practices for Safety \- YouTube](https://www.youtube.com/watch?v=UMYtqHptYvA)

[keystonecorp.com](https://keystonecorp.com/cybersecurity/it-security-architecture-frameworks-best-practices-phases/)

[IT Security Architecture: Frameworks & Best Practices \- Keystone Technology Consultants](https://keystonecorp.com/cybersecurity/it-security-architecture-frameworks-best-practices-phases/)

[sei.cmu.edu](https://www.sei.cmu.edu/divisions/cert/)

[CERT Division \- Software Engineering Institute \- Carnegie Mellon University](https://www.sei.cmu.edu/divisions/cert/)

[redhat.com](https://www.redhat.com/en/blog/top-10-security-architecture-patterns-llm-applications)

[Top 10 security architecture patterns for LLM applications \- Red Hat](https://www.redhat.com/en/blog/top-10-security-architecture-patterns-llm-applications)

***데이터 기반의 '디시전 인텔리전스' 핵심 로직 구체화***

*단순한 시나리오 생성을 넘어 제작 승인 여부를 결정하는 '디시전 인텔리전스(Decision Intelligence)'의 실질적인 구현 체계를 수립하고 있습니다. 2026년 기준 헐리우드 스튜디오들이 도입 중인 94\~96% 정확도의 흥행 예측 모델을 분석한 결과, 캐스팅의 소셜 미디어 영향력과 장르별 트렌드 등 19개 핵심 변수를 XGBoost 및 양방향 LSTM으로 처리하는 복합 알고리즘이 유효함을 확인했습니다. 저는 이를 바탕으로 창의적 시나리오를 비즈니스 리스크 관리 관점에서 수치화하는 정밀한 평가 엔진을 설계하고 있습니다.*

***스크립트 구조 및 캐릭터 아크의 다차원 추출 기법***

*자연어 처리(NLP)를 활용하여 '세이브 더 캣(Save the Cat)'이나 '영웅의 여정'과 같은 표준 3막 구조의 준수 여부를 자동으로 검증하는 기술적 토대를 강화했습니다. 특히 멀티 에이전트 시스템을 통해 에피소드별 서사 아크를 식별하고, 캐릭터 간의 대사 비중과 감정 변화를 그래프로 시각화하는 '캐릭터 아크 매핑' 기술을 검토 중입니다. 이는 시나리오 내의 잠재적인 플롯 홀(Plot hole)을 조기에 발견하고 대사의 일관성을 점검하여 작품의 완성도를 객관적으로 증명하는 핵심 지표가 될 것입니다.*

***표준 포맷 파싱 및 제작비 최적화 파이프라인 설계***

*Fountain 및 표준 PDF 포맷에서 장면(Scene)과 대사를 정밀하게 분리하는 파이썬 기반 파이프라인과 더불어, 배경 장소 수와 시각 효과(VFX) 강도를 분석해 예산 초과 리스크를 탐지하는 'AI 스크립트 오딧' 기능을 구체화하고 있습니다. 앞으로는 유사 흥행작과의 '트로프(Trope)' 매칭을 위해 시나리오 구조를 벡터화하여 비교하는 로직을 고도화할 계획입니다. 또한, 시나리오 보안을 위한 독립적 벡터 DB 운영 전략과 긴 텍스트 처리를 위한 계층적 검색 증강 생성(RAG) 아키텍처를 최종적으로 통합하는 단계를 밟을 예정입니다.*

***Researching websites...***

[arxiv.org](https://arxiv.org/html/2511.11857v1)

[Three Stage Narrative Analysis; Plot-Sentiment Breakdown, Structure Learning and Concept Detection \- arXiv.org](https://arxiv.org/html/2511.11857v1)

[researchgate.net](https://www.researchgate.net/publication/397701586_Three_Stage_Narrative_Analysis_Plot-Sentiment_Breakdown_Structure_Learning_and_Concept_Detection)

[(PDF) Three Stage Narrative Analysis; Plot-Sentiment Breakdown, Structure Learning and Concept Detection \- ResearchGate](https://www.researchgate.net/publication/397701586_Three_Stage_Narrative_Analysis_Plot-Sentiment_Breakdown_Structure_Learning_and_Concept_Detection)

[medium.com](https://medium.com/@cwc.annex/ai-screenplay-coverage-conversations-with-claude-449ceca015f8)

[AI Screenplay Coverage: Conversations With Claude | by malcolm wong | Medium](https://medium.com/@cwc.annex/ai-screenplay-coverage-conversations-with-claude-449ceca015f8)

[aiscriptreader.com](https://aiscriptreader.com/blog/filmmaking-innovations/how-ai-analyzes-character-representation-in-scripts)

[How AI Analyzes Character Representation in Scripts \- AIScriptReader](https://aiscriptreader.com/blog/filmmaking-innovations/how-ai-analyzes-character-representation-in-scripts)

[arxiv.org](https://arxiv.org/html/2502.16153v1)

[Understanding Screenwriters' Practices, Attitudes, and Future Expectations in Human-AI Co-Creation \- arXiv](https://arxiv.org/html/2502.16153v1)

[scribd.com](https://www.scribd.com/document/884557404/39-Movie-Success-Prediction-Using-Data-Mining)

[Movie Success Prediction Using Data Mining | PDF | Machine Learning \- Scribd](https://www.scribd.com/document/884557404/39-Movie-Success-Prediction-Using-Data-Mining)

[urfjournals.org](https://urfjournals.org/open-access/predictive-analytics-for-box-office-success.pdf)

[Journal of Artificial Intelligence, Machine Learning and Data Science \- urfjournals.org — Virtualmin](https://urfjournals.org/open-access/predictive-analytics-for-box-office-success.pdf)

[arxiv.org](https://arxiv.org/pdf/1506.05382)

[Early Predictions of Movie Success: the Who, What, and When of Profitability arXiv:1506.05382v2 \[cs.AI\] 29 Jan 2016](https://arxiv.org/pdf/1506.05382)

[medium.com](https://medium.com/@shsh6015/predicting-box-office-success-with-machine-learning-can-data-tell-if-a-movie-will-be-a-hit-b15dfd96ac77)

[Predicting Box Office Success with Machine Learning: Can Data Tell If a Movie Will Be a Hit? | by Shrish Sharma | Medium](https://medium.com/@shsh6015/predicting-box-office-success-with-machine-learning-can-data-tell-if-a-movie-will-be-a-hit-b15dfd96ac77)

[aiscriptreader.com](https://aiscriptreader.com/blog/filmmaking-innovations/how-ai-predicts-box-office-success-from-scripts)

[How AI Predicts Box Office Success from Scripts \- AIScriptReader](https://aiscriptreader.com/blog/filmmaking-innovations/how-ai-predicts-box-office-success-from-scripts)

[blooper.ai](https://blooper.ai/blog/script-breakdown-mastery-techniques-that-save-production-time-and-budget)

[Script Breakdown Mastery: Techniques That Save Production Time and Budget \- Blooper.ai](https://blooper.ai/blog/script-breakdown-mastery-techniques-that-save-production-time-and-budget)

[shamelstudio.com](https://www.shamelstudio.com/blog/film-budget-guide)

[Guide to Creating a Film Budget \- Shamel Studio](https://www.shamelstudio.com/blog/film-budget-guide)

[firstdraftfilmworks.com](https://firstdraftfilmworks.com/blog/the-complete-guide-to-script-breakdown/)

[The Complete Guide to Script Breakdown: Master the Art of Film Pre-Production Planning](https://firstdraftfilmworks.com/blog/the-complete-guide-to-script-breakdown/)

[filmustage.com](https://filmustage.com/blog/using-script-breakdown-to-enhance-budget-accuracy/)

[Using Script Breakdown to Enhance Budget Accuracy \- Filmustage Blog](https://filmustage.com/blog/using-script-breakdown-to-enhance-budget-accuracy/)

[medium.com](https://medium.com/@rivet.ai/from-script-to-funding-with-automated-film-budgets-c105005c8fd8)

[From Script to Funding with Automated Film Budgets | by RivetAI | Medium](https://medium.com/@rivet.ai/from-script-to-funding-with-automated-film-budgets-c105005c8fd8)

[pinecone.io](https://www.pinecone.io/learn/advanced-rag-techniques/)

[Advanced RAG Techniques \- Pinecone](https://www.pinecone.io/learn/advanced-rag-techniques/)

[llamaindex.ai](https://www.llamaindex.ai/blog/a-cheat-sheet-and-some-recipes-for-building-advanced-rag-803a9d94c41b)

[Advanced RAG Cheat Sheet And Recipes Guide | LlamaIndex](https://www.llamaindex.ai/blog/a-cheat-sheet-and-some-recipes-for-building-advanced-rag-803a9d94c41b)

[firecrawl.dev](https://www.firecrawl.dev/blog/best-chunking-strategies-rag)

[Best Chunking Strategies for RAG (and LLMs) in 2026 \- Firecrawl](https://www.firecrawl.dev/blog/best-chunking-strategies-rag)

[developers.llamaindex.ai](https://developers.llamaindex.ai/python/examples/query_engine/multi_doc_auto_retrieval/multi_doc_auto_retrieval/)

[Structured Hierarchical Retrieval | LlamaIndex OSS Documentation \- LlamaParse](https://developers.llamaindex.ai/python/examples/query_engine/multi_doc_auto_retrieval/multi_doc_auto_retrieval/)

[eyelevel.ai](https://www.eyelevel.ai/post/most-accurate-rag)

[World's Most Accurate RAG? Langchain/Pinecone, LlamaIndex and EyeLevel Duke it Out](https://www.eyelevel.ai/post/most-accurate-rag)

[youtube.com](https://www.youtube.com/watch?v=UMYtqHptYvA)

[Guide to Architect Secure AI Agents: Best Practices for Safety \- YouTube](https://www.youtube.com/watch?v=UMYtqHptYvA)

[aigl.blog](https://www.aigl.blog/ai-security-reference-architectures-secure-design-patterns-practices-for-teams-developing-llm-powered-applications/)

[AI Security Reference Architectures Secure design patterns & practices for teams developing LLM-powered applications \- AI Governance Library](https://www.aigl.blog/ai-security-reference-architectures-secure-design-patterns-practices-for-teams-developing-llm-powered-applications/)

[keystonecorp.com](https://keystonecorp.com/cybersecurity/it-security-architecture-frameworks-best-practices-phases/)

[IT Security Architecture: Frameworks & Best Practices \- Keystone Technology Consultants](https://keystonecorp.com/cybersecurity/it-security-architecture-frameworks-best-practices-phases/)

[redhat.com](https://www.redhat.com/en/blog/top-10-security-architecture-patterns-llm-applications)

[Top 10 security architecture patterns for LLM applications \- Red Hat](https://www.redhat.com/en/blog/top-10-security-architecture-patterns-llm-applications)

***실시간 협업과 AI 편집기 중심의 할리우드 제작 환경 변화***

*최근 할리우드 시나리오 개발 환경이 클라우드 기반 AI 편집기로 급격히 전환되고 있음을 포착했습니다. 2025년 말 기준 전문 작가의 71%가 AI 도구를 채택하고 있으며, 특히 실시간 협업 기능이 필수적인 요소로 자리 잡았습니다. 저는 이러한 흐름을 반영하여 단순한 분석을 넘어, 작성 단계에서부터 구조적 결함을 포착하고 대사 톤과 캐릭터의 일관성을 실시간으로 교정하는 기능을 시스템의 핵심 사용자 경험(UX)으로 설정하고 있습니다.*

***정교한 ROI 예측을 위한 다층적 머신러닝 모델 융합***

*시나리오의 텍스트 데이터만으로 흥행 수익을 예측하기 위해 XGBoost, Random Forest, 그리고 양방향 LSTM을 결합한 모델 융합(Model Fusion) 전략을 검토하고 있습니다. 단순히 과거 데이터를 대조하는 수준을 넘어, 캐스팅의 시장 가치, 개봉 시기, 소셜 미디어의 실시간 버즈량 등 19가지 핵심 변수를 통합 분석하여 94\~96% 수준의 정확도를 확보하는 방안을 모색 중입니다. 특히 제작 예산 대비 수익률(ROI)을 1-100 지수로 시각화하여 경영진이 직관적인 판단을 내릴 수 있도록 수치화된 지표를 도출하고 있습니다.*

***표준 포맷 파싱 기술과 차세대 분석 엔진의 통합***

*할리우드 표준인 Fountain 및 PDF 스크립트에서 장면 번호, 대사, 지문을 정밀하게 분리하기 위해 Jouvence와 같은 전용 파이썬 라이브러리를 활용한 데이터 파이프라인을 구체화했습니다. 이를 통해 시각 효과(VFX)의 밀도와 배경 장소(Location) 수를 식별하여 제작비 초과 리스크를 탐지하는 'AI 스크립트 오딧' 기능을 강화하고 있습니다. 다음 단계로 저는 특정 트로프(Trope)를 벡터화하여 유사 흥행작과 비교 분석하는 유사도 측정 로직과 타겟 관객층의 인구통계학적 선호도를 예측하는 모델을 심층 설계할 계획입니다.*

***Researching websites...***

[fountain.io](https://fountain.io/syntax/)

[Syntax \- Fountain](https://fountain.io/syntax/)

[betterprogramming.pub](https://betterprogramming.pub/simple-python-parsing-for-narrative-charts-37e51c75ca3d)

[Simple Python Parsing for Narrative Charts | by P.G. Baumstarck \- Better Programming](https://betterprogramming.pub/simple-python-parsing-for-narrative-charts-37e51c75ca3d)

[github.com](https://github.com/ludovicchabant/Jouvence)

[ludovicchabant/Jouvence: A library for parsing and rendering Fountain screenplays. \- GitHub](https://github.com/ludovicchabant/Jouvence)

[github.com](https://github.com/wildwinter/screenplay-tools)

[wildwinter/screenplay-tools: Multi-language utils for representing a screenplay, including parsing and writing the Fountain scriptwriting format and the Final Draft (FDX) format. \- GitHub](https://github.com/wildwinter/screenplay-tools)

[wildwinter.medium.com](https://wildwinter.medium.com/fountain-movie-script-parser-javascript-python-c-c-ca088d63d298)

[Fountain Movie Script Parser — JavaScript, Python, C\#, C++ | by Ian Thomas \- Medium](https://wildwinter.medium.com/fountain-movie-script-parser-javascript-python-c-c-ca088d63d298)

[arno.uvt.nl](http://arno.uvt.nl/show.cgi?fid=157412)

[Prediction of Motion Picture Association of America Ratings Using Emotion Analysis and Text Classification Approaches \- http](http://arno.uvt.nl/show.cgi?fid=157412)

[researchgate.net](https://www.researchgate.net/publication/362096467_MPAA_Rating_Prediction_Using_Script_Analysis_for_Movies)

[MPAA Rating Prediction Using Script Analysis for Movies \- ResearchGate](https://www.researchgate.net/publication/362096467_MPAA_Rating_Prediction_Using_Script_Analysis_for_Movies)

[semanticscholar.org](https://www.semanticscholar.org/paper/Age-Suitability-Rating%3A-Predicting-the-MPAA-Rating-Shafaei-Samghabadi/ed8643b5544f5ed3e1e81d49d99f72b9b7765247)

[Age Suitability Rating: Predicting the MPAA Rating Based on Movie Dialogues](https://www.semanticscholar.org/paper/Age-Suitability-Rating%3A-Predicting-the-MPAA-Rating-Shafaei-Samghabadi/ed8643b5544f5ed3e1e81d49d99f72b9b7765247)

[viterbischool.usc.edu](https://viterbischool.usc.edu/news/2019/03/using-artificial-intelligence-to-predict-violence-in-movies/)

[Using Artificial Intelligence to Predict Violence in Movies \- USC Viterbi](https://viterbischool.usc.edu/news/2019/03/using-artificial-intelligence-to-predict-violence-in-movies/)

[medium.com](https://medium.com/data-science/predicting-mpaa-ratings-for-movies-47fb85970bd4)

[Predicting MPAA Ratings for Movies | by Vaishak V.Kumar | TDS Archive \- Medium](https://medium.com/data-science/predicting-mpaa-ratings-for-movies-47fb85970bd4)

[scylladb.com](https://www.scylladb.com/2025/10/21/building-a-movie-recommendation-app-with-scylladb-vector-search/)

[Building a Movie Recommendation App with ScyllaDB Vector Search](https://www.scylladb.com/2025/10/21/building-a-movie-recommendation-app-with-scylladb-vector-search/)

[medium.com](https://medium.com/@kenazjose007/building-a-movie-recommendation-system-my-journey-with-vectors-37fc83c7004e)

[Building a Movie Recommendation System: My Journey with Vectors | by Kenazjose](https://medium.com/@kenazjose007/building-a-movie-recommendation-system-my-journey-with-vectors-37fc83c7004e)

[kaggle.com](https://www.kaggle.com/code/zeyneloglum/vector-similarity-recommender-movies-system)

[Vector Similarity-Recommender Movies System \- Kaggle](https://www.kaggle.com/code/zeyneloglum/vector-similarity-recommender-movies-system)

[pdfs.semanticscholar.org](https://pdfs.semanticscholar.org/0867/a1435be045f1bc636709296856444d8f6a36.pdf)

[A Content-based Movie Recommendation System \- Semantic Scholar](https://pdfs.semanticscholar.org/0867/a1435be045f1bc636709296856444d8f6a36.pdf)

[quarkus.io](https://quarkus.io/blog/movie-similarity-search-using-vector-databases/)

[Movie similarity search using vector databases \- Quarkus](https://quarkus.io/blog/movie-similarity-search-using-vector-databases/)

[profiletree.com](https://profiletree.com/ai-for-film-script-analysis/)

[How to Use AI for Film Script Analysis and Selection \- ProfileTree](https://profiletree.com/ai-for-film-script-analysis/)

[journals.plos.org](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0288932)

[Analyzing drama metadata through machine learning to gain insights into social information dissemination patterns](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0288932)

[tandfonline.com](https://www.tandfonline.com/doi/full/10.1080/25741136.2025.2454074)

[Full article: Artificial intelligence as a collaborative tool for script development](https://www.tandfonline.com/doi/full/10.1080/25741136.2025.2454074)

[aiscriptreader.com](https://aiscriptreader.com/blog/filmmaking-innovations/top-metrics-ai-uses-to-evaluate-screenplays)

[Top Metrics AI Uses to Evaluate Screenplays](https://aiscriptreader.com/blog/filmmaking-innovations/top-metrics-ai-uses-to-evaluate-screenplays)

[arxiv.org](https://arxiv.org/html/2502.16153v1)

[Understanding Screenwriters' Practices, Attitudes, and Future Expectations in Human-AI Co-Creation \- arXiv](https://arxiv.org/html/2502.16153v1)

[filmustage.com](https://filmustage.com/blog/using-script-breakdown-to-enhance-budget-accuracy/)

[Using Script Breakdown to Enhance Budget Accuracy \- Filmustage ...](https://filmustage.com/blog/using-script-breakdown-to-enhance-budget-accuracy/)

[developers.llamaindex.ai](https://developers.llamaindex.ai/python/examples/query_engine/multi_doc_auto_retrieval/multi_doc_auto_retrieval/)

[Structured Hierarchical Retrieval | LlamaIndex OSS Documentation](https://developers.llamaindex.ai/python/examples/query_engine/multi_doc_auto_retrieval/multi_doc_auto_retrieval/)

[urfjournals.org](https://urfjournals.org/open-access/predictive-analytics-for-box-office-success.pdf)

[Journal of Artificial Intelligence, Machine Learning and Data Science](https://urfjournals.org/open-access/predictive-analytics-for-box-office-success.pdf)

***제작비 산출을 위한 데이터 피처 추출 로직 구체화***

*시나리오 텍스트에서 제작비에 직접적인 영향을 미치는 변수들을 정밀하게 추출하는 알고리즘을 설계하고 있습니다. 단순히 단어 빈도를 체크하는 수준을 넘어, 장면 지문 내의 배경 장소(Location) 개수와 시각 효과(VFX)의 복잡도, 그리고 등장인물 규모를 식별하여 예산 규모를 추산하는 '스크립트 오딧(Script Audit)' 기능을 구체화했습니다. 특히 1페이지당 제작비 산정 방식과 같은 할리우드 고유의 휴리스틱을 머신러닝 피처로 변환하여, 장르별 예산 가중치를 자동 계산하는 모델을 검토 중입니다.*

***트로프(Trope) 기반의 유사 흥행작 비교 분석 체계***

*시나리오의 서사적 장치나 전형적인 설정인 '트로프'를 벡터화하여 기존 흥행작과 매칭하는 고도화된 분석 기법을 수립하고 있습니다. '존 윅' 스타일의 액션 시퀀스나 '인셉션'의 복합 구조 등 특정 서사 패턴을 지식 그래프나 의미론적 임베딩으로 식별하여, 유사한 구조를 가진 과거 작품들의 ROI 데이터를 대조하는 방식입니다. 이를 통해 단순 장르 분류를 넘어 작품의 '흥행 DNA'를 시각화하고 타겟 관객층의 반응을 정교하게 예측하는 논리적 기반을 마련하고 있습니다.*

***표준 PDF 파싱 및 지식재산권 보호를 위한 보안 설계***

*구조화되지 않은 표준 PDF 형식의 시나리오에서 장면 번호, 대사, 지문을 정확히 분리해내기 위한 레이아웃 분석 파이프라인을 점검하고 있습니다. Fountain 포맷으로의 변환 과정에서 발생할 수 있는 데이터 손실을 최소화하는 기술적 대안을 모색 중이며, 특히 입력된 시나리오의 유출을 방지하기 위해 독립적인 벡터 공간(Namespace)을 활용한 보안 아키텍처를 설계했습니다. 향후에는 추출된 서사 아크를 '4-사분면(Four-Quadrant)' 관객 분석 모델에 대입하여 성별 및 연령대별 선호도를 수치화하는 최종 통합 과정을 진행할 계획입니다.*

***Researching websites...***

[thegreenshot.io](https://www.thegreenshot.io/uncategorized/budgeting-for-a-film/)

[How to Build a Movie Budget That Actually Works: Producer's Guide](https://www.thegreenshot.io/uncategorized/budgeting-for-a-film/)

[reddit.com](https://www.reddit.com/r/vfx/comments/1ieltyo/budgeting_for_vfx_during_preproduction_and/)

[Budgeting for VFX during Preproduction and budgeting phase. How does one do it? \- Reddit](https://www.reddit.com/r/vfx/comments/1ieltyo/budgeting_for_vfx_during_preproduction_and/)

[saturation.io](https://saturation.io/blog/film-budget-101-the-key-to-successful-film-production)

[Film Budget 101: Key Principles for Production Success (2026) \- Saturation.io](https://saturation.io/blog/film-budget-101-the-key-to-successful-film-production)

[filmustage.com](https://filmustage.com/blog/a-step-by-step-guide-to-creating-your-first-film-budget/)

[A Step-by-Step Guide to Creating Your First Film Budget \- Filmustage Blog](https://filmustage.com/blog/a-step-by-step-guide-to-creating-your-first-film-budget/)

[filmustage.com](https://filmustage.com/blog/how-vfx-breakdowns-can-cut-film-production-costs/)

[How VFX Breakdowns Can Cut Film Production Costs \- Filmustage Blog](https://filmustage.com/blog/how-vfx-breakdowns-can-cut-film-production-costs/)

[aclanthology.org](https://aclanthology.org/2025.coling-main.396/)

[Automated Detection of Tropes In Short Texts \- ACL Anthology](https://aclanthology.org/2025.coling-main.396/)

[figshare.com](https://figshare.com/articles/dataset/Trope_dataset_containing_tropes_from_TvTropes_and_data_of_the_movies_they_appear_together_with_movie_metadata_/25053926)

[Trope dataset containing tropes (from TvTropes) and data of the movies they appear, together with movie metadata. \- figshare](https://figshare.com/articles/dataset/Trope_dataset_containing_tropes_from_TvTropes_and_data_of_the_movies_they_appear_together_with_movie_metadata_/25053926)

[arxiv.org](https://arxiv.org/html/2411.05227v2)

[Chatter: A Character Attribution Dataset for Narrative Understanding \- arXiv.org](https://arxiv.org/html/2411.05227v2)

[arxiv.org](https://arxiv.org/html/2411.05227v1)

[Chatter: A Character Attribution Dataset for Narrative Understanding \- arXiv](https://arxiv.org/html/2411.05227v1)

[researchgate.net](https://www.researchgate.net/publication/385701227_CHATTER_A_Character_Attribution_Dataset_for_Narrative_Understanding)

[CHATTER: A Character Attribution Dataset for Narrative Understanding \- ResearchGate](https://www.researchgate.net/publication/385701227_CHATTER_A_Character_Attribution_Dataset_for_Narrative_Understanding)

[github.com](https://github.com/richardmrodriguez/screenplay-doc-parser)

[richardmrodriguez/screenplay-doc-parser: Library for parsing a screenplay-formatted PDF into a semantically-typed object. \- GitHub](https://github.com/richardmrodriguez/screenplay-doc-parser)

[unstructured.io](https://unstructured.io/blog/how-to-parse-a-pdf-part-1)

[How to Parse a PDF, Part 1 \- Unstructured](https://unstructured.io/blog/how-to-parse-a-pdf-part-1)

[llamaindex.ai](https://www.llamaindex.ai/blog/mastering-pdfs-extracting-sections-headings-paragraphs-and-tables-with-cutting-edge-parser-faea18870125)

[PDF Parsing Guide: Extract Sections & Tables \- LlamaIndex](https://www.llamaindex.ai/blog/mastering-pdfs-extracting-sections-headings-paragraphs-and-tables-with-cutting-edge-parser-faea18870125)

[stackoverflow.com](https://stackoverflow.com/questions/17454291/what-text-processing-tool-is-recommended-for-parsing-screenplays)

[What text processing tool is recommended for parsing screenplays? \- Stack Overflow](https://stackoverflow.com/questions/17454291/what-text-processing-tool-is-recommended-for-parsing-screenplays)

[reddit.com](https://www.reddit.com/r/Python/comments/1if3axy/introducing_kreuzberg_a_simple_modern_library_for/)

[Introducing Kreuzberg: A Simple, Modern Library for PDF and Document Text Extraction in Python \- Reddit](https://www.reddit.com/r/Python/comments/1if3axy/introducing_kreuzberg_a_simple_modern_library_for/)

[mdpi.com](https://www.mdpi.com/2227-7390/11/23/4735)

[A Natural-Language-Processing-Based Method for the Clustering and Analysis of Movie Reviews and Classification by Genre \- MDPI](https://www.mdpi.com/2227-7390/11/23/4735)

[drpress.org](https://drpress.org/ojs/index.php/ajst/article/view/33377)

[Text Sentiment Analysis for Movie Theme Forecasting Based on Natural Language Processing | Academic Journal of Science and Technology \- Darcy & Roy Press](https://drpress.org/ojs/index.php/ajst/article/view/33377)

[researchgate.net](https://www.researchgate.net/publication/400335023_Text_Sentiment_Analysis_for_Movie_Theme_Forecasting_Based_on_Natural_Language_Processing)

[Text Sentiment Analysis for Movie Theme Forecasting Based on Natural Language Processing \- ResearchGate](https://www.researchgate.net/publication/400335023_Text_Sentiment_Analysis_for_Movie_Theme_Forecasting_Based_on_Natural_Language_Processing)

[gointothestory.blcklst.com](https://gointothestory.blcklst.com/hollywoods-new-four-quadrant-movie-model-e7cf94a2e3b8)

[Hollywood's New Four-Quadrant Movie Model | by Scott Myers | Go Into The Story](https://gointothestory.blcklst.com/hollywoods-new-four-quadrant-movie-model-e7cf94a2e3b8)

[ideas.darden.virginia.edu](https://ideas.darden.virginia.edu/applying-NLP-to-TV-scripts)

[Can a TV Show's Script Predict a Hit? Data Says Yes. | Darden Ideas to Action \- The University of Virginia](https://ideas.darden.virginia.edu/applying-NLP-to-TV-scripts)

[campus.datacamp.com](https://campus.datacamp.com/courses/vector-databases-for-embeddings-with-pinecone/performance-tuning-and-ai-applications?ex=5)

[Multitenancy and namespaces | Python \- DataCamp](https://campus.datacamp.com/courses/vector-databases-for-embeddings-with-pinecone/performance-tuning-and-ai-applications?ex=5)

[docs.pinecone.io](https://docs.pinecone.io/guides/index-data/implement-multitenancy)

[Implement multitenancy \- Pinecone Docs](https://docs.pinecone.io/guides/index-data/implement-multitenancy)

[pinecone.io](https://www.pinecone.io/learn/series/vector-databases-in-production-for-busy-engineers/vector-database-multi-tenancy/)

[Multi-Tenancy in Vector Databases | Pinecone](https://www.pinecone.io/learn/series/vector-databases-in-production-for-busy-engineers/vector-database-multi-tenancy/)

[community.pinecone.io](https://community.pinecone.io/t/clarification-on-how-namespaces-work/609)

[Clarification on how namespaces work \- Support \- Pinecone Community](https://community.pinecone.io/t/clarification-on-how-namespaces-work/609)

[reddit.com](https://www.reddit.com/r/Rag/comments/1n21nq1/scaling_rag_application_to_production_multitenant/)

[Scaling RAG Application to Production \- Multi-tenant Architecture Questions \- Reddit](https://www.reddit.com/r/Rag/comments/1n21nq1/scaling_rag_application_to_production_multitenant/)

[aiscriptreader.com](https://aiscriptreader.com/blog/filmmaking-innovations/top-metrics-ai-uses-to-evaluate-screenplays)

[undefined \- AIScriptReader](https://aiscriptreader.com/blog/filmmaking-innovations/top-metrics-ai-uses-to-evaluate-screenplays)

[filmustage.com](https://filmustage.com/vfx-breakdown/)

[VFX Bidding & Planning — Without Guesswork \- Filmustage](https://filmustage.com/vfx-breakdown/)

[pinecone.io](https://www.pinecone.io/learn/rag-access-control/)

[RAG with Access Control | Pinecone](https://www.pinecone.io/learn/rag-access-control/)

[urfjournals.org](https://urfjournals.org/open-access/predictive-analytics-for-box-office-success.pdf)

[Journal of Artificial Intelligence, Machine Learning and Data Science](https://urfjournals.org/open-access/predictive-analytics-for-box-office-success.pdf)

***시나리오 기반 제작비 및 흥행 예측의 기술적 정교화***

*시나리오의 텍스트 데이터만으로 박스오피스 성적을 예측하기 위해 XGBoost, 랜덤 포레스트, 그리고 양방향 LSTM을 결합한 '모델 융합(Model Fusion)' 전략의 유효성을 확인했습니다. 단순한 감성 분석을 넘어 출연진의 시장 가치, 예산 효율성, 개봉 시기 등 19가지 핵심 변수를 통합하여 94\~96%의 예측 정확도를 확보하는 방안을 검토 중입니다. 특히 시나리오 내 지문을 분석해 배경 장소(Location) 수와 시각 효과(VFX) 난이도를 식별함으로써 예산 초과 리스크를 사전에 경고하는 'AI 스크립트 오딧' 기능이 제작 승인 단계의 핵심 도구가 될 것임을 파악했습니다.*

***서사 구조 및 캐릭터 아크 추출을 위한 지능형 엔진 설계***

*자연어 처리(NLP)를 활용해 '세이브 더 캣(Save the Cat)'이나 '영웅의 여정'과 같은 표준 3막 구조의 준수 여부를 자동으로 검증하고, 캐릭터 간의 대사 비중과 감정 변화를 그래프로 시각화하는 기술적 토대를 강화했습니다. 멀티 에이전트 시스템을 도입하여 에피소드별 서사 아크를 식별하고, 캐릭터의 목소리가 일관되게 유지되는지를 평가하는 '대사 진정성 점수(Dialogue Authenticity Scoring)' 모델을 살피고 있습니다. 이는 창의적 영역인 대본을 객관적 지표로 변환하여 의사결정권자에게 데이터에 기반한 확신을 제공하는 자산이 될 것입니다.*

***표준 포맷 파싱 및 보안 중심 아키텍처 수립***

*할리우드 표준인 Fountain 및 PDF 스크립트에서 장면 번호, 대사, 지문을 정밀하게 분리하기 위해 Jouvence와 같은 전용 라이브러리를 활용한 데이터 파이프라인을 구체화했습니다. 특히 입력된 시나리오의 지적재산권 보호를 위해 독립적인 벡터 공간을 활용한 보안 설계를 우선순위에 두고 있습니다. 다음 단계로는 특정 트로프(Trope)를 의미론적으로 임베딩하여 유사 흥행작과 매칭하는 로직을 고도화하고, 긴 문맥의 대본을 효율적으로 처리하기 위한 계층적 검색 증강 생성(RAG) 아키텍처를 최종 통합하는 과정을 진행할 계획입니다.*

***Researching websites...***

[arxiv.org](https://arxiv.org/html/2511.11857v1)

[Three Stage Narrative Analysis; Plot-Sentiment Breakdown, Structure Learning and Concept Detection \- arXiv.org](https://arxiv.org/html/2511.11857v1)

[researchgate.net](https://www.researchgate.net/publication/397701586_Three_Stage_Narrative_Analysis_Plot-Sentiment_Breakdown_Structure_Learning_and_Concept_Detection)

[(PDF) Three Stage Narrative Analysis; Plot-Sentiment Breakdown, Structure Learning and Concept Detection \- ResearchGate](https://www.researchgate.net/publication/397701586_Three_Stage_Narrative_Analysis_Plot-Sentiment_Breakdown_Structure_Learning_and_Concept_Detection)

[medium.com](https://medium.com/@cwc.annex/ai-screenplay-coverage-conversations-with-claude-449ceca015f8)

[AI Screenplay Coverage: Conversations With Claude | by malcolm wong | Medium](https://medium.com/@cwc.annex/ai-screenplay-coverage-conversations-with-claude-449ceca015f8)

[arxiv.org](https://arxiv.org/html/2502.16153v1)

[Understanding Screenwriters' Practices, Attitudes, and Future Expectations in Human-AI Co-Creation \- arXiv](https://arxiv.org/html/2502.16153v1)

[scitepress.org](https://www.scitepress.org/Papers/2025/133696/133696.pdf)

[Multi-Agent System for AI-Assisted Extraction of Narrative Arcs in TV Series \- SciTePress](https://www.scitepress.org/Papers/2025/133696/133696.pdf)

[mygreatlearning.com](https://www.mygreatlearning.com/blog/movie-success-prediction-using-ml/)

[Research : Movie Success Prediction Using ML \- Great Learning](https://www.mygreatlearning.com/blog/movie-success-prediction-using-ml/)

[urfjournals.org](https://urfjournals.org/open-access/predictive-analytics-for-box-office-success.pdf)

[Journal of Artificial Intelligence, Machine Learning and Data Science \- urfjournals.org — Virtualmin](https://urfjournals.org/open-access/predictive-analytics-for-box-office-success.pdf)

[scribd.com](https://www.scribd.com/document/884557404/39-Movie-Success-Prediction-Using-Data-Mining)

[Movie Success Prediction Using Data Mining | PDF | Machine Learning \- Scribd](https://www.scribd.com/document/884557404/39-Movie-Success-Prediction-Using-Data-Mining)

[aiscriptreader.com](https://aiscriptreader.com/blog/filmmaking-innovations/how-ai-predicts-box-office-success-from-scripts)

[How AI Predicts Box Office Success from Scripts \- AIScriptReader](https://aiscriptreader.com/blog/filmmaking-innovations/how-ai-predicts-box-office-success-from-scripts)

[filmustage.com](https://filmustage.com/)

[Filmustage: AI Pre-Production Assistant for Filmmakers & Studios](https://filmustage.com/)

[studiovity.com](https://studiovity.com/script-breakdown-software/)

[Script Breakdown Software & AI Screenplay Breakdown Tool | Studiovity](https://studiovity.com/script-breakdown-software/)

[blooper.ai](https://blooper.ai/blog/script-breakdown-mastery-techniques-that-save-production-time-and-budget)

[Script Breakdown Mastery: Techniques That Save Production Time and Budget \- Blooper.ai](https://blooper.ai/blog/script-breakdown-mastery-techniques-that-save-production-time-and-budget)

[shamelstudio.com](https://www.shamelstudio.com/blog/film-budget-guide)

[Guide to Creating a Film Budget \- Shamel Studio](https://www.shamelstudio.com/blog/film-budget-guide)

[medium.com](https://medium.com/@rivet.ai/from-script-to-funding-with-automated-film-budgets-c105005c8fd8)

[From Script to Funding with Automated Film Budgets | by RivetAI | Medium](https://medium.com/@rivet.ai/from-script-to-funding-with-automated-film-budgets-c105005c8fd8)

[docs.pinecone.io](https://docs.pinecone.io/integrations/llamaindex)

[LlamaIndex \- Pinecone Docs](https://docs.pinecone.io/integrations/llamaindex)

[langtrace.ai](https://www.langtrace.ai/blog/implementing-rag-using-llamaindex-pinecone-and-langtrace-a-step-by-step-guide)

[Implementing RAG using LlamaIndex, Pinecone and Langtrace: A Step-by-Step Guide](https://www.langtrace.ai/blog/implementing-rag-using-llamaindex-pinecone-and-langtrace-a-step-by-step-guide)

[firecrawl.dev](https://www.firecrawl.dev/blog/best-chunking-strategies-rag)

[Best Chunking Strategies for RAG (and LLMs) in 2026 \- Firecrawl](https://www.firecrawl.dev/blog/best-chunking-strategies-rag)

[developers.llamaindex.ai](https://developers.llamaindex.ai/python/examples/query_engine/multi_doc_auto_retrieval/multi_doc_auto_retrieval/)

[Structured Hierarchical Retrieval | LlamaIndex OSS Documentation \- LlamaParse](https://developers.llamaindex.ai/python/examples/query_engine/multi_doc_auto_retrieval/multi_doc_auto_retrieval/)

[eyelevel.ai](https://www.eyelevel.ai/post/most-accurate-rag)

[World's Most Accurate RAG? Langchain/Pinecone, LlamaIndex and EyeLevel Duke it Out](https://www.eyelevel.ai/post/most-accurate-rag)

[youtube.com](https://www.youtube.com/watch?v=UMYtqHptYvA)

[Guide to Architect Secure AI Agents: Best Practices for Safety \- YouTube](https://www.youtube.com/watch?v=UMYtqHptYvA)

[keystonecorp.com](https://keystonecorp.com/cybersecurity/it-security-architecture-frameworks-best-practices-phases/)

[IT Security Architecture: Frameworks & Best Practices \- Keystone Technology Consultants](https://keystonecorp.com/cybersecurity/it-security-architecture-frameworks-best-practices-phases/)

[lumia.security](https://www.lumia.security/blog/how-to-build-a-security-architecture-for-the-ai-era)

[How to Build a Security Architecture for the AI Era](https://www.lumia.security/blog/how-to-build-a-security-architecture-for-the-ai-era)

[redhat.com](https://www.redhat.com/en/blog/top-10-security-architecture-patterns-llm-applications)

[Top 10 security architecture patterns for LLM applications \- Red Hat](https://www.redhat.com/en/blog/top-10-security-architecture-patterns-llm-applications)

***관객층 예측을 위한 '4-사분면' 테마 매핑 로직 구체화***

*시나리오의 핵심 테마를 분석하여 남성, 여성, 25세 이상 및 미만의 네 가지 주요 관객층(Four-Quadrant) 중 어디에 집중되는지 예측하는 분류 체계를 정교화하고 있습니다. 예를 들어 '하이 컨셉' 소재나 시각적 스펙터클은 글로벌 젊은 층을, 캐릭터 중심의 서사나 노스탤지어 테마는 중장년층을 타겟팅하는 할리우드 개발 임원들의 의사결정 로직을 데이터 피처로 변환하고 있습니다. 이를 통해 시나리오가 어떤 인구통계학적 집단에 가장 강력한 소구력을 갖는지 수치화된 지표를 도출할 수 있습니다.*

***시나리오 내 시각 효과 및 제작 난이도의 비용 수치화***

*텍스트 분석을 통해 시각 효과(VFX)의 밀도와 촬영 장소의 복잡성을 식별하고, 이를 실제 달러(USD) 단위의 제작비 범주로 변환하는 산출 로직을 검토하고 있습니다. 단순한 배경 설명에서 특수 효과가 필요한 샷(Shot)의 난이도를 '기초, 표준, 정교함'의 3단계로 구분하고, 각 단계별 평균 비용 벤치마크를 적용하여 예산 초과 리스크를 탐지하는 방식입니다. 이는 제작 승인 단계에서 시나리오의 경제적 실행 가능성을 평가하는 강력한 도구가 될 것입니다.*

***표준 레이아웃 인식 및 관람 등급 예측 엔진 통합***

*할리우드 표준 PDF의 들여쓰기 규칙과 레이아웃 특성을 인식하여 캐릭터 이름, 대사, 지문을 오차 없이 분리하는 파이썬 기반 파이프라인의 최종 사양을 점검하고 있습니다. 특히 대본 내 폭력성, 언어 사용, 성적 묘사 관련 키워드 밀도를 분석하여 MPAA 관람 등급을 사전 예측하는 분류 모델을 시스템에 통합할 계획입니다. 향후에는 이러한 정량적 분석 결과와 유사 흥행작과의 '트로프' 매칭 리포트를 결합하여, 제작사가 즉시 활용 가능한 엔드투엔드 평가 시스템의 최종 아키텍처를 완성할 예정입니다.*

***Researching websites...***

[jotterpad.app](https://jotterpad.app/how-to-format-a-screenplay/)

[How to Format a Screenplay \- JotterPad](https://jotterpad.app/how-to-format-a-screenplay/)

[scribophile.com](https://www.scribophile.com/academy/how-to-format-a-screenplay)

[How to Format a Screenplay: Dialogue, Margins, Spacing & Examples (2026) \- Scribophile](https://www.scribophile.com/academy/how-to-format-a-screenplay)

[dramatistsguild.com](https://www.dramatistsguild.com/sites/default/files/2020-01/General-SFI-Formatting-Guidelines-Complete.pdf)

[FORMATTING GUIDELINES \- Dramatists Guild](https://www.dramatistsguild.com/sites/default/files/2020-01/General-SFI-Formatting-Guidelines-Complete.pdf)

[sjsu.edu](https://www.sjsu.edu/writingcenter/docs/handouts/Scriptwriting%20Format.pdf)

[Scriptwriting Format \- San Jose State University](https://www.sjsu.edu/writingcenter/docs/handouts/Scriptwriting%20Format.pdf)

[storysense.com](https://www.storysense.com/spformat.pdf)

[Screenplay Format Guide by Story Sense®](https://www.storysense.com/spformat.pdf)

[highpointnc.gov](https://www.highpointnc.gov/993/MPAA-Rating-System)

[MPAA Rating System | High Point, NC](https://www.highpointnc.gov/993/MPAA-Rating-System)

[randalolson.com](https://www.randalolson.com/2014/01/12/a-look-at-sex-drugs-violence-and-cursing-in-film-over-time-through-mpaa-ratings/)

[A look at sex, drugs, violence, and cursing in film over time through MPAA ratings](https://www.randalolson.com/2014/01/12/a-look-at-sex-drugs-violence-and-cursing-in-film-over-time-through-mpaa-ratings/)

[arno.uvt.nl](http://arno.uvt.nl/show.cgi?fid=157412)

[Prediction of Motion Picture Association of America Ratings Using Emotion Analysis and Text Classification Approaches \- http](http://arno.uvt.nl/show.cgi?fid=157412)

[aclanthology.org](https://aclanthology.org/2020.lrec-1.166.pdf)

[Age Suitability Rating: Predicting the MPAA Rating Based on Movie Dialogues \- ACL Anthology](https://aclanthology.org/2020.lrec-1.166.pdf)

[vfxpick.com](https://vfxpick.com/news/shot-intelligence-how-smart-vfx-shot-planning-cuts-cost-by-40/)

[VFX Shot Planning & Breakdown to Cut Costs \- VFXPICK](https://vfxpick.com/news/shot-intelligence-how-smart-vfx-shot-planning-cuts-cost-by-40/)

[digikorevfx.com](https://digikorevfx.com/vfx-budgeting-without-guesswork-how-to-bid-smart-deliver-smooth-stay-profitable/)

[Smart VFX Budgeting: From Guesswork to Profit-Driven Planning](https://digikorevfx.com/vfx-budgeting-without-guesswork-how-to-bid-smart-deliver-smooth-stay-profitable/)

[filmustage.com](https://filmustage.com/blog/how-vfx-breakdowns-can-cut-film-production-costs/)

[How VFX Breakdowns Can Cut Film Production Costs \- Filmustage Blog](https://filmustage.com/blog/how-vfx-breakdowns-can-cut-film-production-costs/)

[aws.amazon.com](https://aws.amazon.com/blogs/media/democratizing-vfx-bidding-amazon-q-business-transforms-cost-estimation/)

[Democratizing VFX bidding: Amazon Q Business transforms cost estimation \- AWS](https://aws.amazon.com/blogs/media/democratizing-vfx-bidding-amazon-q-business-transforms-cost-estimation/)

[exaspicemedia.com](https://exaspicemedia.com/blog/plan-to-perfection-a-step-by-step-vfx-budgeting-checklist)

[Plan to Perfection: A Step-by-Step VFX Budgeting Checklist \- Exa Spice Media](https://exaspicemedia.com/blog/plan-to-perfection-a-step-by-step-vfx-budgeting-checklist)

***헐리우드 표준 레이아웃의 정밀 파싱 메커니즘 수립***

*표준 PDF 시나리오의 인치(inch) 단위 들여쓰기 규칙을 분석하여 캐릭터 이름(3.7인치), 대사(2.5인치), 지문(1.5인치)을 정확히 식별하는 정밀 파싱 로직을 체계화했습니다. Jouvence나 Screenplain 같은 전용 라이브러리를 통해 Fountain 포맷과의 호환성을 확보하고, 시나리오의 구조적 요소를 손실 없이 데이터화하는 파이프라인을 점검하고 있습니다. 이는 텍스트 뭉치에서 장면 번호와 화자를 분리해내어 이후 진행될 다차원 분석의 신뢰도를 담보하는 기술적 초석이 됩니다.*

***관람 등급 및 흥행 변수의 다각적 상관관계 규명***

*대본 내 폭력성, 언어 사용, 약물 묘사 등의 키워드 밀도를 분석하여 MPAA 관람 등급을 사전 예측하는 분류 모델의 유효성을 확인했습니다. 단순히 단어 빈도를 세는 것을 넘어, IMDB의 부모 가이드 데이터를 학습 라벨로 활용해 실제 심의 기준에 근접한 예측치를 도출하는 방식입니다. 또한, 시나리오 내의 특정 서사 장치인 '트로프'를 의미론적으로 임베딩하여 'Chatter' 데이터셋과 같은 기존 흥행작의 DNA와 대조함으로써, 타겟 관객층의 선호도와 ROI를 연결하는 논리적 연결 고리를 강화했습니다.*

***VFX 난이도별 제작비 추산 및 최종 시스템 통합***

*지문 분석을 통해 시각 효과가 필요한 샷을 작업 시간(20\~200시간)에 따라 3단계로 분류하고, 이를 기반으로 제작 예산의 BTL(Below-the-Line) 비용을 추산하는 벤치마크 모델을 수립했습니다. 이제까지 수집된 표준 포맷 인식 기술, 캐릭터 아크 그래프화, 그리고 4-사분면 관객 분석 모델을 하나의 엔드투엔드 아키텍처로 통합하는 최종 단계를 밟고 있습니다. 특히 시나리오 보안을 위한 독립적 네임스페이스 활용 전략을 포함하여, 제작사 결정권자가 즉시 활용 가능한 종합 평가 리포트 생성 기능을 완성할 계획입니다.*

