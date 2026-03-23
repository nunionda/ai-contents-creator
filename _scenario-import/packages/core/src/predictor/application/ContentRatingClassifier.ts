import type { ScriptElement } from "../../script/infrastructure/parser";
import type { ContentRating, MarketLocale } from "../../shared/MarketConfig";

// ─── Content Keyword Dictionaries (EN + KO) ───

interface SeverityKeywords {
  severe: string[];
  moderate: string[];
  mild: string[];
}

const VIOLENCE_KEYWORDS: SeverityKeywords = {
  severe: [
    'murder', 'slaughter', 'gore', 'dismember', 'torture', 'mutilate', 'decapitate', 'massacre', 'butcher',
    '학살', '고문', '참수', '도살', '경동맥', '절단', '목을 따',
  ],
  moderate: [
    'shoot', 'stab', 'blood', 'kill', 'fight', 'attack', 'wound', 'slash', 'choke', 'strangle',
    'gun', 'knife', 'sword', 'bullet', 'explode', 'assault', 'brawl', 'smash', 'crush', 'beat',
    '살인', '살해', '잔혹', '처형', '시체', '피투성이',
    '피가', '피를', '핏줄', '선홍', '죽이', '싸움', '공격', '칼부림', '총격', '난투', '습격',
    '찌르', '두들겨', '폭행', '총알', '상처', '흉기', '단검', '저격',
    '내리치', '난도질', '목을 조',
    '칼날', '칼끝', '피바다', '혈흔', '총을', '총으로', '칼을', '칼로',
  ],
  mild: [
    'punch', 'hit', 'push', 'shove', 'struggle', 'slap', 'kick', 'grab', 'tackle', 'wrestle',
    '때리', '밀치', '몸싸움', '뺨을', '주먹', '발길질',
    '넘어지', '내동댕이', '위협', '협박', '비명',
  ],
};

const PROFANITY_KEYWORDS: SeverityKeywords = {
  severe: [
    'fuck', 'fucking', 'motherfuck', 'motherfucker', 'cocksucker',
    '씨발', '좆', '개새끼', '씹새', '씹할', '지랄',
  ],
  moderate: [
    'shit', 'damn', 'hell', 'ass', 'asshole', 'bitch', 'bastard', 'crap', 'piss', 'dick', 'whore',
    '젠장', '개자식', '개같', '썅', '미친놈', '미친년', '빡치', '새끼',
    '나쁜놈', '나쁜년', '개놈', '죽여버', '죽일놈',
  ],
  mild: [
    'suck', 'stupid', 'idiot', 'jerk', 'dumb', 'fool', 'moron', 'loser',
    '바보', '멍청', '빠가', '등신', '얼간이', '한심', '찌질',
  ],
};

const SEXUAL_KEYWORDS: SeverityKeywords = {
  severe: [
    'intercourse', 'orgasm', 'masturbat', 'penetrat', 'genital', 'erect',
    '성관계', '오르가즘', '자위행위', '성행위', '성적 삽입',
  ],
  moderate: [
    'sex', 'nude', 'naked', 'undress', 'seduce', 'moan', 'breast', 'strip', 'intimate', 'fondle', 'grope',
    '나체', '알몸', '옷을 벗', '유혹하', '신음', '애무',
  ],
  mild: [
    'kiss', 'caress', 'flirt', 'attract', 'desire', 'passionate', 'sensual', 'embrace',
    '키스', '설레', '포옹', '입맞춤',
  ],
};

const DRUG_KEYWORDS: SeverityKeywords = {
  severe: [
    'cocaine', 'heroin', 'meth', 'methamphetamine', 'inject', 'overdose', 'crack', 'fentanyl',
    '코카인', '헤로인', '필로폰', '주사기', '과다복용', '마약 투여',
  ],
  moderate: [
    'marijuana', 'weed', 'joint', 'dealer', 'snort', 'stoned', 'hash', 'ecstasy', 'mushroom', 'acid', 'lsd',
    '대마초', '마약', '흡입', '마약상', '환각제', '본드 흡입', '각성제',
  ],
  mild: [
    'drink', 'drunk', 'alcohol', 'pill', 'beer', 'wine', 'whiskey', 'vodka', 'soju', 'intoxicated',
    '술을', '술에', '술잔', '술병', '취해', '취한', '소주', '맥주', '만취', '비틀거리',
    '위스키', '보드카',
  ],
};

// ─── Content Counts ───

interface ContentCounts {
  violence: number;
  profanity: number;
  sexualContent: number;
  drugReferences: number;
}

interface DetailedCounts {
  violenceSevere: number;
  violenceModerate: number;
  violenceMild: number;
  profanitySevere: number;
  profanityModerate: number;
  profanityMild: number;
  sexualSevere: number;
  sexualModerate: number;
  sexualMild: number;
  drugSevere: number;
  drugModerate: number;
  drugMild: number;
}

// ─── Keyword Counter ───

/** Returns true if the string contains any Korean syllable (U+AC00-U+D7AF) */
function isKoreanKeyword(kw: string): boolean {
  return /[\uAC00-\uD7AF]/.test(kw);
}

