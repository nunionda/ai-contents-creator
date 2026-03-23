import type { ScriptElement } from "../../script/infrastructure/parser";
import type { MarketLocale } from "../../shared/MarketConfig";
import { TROPE_DICTIONARY } from "../data/filmCatalog";
import { KOREAN_TROPE_DICTIONARY } from "../data/koreanTropeDictionary";

export interface TropeResult {
  scriptId: string;
  tropes: string[];
}

// ─── Hollywood Trope Keyword Clusters ───

const TROPE_KEYWORDS: Record<string, string[]> = {
  'Anti-Hero': ['criminal', 'outlaw', 'reluctant', 'dark past', 'ruthless', 'morally', 'vigilante', 'antihero', 'anti-hero', 'corrupt', 'mercenary'],
  'Heist': ['steal', 'rob', 'robbery', 'vault', 'heist', 'break in', 'security', 'getaway', 'loot', 'safe', 'crew assembl', 'con artist'],
  'Time Travel': ['time travel', 'time machine', 'past', 'future', 'paradox', 'timeline', 'loop', 'back in time', 'flux', 'temporal'],
  'Coming of Age': ['teenager', 'adolescent', 'school', 'prom', 'graduate', 'grow up', 'first time', 'young', 'youth', 'childhood', 'innocence', 'puberty'],
  'Buddy Comedy': ['buddy', 'partner', 'duo', 'mismatched', 'odd couple', 'unlikely pair', 'team up', 'bickering', 'road trip'],
  'Twist Ending': ['reveal', 'truth is', 'actually', 'not what it seems', 'turns out', 'all along', 'secret identity', 'been lying', 'hidden truth'],
  'Revenge': ['revenge', 'avenge', 'vengeance', 'retaliation', 'payback', 'retribution', 'get back at', 'make them pay', 'settle the score'],
  'Chosen One': ['destiny', 'prophecy', 'chosen', 'the one', 'special power', 'fate', 'foretold', 'savior', 'fulfil'],
  'Fish Out of Water': ['new town', 'stranger', 'outsider', 'doesn\'t belong', 'foreign', 'out of place', 'culture shock', 'adapt', 'unfamiliar'],
  'Redemption': ['forgive', 'redeem', 'redemption', 'second chance', 'make amends', 'atone', 'reform', 'salvation', 'repent'],
  'Star-Crossed Lovers': ['forbidden love', 'can\'t be together', 'rival families', 'doomed romance', 'tragic love', 'star-crossed', 'love across'],
  'Underdog': ['unlikely', 'against all odds', 'no chance', 'prove', 'doubt', 'nobody believed', 'underdog', 'long shot', 'outmatched'],
  'Ensemble Cast': ['group', 'team', 'each character', 'multiple storylines', 'ensemble', 'interconnected', 'parallel lives'],
  'Mentor': ['teacher', 'mentor', 'trainer', 'master', 'wise', 'guide', 'train', 'apprentice', 'protege', 'student'],
  'Survival': ['survive', 'survival', 'stranded', 'wilderness', 'desert island', 'trapped', 'escape', 'fight for life', 'last one standing'],
  'Road Trip': ['road trip', 'drive', 'highway', 'journey', 'cross-country', 'van', 'travel', 'on the road', 'roadside'],
  'Non-Linear': ['flashback', 'flash forward', 'years earlier', 'years later', 'timeline', 'out of order', 'nonlinear', 'non-linear'],
  'Unreliable Narrator': ['unreliable', 'imagined', 'delusion', 'hallucin', 'not real', 'in my head', 'can\'t trust', 'lying to'],
  'Post-Apocalypse': ['post-apocalyp', 'wasteland', 'after the fall', 'survivors', 'ruins', 'civilization fell', 'last city', 'nuclear'],
  'Dystopia': ['dystopia', 'totalitarian', 'oppressive', 'regime', 'surveillance', 'control', 'rebellion', 'resistance', 'freedom'],
  'Found Footage': ['camera', 'recording', 'footage', 'documentary', 'handheld', 'found tape', 'video diary'],
  'One-Man Army': ['alone', 'single-handedly', 'one man', 'one woman', 'army of one', 'solo mission', 'outnumbered'],
  'Double Cross': ['betray', 'betrayal', 'double cross', 'backstab', 'traitor', 'sold out', 'turned on', 'trust no one'],
  'Political Intrigue': ['politics', 'senator', 'election', 'conspiracy', 'cover-up', 'government', 'corruption', 'power play', 'campaign'],
  'Trapped': ['trapped', 'locked', 'confined', 'no way out', 'escape room', 'sealed', 'prisoner', 'cage', 'bunker'],
  'Strong Female Lead': ['she fights', 'heroine', 'warrior woman', 'strong woman', 'female lead', 'she leads', 'she commands'],
  'Family': ['family', 'father', 'mother', 'son', 'daughter', 'brother', 'sister', 'reunion', 'estranged', 'orphan', 'adoption'],
  'Dark Comedy': ['dark humor', 'dark comedy', 'morbid', 'gallows humor', 'ironic', 'absurd', 'satirical', 'cynical'],
  'Social Commentary': ['society', 'inequality', 'class', 'privilege', 'systemic', 'social', 'commentary', 'critique', 'satire'],
  'Class Divide': ['rich', 'poor', 'wealthy', 'poverty', 'upper class', 'lower class', 'mansion', 'slum', 'inequality', 'privilege'],
  'Based on True Story': ['based on', 'true story', 'real events', 'inspired by', 'actual', 'true account', 'biographical'],
  'Period Piece': ['century', 'era', 'historical', 'period', 'ancient', 'medieval', 'victorian', 'colonial', 'wartime'],
  'Rise to Power': ['rise', 'power', 'empire', 'kingdom', 'throne', 'ambition', 'climb', 'conquer', 'dominion'],
  'Fallen Hero': ['fallen', 'disgraced', 'former glory', 'washed up', 'has-been', 'lost everything', 'fall from grace'],
  'Amnesia': ['amnesia', 'memory', 'forget', 'can\'t remember', 'lost memory', 'who am i', 'identity crisis'],
  'Monster': ['monster', 'beast', 'creature', 'predator', 'hunting them', 'lurking', 'stalking', 'horror'],
  'Haunted House': ['haunted', 'ghost', 'spirit', 'house', 'mansion', 'paranormal', 'poltergeist', 'possession'],
  'Body Horror': ['transform', 'mutation', 'body', 'flesh', 'parasite', 'infected', 'growth', 'metamorphosis'],
  'Paranoia': ['paranoia', 'paranoid', 'watching', 'followed', 'they\'re coming', 'trust no one', 'surveillance', 'spy'],
  'Ticking Clock': ['deadline', 'countdown', 'hours left', 'time is running', 'before it\'s too late', 'ticking', 'clock', 'hurry'],
  'Sacrifice': ['sacrifice', 'give up', 'die for', 'lay down', 'selfless', 'noble death', 'martyr', 'ultimate price'],
  'Identity': ['identity', 'who am i', 'imposter', 'disguise', 'double life', 'assumed name', 'fake identity', 'doppelganger'],
  'Obsession': ['obsess', 'obsession', 'fixat', 'compuls', 'can\'t stop', 'consumed by', 'driven mad', 'stalker'],
  'Hidden Genius': ['genius', 'prodigy', 'brilliant', 'savant', 'gifted', 'intellectual', 'mastermind', 'extraordinary mind'],
  'Simulation': ['simulation', 'virtual', 'matrix', 'simulated', 'program', 'artificial world', 'not real', 'glitch'],
  'AI Consciousness': ['artificial intelligence', 'ai', 'sentient', 'robot', 'consciousness', 'self-aware', 'machine learning', 'android'],
  'Multiverse': ['multiverse', 'parallel', 'alternate', 'dimension', 'other world', 'portal', 'reality', 'universe'],
  'Music Driven': ['music', 'band', 'sing', 'concert', 'songwriter', 'rock', 'jazz', 'hip hop', 'orchestra', 'musician'],
  'Military': ['military', 'soldier', 'war', 'army', 'combat', 'battlefield', 'platoon', 'mission', 'deploy', 'general'],
  'Courtroom': ['trial', 'court', 'judge', 'jury', 'lawyer', 'attorney', 'verdict', 'guilty', 'innocent', 'testimony', 'objection'],
};

// ─── Korean Trope Keyword Clusters ───
// 교정 기준: Groq LLM Ground Truth 대비 Jaccard ≥40%
// 변경 원칙:
//   1. 범용 키워드 제거 (가족, 아들, 딸 등 모든 시나리오에 등장하는 단어)
//   2. 미감지 트로프 키워드 보강 (LLM이 찾았는데 DET이 못 찾은 트로프)
//   3. 오탐 트로프 키워드 정밀화 (DET이 찾았는데 LLM이 안 찾은 트로프)

const KOREAN_TROPE_KEYWORDS: Record<string, string[]> = {
  // ── Historical / Political ──
  'Military Coup (군사 쿠데타)': ['쿠데타', '반란군', '정변', '계엄령', '군사 반란', 'coup', 'martial law'],
  'Japanese Occupation Resistance (항일 독립운동)': ['독립', '항일', '일제', '광복', '독립군', '만세', '식민지', 'japanese occupation', 'resistance'],
  'Korean War Division (한국전쟁/분단)': ['한국전쟁', '6.25', '분단', '휴전선', '남북', '38선', '이산가족', '피난민', '인민군', 'korean war', 'division'],
  'Democratization Movement (민주화 운동)': ['민주화 운동', '학생운동', '광주 항쟁', '민주화 투쟁', '민주 항쟁', '시위대', 'democratization', 'protest movement'],
  'Political Thriller (정치 스릴러)': [
    '암살', '음모', '청와대', '대선',
    '정치 공작', '비밀 작전', '첩보', '밀정',
    'political thriller', 'conspiracy', 'assassination',
  ],
  'Based on True Events (실화 기반)': ['실화', '실제 사건', '기반으로', '모티브', '실존 인물', 'true story', 'based on', 'real events'],
  'National Tragedy (국가적 비극)': [
    '참사', '재난', '희생자', '추모', '구조', '침몰',
    '비극적', '희생양', '죽음을 맞', '목숨을 잃',
    'tragedy', 'disaster', 'victims',
  ],
  'Period Piece (시대극)': [
    '조선', '고려', '왕조', '궁궐', '양반', '시대극', '역사적', '사극', '왕비', '임금',
    '옛날', '과거의', '전통 의상', '갓을', '도포',
    'joseon', 'dynasty', 'historical', 'period',
  ],

  // ── Social / Class ──
  'Class Divide (계층 갈등)': [
    '부자', '가난', '계층', '상류', '하류', '불평등', '차별', '재벌', '빈곤',
    '있는 놈', '없는 놈', '금수저', '흙수저', '가진 자', '못 가진',
    '돈이', '돈을', '부유', '가난한', '빈부',
    'class', 'rich', 'poor', 'inequality', 'wealth',
  ],
  'Urban vs Rural (도시 vs 농촌)': ['시골에서', '농촌', '상경하', '귀향하', '시골 마을', 'rural', 'countryside', 'city vs country'],
  'Corporate Corruption (재벌 비리)': [
    '재벌', '회장', '비리', '횡령', '배임', '뇌물', '로비', '비자금', '탈세', '기업 범죄',
    '자금 세탁', '불법 자금', '탈취', '착복', '유용',
    'conglomerate', 'chaebol', 'corruption', 'embezzlement', 'laundering',
  ],
  'Education Pressure (입시 지옥)': ['입시', '수능', '학원비', '과외', '성적표', '재수', '수시', '정시', 'exam', 'education pressure'],
  'Housing Crisis (주거 문제)': ['전세 사기', '집값 폭등', '반지하', '옥탑방', '집을 잃', '노숙', '전세금', 'housing crisis'],
  'Social Commentary (사회 비판)': [
    '사회 비판', '풍자', '부조리', '시스템의 모순', '체제 비판',
    '불공정', '사회 문제', '사회적 메시지',
    'social commentary', 'critique', 'satire',
  ],
  'Corruption Exposé (부패 폭로)': [
    '부패', '폭로', '내부고발', '비리', '은폐', '진실을 밝', '기자', '언론', '증거', '제보', '특종',
    '고발하', '폭로하', '밝혀내', '드러나',
    'corruption', 'exposé', 'whistleblower', 'reveal',
  ],
  'Workplace Drama (직장 드라마)': [
    '퇴사', '야근', '회식',
    '직장 생활', '사내 정치', '인사이동',
    'office politics', 'workplace drama',
  ],

  // ── Family / Relationship ──
  'Family Sacrifice (가족의 희생)': [
    '가족을 위해', '자식을 위해', '부모의 희생', '가족의 희생',
    '목숨을 바치', '대신 죽', '살려내', '가족을 지키',
    '가족', '희생', '부모', '자식',
    'family sacrifice', 'sacrifice for family', 'family',
  ],
  'Generational Conflict (세대 갈등)': [
    '세대', '꼰대', '세대 차이', '세대 갈등', '구세대', '신세대',
    '어른들은', '젊은이들', '요즘 것들',
    'generation gap', 'generational',
  ],
  'Father-Son Bond (부자 관계)': [
    '아버지와 아들', '부자지간', '아버지 같은', '아버지처럼',
    '아버지를 위해', '아들을 위해', '부자 관계',
    '아버지의 뜻', '아버지의 마음',
    'father and son', 'father-son',
  ],
  'Filial Duty (효도/의무)': [
    '효도', '부모님을 모시', '봉양', '장남의 의무', '제사를 지내',
    '부모님께', '은혜를 갚',
    'filial', 'duty to parents',
  ],
  'Found Family (가족 같은 관계)': ['식구', '한솥밥', '가족 같', '가족이나 다름없', '형제 같', '동료애', 'found family', 'like family', 'bond'],
  'Star-Crossed Lovers (이루지 못한 사랑)': ['이별', '사랑', '운명', '금지', '신분', '허락', '비극', 'forbidden love', 'doomed', 'tragic love'],
  'Mentor-Student (사제 관계)': [
    '스승과 제자', '사범님', '도장에서', '가르침을', '수련을',
    '사부님', '사제 관계',
    'mentor and student', 'apprentice',
  ],

  // ── Cultural / Spiritual ──
  'Shamanism (무속 신앙)': [
    '무당', '굿판', '접신', '신내림', '영매', '점쟁이', '부적', '주술', '무속', '퇴마', '빙의',
    '굿을 하', '사당', '당산나무', '서낭당',
    'shaman', 'ritual', 'spirit medium', 'exorcism',
  ],
  'Han / Collective Grief (한)': [
    '한이 맺', '한을 풀', '한풀이', '서러움', '억울', '통곡', '설움', '원통', '비통',
    '눈물을 삼키', '가슴이 찢어지', '한 서린', '원한이',
    'collective grief', 'deep sorrow', 'resentment',
  ],
  'Jeong / Deep Bond (정)': [
    '정이 들', '정이 깊', '정을 나누', '정을 주', '정들어', '정나미',
    '정 때문에', '미워도 정', '떠나지 못하',
    'deep bond', 'emotional attachment',
  ],
  'Confucian Hierarchy (유교적 위계)': [
    '유교', '예절', '위계', '서열', '전통', '예의',
    '어른에게', '어른 앞에서', '윗사람', '아랫사람', '도리',
    'confucian', 'hierarchy', 'respect', 'elder',
  ],
  'Folk Horror (토속 공포)': [
    '전설', '저주', '토속', '괴담',
    '마을의 비밀', '금기', '제의', '희생 제물', '토착 신앙',
    '무덤을 파', '봉인된', '고대의',
    'folk horror', 'folk curse', 'village legend',
  ],
  'Buddhist Philosophy (불교 철학)': [
    '스님', '절에', '명상', '깨달음', '윤회', '해탈', '불교', '부처',
    '수행', '참선', '번뇌', '열반', '보살',
    'buddhist', 'temple', 'enlightenment', 'karma',
  ],
  'Historical Curse (역사적 저주)': [
    '저주', '봉인', '유물', '발굴', '고대', '무덤', '해골', '유해',
    '대대로', '선조의', '혈통', '저주받은', '풀리지 않는',
    'curse', 'ancient', 'artifact', 'cursed',
  ],

  // ── Genre Conventions ──
  'Revenge Drama (복수극)': [
    '복수', '원수', '응징', '보복', '앙갚음', '복수심', '되갚', '갚아',
    '복수를 다짐', '반드시 갚', '눈에는 눈',
    '앙심', '원한을', '되돌려', '용서하지 않',
    'revenge', 'avenge', 'vengeance', 'payback',
  ],
  'Gangster Saga (조폭 영화)': [
    '조폭', '두목', '조직폭력', '깡패', '조직원',
    '조직의 보스', '형님이라 부르',
    'gangster', 'mob boss',
  ],
  'Survival Game (생존 게임)': ['생존', '게임', '탈락', '경쟁', '살아남', '규칙', '참가자', 'survival', 'game', 'eliminate'],
  'Heist (도둑/강탈)': [
    '도둑', '강도', '훔치', '한탕', '강탈', '빼돌리', '탈취',
    '자금 세탁', '비트코인', '해킹',
    'heist', 'robbery', 'vault',
  ],
  'Military Action (군사 액션)': [
    '특수부대', '전투 작전', '병사들', '전장에서', '군사 작전',
    '군대에서', '입대', '훈련병',
    'military operation', 'soldier', 'combat mission',
  ],
  'Twist Ending (반전)': [
    '사실은', '알고 보니', '뒤집', '충격적 진실',
    '모든 것이 거짓', '처음부터', '반전이',
    'twist', 'reveal', 'all along',
  ],
  'Dark Comedy (블랙 코미디)': [
    '블랙 코미디', '풍자적', '아이러니하게', '우스꽝스러운',
    '웃기면서도 슬', '비극적 희극',
    'dark comedy', 'satire', 'ironic', 'absurd',
  ],
  'Ensemble Investigation (합동 수사)': [
    '합동 수사', '수사팀', '수사본부', '프로파일링',
    '단서를 추적', '공조 수사', '합동 작전',
    'joint investigation', 'task force',
  ],
  'Underdog Hero (약자의 승리)': [
    '약자', '패배', '역전', '도전', '극복',
    '무시당하', '얕보', '바닥에서', '아무도 믿지 않',
    '이겨내', '일어서', '성공하',
    'underdog', 'overcome', 'against odds', 'prove them wrong',
  ],
  'Sacrifice & Redemption (희생과 구원)': [
    '희생', '구원', '구해내', '목숨을 걸고', '대신 죽',
    '속죄', '구출', '목숨 바치', '구하', '살리',
    'sacrifice', 'save', 'redemption', 'atone',
  ],
  'Coming of Age (성장)': [
    '성장하', '학생', '청소년', '졸업', '어른이 되', '사춘기', '방황',
    '세상을 배우', '처음으로',
    'coming of age', 'growing up', 'teenager',
  ],
  'Chase/Pursuit (추격)': ['추격전', '도망치', '추적하', '도주하', '쫓아가', '뒤쫓', 'chase', 'pursuit', 'escape'],
  'Isolation/Confinement (고립/감금)': [
    '고립된', '감금당하', '밀실에', '탈출하',
    '갇혀 있', '가둬 놓', '갇힌 채',
    'isolation', 'confined', 'trapped', 'locked in',
  ],
  'Double Identity (이중 정체성)': [
    '이중 생활', '이중 정체', '위장 신분', '변장하',
    '가짜 신분', '진짜 모습', '본 모습',
    'double identity', 'double life', 'alias',
  ],
  'Ensemble Cast (앙상블 캐스트)': ['교차 편집', '동시다발', '각자의 이야기', '옴니버스', '병렬 구조', 'ensemble', 'interconnected', 'multiple storylines'],
  'Anti-Hero (안티히어로)': ['안티 히어로', '반영웅', '범죄자이지만', '불법이지만', 'anti-hero', 'antihero', 'vigilante'],
  'Undercover (잠입 수사)': [
    '잠입', '위장', '스파이', '첩보', '밀정', '비밀 요원', '정보원',
    '잠입 수사', '위장 신분', '신분을 숨기',
    '몰래', '잠복', '내부자',
    'undercover', 'spy', 'infiltrate', 'mole',
  ],
  'Courtroom (법정극)': [
    '법정에서', '재판을', '배심원', '판결을', '무죄를', '유죄를',
    '법정 공방', '증인 심문', '법정 드라마',
    'courtroom', 'verdict', 'testimony',
  ],
  'Noraebang/Drinking Scene (노래방/술자리)': [
    '노래방에서', '회식 자리', '건배를',
    '노래방 장면', '술 마시며',
    'karaoke', 'drinking scene',
  ],
  'Rooftop/Banjiha Setting (옥탑방/반지하)': ['옥탑방에서', '반지하 방', '좁은 원룸', '다세대 주택', 'rooftop room', 'semi-basement'],
};