function countKeywordMatches(text: string, keywords: string[]): number {
  let count = 0;
  const lower = text.toLowerCase();
  for (const kw of keywords) {
    const kwLower = kw.toLowerCase();
    // Korean keywords: \b doesn't work for CJK — always use indexOf
    if (isKoreanKeyword(kw)) {
      let idx = 0;
      while ((idx = lower.indexOf(kwLower, idx)) !== -1) {
        count++;
        idx += kwLower.length;
      }
    } else if (kw.length <= 5) {
      // Short English keywords (≤5 chars): word boundary to prevent substring matches
      // e.g. 'hell' shouldn't match 'hello', 'dick' shouldn't match 'dictionary'
      const regex = new RegExp(`\\b${kw}\\b`, 'gi');
      const matches = lower.match(regex);
      if (matches) count += matches.length;
    } else {
      let idx = 0;
      while ((idx = lower.indexOf(kwLower, idx)) !== -1) {
        count++;
        idx += kwLower.length;
      }
    }
  }
  return count;
}

function countAllCategories(text: string): DetailedCounts {
  return {
    violenceSevere: countKeywordMatches(text, VIOLENCE_KEYWORDS.severe),
    violenceModerate: countKeywordMatches(text, VIOLENCE_KEYWORDS.moderate),
    violenceMild: countKeywordMatches(text, VIOLENCE_KEYWORDS.mild),
    profanitySevere: countKeywordMatches(text, PROFANITY_KEYWORDS.severe),
    profanityModerate: countKeywordMatches(text, PROFANITY_KEYWORDS.moderate),
    profanityMild: countKeywordMatches(text, PROFANITY_KEYWORDS.mild),
    sexualSevere: countKeywordMatches(text, SEXUAL_KEYWORDS.severe),
    sexualModerate: countKeywordMatches(text, SEXUAL_KEYWORDS.moderate),
    sexualMild: countKeywordMatches(text, SEXUAL_KEYWORDS.mild),
    drugSevere: countKeywordMatches(text, DRUG_KEYWORDS.severe),
    drugModerate: countKeywordMatches(text, DRUG_KEYWORDS.moderate),
    drugMild: countKeywordMatches(text, DRUG_KEYWORDS.mild),
  };
}

// ─── MPAA Classification ───

function classifyMPAA(d: DetailedCounts): { rating: ContentRating; reasons: string[] } {
  const reasons: string[] = [];

  // NC-17
  if (d.sexualSevere >= 1 || d.violenceSevere >= 5) {
    if (d.sexualSevere >= 1) reasons.push('Explicit sexual content');
    if (d.violenceSevere >= 5) reasons.push('Extreme graphic violence');
    return { rating: 'NC-17', reasons };
  }

  // R
  if (d.profanitySevere >= 2 || d.violenceModerate >= 5 || d.violenceSevere >= 1 ||
      d.drugSevere >= 1 || d.sexualModerate >= 2) {
    if (d.profanitySevere >= 2) reasons.push(`Strong language (${d.profanitySevere} instances)`);
    if (d.violenceSevere >= 1) reasons.push('Severe violence');
    if (d.violenceModerate >= 5) reasons.push(`Sustained moderate violence (${d.violenceModerate} instances)`);
    if (d.drugSevere >= 1) reasons.push('Hard drug use depicted');
    if (d.sexualModerate >= 2) reasons.push('Sexual content');
    return { rating: 'R', reasons };
  }

  // PG-13
  if (d.profanitySevere === 1 || d.violenceModerate >= 2 || d.sexualMild >= 1 ||
      d.drugModerate >= 1 || d.profanityModerate >= 3) {
    if (d.profanitySevere === 1) reasons.push('Single use of strong language');
    if (d.violenceModerate >= 2) reasons.push('Moderate violence');
    if (d.sexualMild >= 1) reasons.push('Mild sexual content');
    if (d.drugModerate >= 1) reasons.push('Drug references');
    if (d.profanityModerate >= 3) reasons.push('Recurring moderate language');
    return { rating: 'PG-13', reasons };
  }

  // PG
  if (d.violenceMild >= 1 || d.profanityMild >= 1 || d.profanityModerate >= 1 ||
      d.drugMild >= 1) {
    if (d.violenceMild >= 1) reasons.push('Mild action violence');
    if (d.profanityMild >= 1 || d.profanityModerate >= 1) reasons.push('Mild language');
    if (d.drugMild >= 1) reasons.push('Brief alcohol/substance reference');
    return { rating: 'PG', reasons };
  }

  // G
  return { rating: 'G', reasons: ['No objectionable content detected'] };
}

// ─── KMRB Classification ───