// ─── Minimum Threshold per Trope ───
// 범용 키워드가 많은 트로프는 높은 threshold 요구

const TROPE_MIN_THRESHOLD: Record<string, number> = {
  // 매우 범용적 키워드 → 높은 threshold로 false positive 차단
  'Workplace Drama (직장 드라마)': 6,
  'Based on True Events (실화 기반)': 5,
  'Military Coup (군사 쿠데타)': 5,
  'Education Pressure (입시 지옥)': 5,
  'Japanese Occupation Resistance (항일 독립운동)': 5,
  'Ensemble Investigation (합동 수사)': 6,
  'Isolation/Confinement (고립/감금)': 6,
  'Survival Game (생존 게임)': 6,
  'Gangster Saga (조폭 영화)': 8,
  'Urban vs Rural (도시 vs 농촌)': 4,
  'Housing Crisis (주거 문제)': 4,
  'Social Commentary (사회 비판)': 4,
  'Heist (도둑/강탈)': 5,
  'Courtroom (법정극)': 5,
  'Democratization Movement (민주화 운동)': 4,
  'Corporate Corruption (재벌 비리)': 6,
  'Rooftop/Banjiha Setting (옥탑방/반지하)': 4,
  // 범용 키워드가 있지만 family/social 맥락에서 중요 → 중간 threshold
  'Family Sacrifice (가족의 희생)': 4,
  'Father-Son Bond (부자 관계)': 4,
  'Noraebang/Drinking Scene (노래방/술자리)': 4,
  'Mentor-Student (사제 관계)': 4,
  'Political Thriller (정치 스릴러)': 5,
  'Double Identity (이중 정체성)': 4,
  'Coming of Age (성장)': 4,
  // 장르 키워드 오탐 방지 — 문화 트로프는 3으로 유지
  'Dark Comedy (블랙 코미디)': 4,
  'Military Action (군사 액션)': 4,
  'Twist Ending (반전)': 4,
  'Folk Horror (토속 공포)': 3,
  'Anti-Hero (안티히어로)': 4,
  'Han / Collective Grief (한)': 3,
  'Jeong / Deep Bond (정)': 3,
};

const DEFAULT_THRESHOLD = 2;

// ─── Scoring Algorithm ───

/** Returns true if the string contains any Korean syllable (U+AC00-U+D7AF) */
function isKoreanKeyword(kw: string): boolean {
  return /[\uAC00-\uD7AF]/.test(kw);
}

function scoreTropes(
  text: string,
  dictionary: string[],
  keywordMap: Record<string, string[]>,
): string[] {
  const lower = text.toLowerCase();
  const scores: { trope: string; score: number }[] = [];

  for (const trope of dictionary) {
    const keywords = keywordMap[trope];
    if (!keywords || keywords.length === 0) continue;

    let score = 0;
    const MAX_PER_KEYWORD = 3; // cap per-keyword contribution to reward diversity over frequency
    for (const kw of keywords) {
      const kwLower = kw.toLowerCase();
      let kwCount = 0;
      // Korean keywords: \b doesn't work for CJK — always use indexOf
      if (isKoreanKeyword(kw)) {
        let idx = 0;
        while ((idx = lower.indexOf(kwLower, idx)) !== -1) {
          kwCount++;
          idx += kwLower.length;
        }
      } else if (kw.length <= 2) {
        // Very short English keywords: require word boundary to reduce false positives
        const regex = new RegExp(`\\b${kw}\\b`, 'gi');
        const matches = lower.match(regex);
        if (matches) kwCount = matches.length;
      } else {
        let idx = 0;
        while ((idx = lower.indexOf(kwLower, idx)) !== -1) {
          kwCount++;
          idx += kwLower.length;
        }
      }
      score += Math.min(kwCount, MAX_PER_KEYWORD);
    }

    const minThreshold = TROPE_MIN_THRESHOLD[trope] ?? DEFAULT_THRESHOLD;
    if (score >= minThreshold) {
      scores.push({ trope, score });
    }
  }

  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(s => s.trope);
}

// ─── Synopsis Builder (full script, no LLM token limit) ───

function buildFullSynopsis(elements: ScriptElement[]): string {
  const lines: string[] = [];

  for (const el of elements) {
    if (el.type === 'scene_heading') {
      lines.push(`\n[${el.text}]`);
    } else if (el.type === 'action') {
      lines.push(el.text);
    } else if (el.type === 'dialogue') {
      lines.push(el.text);
    }
  }

  return lines.join('\n');
}

// ─── Public API (no LLM dependency) ───

export class TropeAnalyzer {
  analyze(scriptId: string, elements: ScriptElement[], market: MarketLocale = 'hollywood'): TropeResult {
    const synopsis = buildFullSynopsis(elements);
    const dictionary = market === 'korean' ? KOREAN_TROPE_DICTIONARY : TROPE_DICTIONARY;
    const keywordMap = market === 'korean' ? KOREAN_TROPE_KEYWORDS : TROPE_KEYWORDS;

    const tropes = scoreTropes(synopsis, dictionary, keywordMap);

    return { scriptId, tropes };
  }
}