function classifyKMRB(d: DetailedCounts): { rating: ContentRating; reasons: string[] } {
  const reasons: string[] = [];

  // RESTRICTED (극소수 — 극단적 폭력/성적 묘사가 반복적으로 등장)
  if (d.sexualSevere >= 8 || d.violenceSevere >= 15) {
    if (d.sexualSevere >= 8) reasons.push('극단적 성적 묘사');
    if (d.violenceSevere >= 15) reasons.push('극단적 폭력 묘사');
    return { rating: 'RESTRICTED', reasons };
  }

  // 19+ (노골적 폭력/성적/약물)
  if (d.sexualSevere >= 3 || d.violenceSevere >= 5 || d.drugSevere >= 5 || d.sexualModerate >= 8) {
    if (d.sexualSevere >= 3) reasons.push('노골적 성적 표현');
    if (d.violenceSevere >= 5) reasons.push(`심한 폭력 묘사 (${d.violenceSevere}건)`);
    if (d.drugSevere >= 5) reasons.push('마약 관련 묘사');
    if (d.sexualModerate >= 8) reasons.push('지속적 성적 표현');
    return { rating: '19+', reasons };
  }

  // 15+ (중간 수준 폭력/욕설/성적 암시/약물)
  if (d.violenceModerate >= 5 || d.profanitySevere >= 2 || d.sexualModerate >= 2 ||
      d.drugModerate >= 2 || d.violenceSevere >= 1 || d.profanityModerate >= 8 ||
      d.violenceMild >= 10) {
    if (d.violenceModerate >= 5) reasons.push('중간 수준 폭력');
    if (d.violenceSevere >= 1) reasons.push('일부 심한 폭력');
    if (d.violenceMild >= 10) reasons.push('반복적 경미한 폭력');
    if (d.profanitySevere >= 2) reasons.push('강한 욕설');
    if (d.profanityModerate >= 8) reasons.push('반복적 비속어');
    if (d.sexualModerate >= 2) reasons.push('성적 암시');
    if (d.drugModerate >= 2) reasons.push('약물 관련 표현');
    return { rating: '15+', reasons };
  }

  // 12+ (경미한 수준)
  if (d.violenceMild >= 3 || d.profanityModerate >= 2 || d.violenceModerate >= 1 || d.drugMild >= 5) {
    if (d.violenceMild >= 3 || d.violenceModerate >= 1) reasons.push('경미한 폭력 장면');
    if (d.profanityModerate >= 2) reasons.push('일부 비속어');
    if (d.drugMild >= 5) reasons.push('음주 장면');
    return { rating: '12+', reasons };
  }

  // ALL
  return { rating: 'ALL', reasons: ['부적절한 콘텐츠 없음'] };
}

// ─── Confidence Calculation ───

function computeConfidence(rating: ContentRating, d: DetailedCounts, market: MarketLocale): number {
  // Compute how "clear-cut" the rating is based on distance from the nearest boundary
  const totalSevere = d.violenceSevere + d.profanitySevere + d.sexualSevere + d.drugSevere;
  const totalModerate = d.violenceModerate + d.profanityModerate + d.sexualModerate + d.drugModerate;
  const totalMild = d.violenceMild + d.profanityMild + d.sexualMild + d.drugMild;
  const totalAll = totalSevere + totalModerate + totalMild;

  if (totalAll === 0) return 0.95; // G/ALL with no content = high confidence

  if (market === 'hollywood') {
    switch (rating) {
      case 'NC-17': return totalSevere >= 8 ? 0.98 : 0.85;
      case 'R': return totalSevere >= 3 || totalModerate >= 8 ? 0.95 : 0.80;
      case 'PG-13': return totalModerate >= 4 ? 0.90 : 0.75;
      case 'PG': return totalMild >= 3 ? 0.90 : 0.80;
      default: return 0.95;
    }
  } else {
    switch (rating) {
      case 'RESTRICTED': return totalSevere >= 10 ? 0.98 : 0.85;
      case '19+': return totalSevere >= 5 ? 0.95 : 0.80;
      case '15+': return totalModerate >= 5 ? 0.90 : 0.75;
      case '12+': return totalMild >= 4 ? 0.90 : 0.80;
      default: return 0.95;
    }
  }
}

// ─── Public API (no LLM dependency) ───

export class ContentRatingClassifier {
  classify(scriptId: string, elements: ScriptElement[], market: MarketLocale = 'hollywood'): {
    rating: ContentRating;
    reasons: string[];
    confidence: number;
    contentCounts?: ContentCounts;
  } {
    // Collect all dialogue and action text
    const text = elements
      .filter(e => e.type === 'dialogue' || e.type === 'action')
      .map(e => e.text)
      .join('\n');

    // Count keyword matches across all severity levels
    const detailed = countAllCategories(text);

    // Classify based on market
    const { rating, reasons } = market === 'korean'
      ? classifyKMRB(detailed)
      : classifyMPAA(detailed);

    const confidence = computeConfidence(rating, detailed, market);

    const contentCounts: ContentCounts = {
      violence: detailed.violenceSevere + detailed.violenceModerate + detailed.violenceMild,
      profanity: detailed.profanitySevere + detailed.profanityModerate + detailed.profanityMild,
      sexualContent: detailed.sexualSevere + detailed.sexualModerate + detailed.sexualMild,
      drugReferences: detailed.drugSevere + detailed.drugModerate + detailed.drugMild,
    };

    return { rating, reasons, confidence, contentCounts };
  }
}
