/**
 * Naming Convention Utility
 *
 * Script Import:  {slug}_{YYMMDD}_v{NNN}
 * PDF Export:     {slug}_report_{YYMMDD}_v{NNN}_{locale}.pdf
 *
 * Slug rules:
 *   - Extract title tokens from filename (strip dates, authors, meta keywords)
 *   - Korean titles are translated to English via dictionary lookup (fallback: romanization)
 *   - Max 2 meaningful tokens, hyphen-joined, max 30 chars
 *
 * Examples:
 *   "전율미궁_귀신의집_시나리오_김진영_20260320.pdf" → thrill-maze_260323_v001
 *   "비트세비어_260320.pdf"                        → beat-savior_260323_v001
 *   "더킹.pdf"                                    → the-king_260323_v001
 *   "The Matrix.txt"                              → the-matrix_260323_v001
 *   "Inception_screenplay_final_v2.pdf"            → inception_260323_v001
 */

/* ─── Korean → English Translation Dictionary ─── */
// Known Korean movie/script titles → English translations
// Add new entries as scripts are imported
const KO_EN_DICTIONARY: Record<string, string> = {
  '전율미궁': 'thrill-maze',
  '귀신의집': 'haunted-house',
  '비트세비어': 'beat-savior',
  '더킹': 'the-king',
  '기생충': 'parasite',
  '올드보이': 'oldboy',
  '부산행': 'train-to-busan',
  '살인의추억': 'memories-of-murder',
  '아가씨': 'the-handmaiden',
  '괴물': 'the-host',
  '내부자들': 'inside-men',
  '범죄도시': 'the-outlaws',
  '신세계': 'new-world',
  '타짜': 'tazza',
  '암살': 'assassination',
  '베테랑': 'veteran',
  '국제시장': 'ode-to-my-father',
  '명량': 'roaring-currents',
  '택시운전사': 'a-taxi-driver',
  '변호인': 'the-attorney',
  '광해': 'masquerade',
  '도둑들': 'the-thieves',
  '해운대': 'haeundae',
  '극한직업': 'extreme-job',
  '엑시트': 'exit',
  '반도': 'peninsula',
  '서복': 'seobok',
  '승리호': 'space-sweepers',
  '모가디슈': 'escape-from-mogadishu',
  '헌트': 'hunt',
};

/* ─── Korean → Revised Romanization (fallback) ─── */
const CHO  = ['g','kk','n','d','tt','r','m','b','pp','s','ss','','j','jj','ch','k','t','p','h'];
const JUNG = ['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','wo','we','wi','yu','eu','ui','i'];
const JONG = ['','k','k','k','n','n','n','t','l','l','l','l','l','l','l','l','m','p','p','t','t','ng','t','t','k','t','p','t'];

export function romanizeKorean(text: string): string {
  let result = '';
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code >= 0xAC00 && code <= 0xD7A3) {
      const off = code - 0xAC00;
      result += CHO[Math.floor(off / 588)] + JUNG[Math.floor((off % 588) / 28)] + JONG[off % 28];
    } else {
      result += ch;
    }
  }
  return result;
}

export function hasKorean(text: string): boolean {
  return /[\uAC00-\uD7A3]/.test(text);
}

/**
 * Translate a Korean token to English using the dictionary.
 * Returns null if no translation is found.
 */
function translateKorean(token: string): string | null {
  // Direct lookup (e.g., "비트세비어" → "beat-savior")
  if (KO_EN_DICTIONARY[token]) return KO_EN_DICTIONARY[token];
  // Try without spaces (e.g., "살인의 추억" → "살인의추억")
  const compact = token.replace(/\s+/g, '');
  if (KO_EN_DICTIONARY[compact]) return KO_EN_DICTIONARY[compact];
  return null;
}

/* ─── Stop-word filters ─── */
const STOP_WORDS_KO = ['시나리오', '각본', '대본', '원고', '극본', '작가', '감독', '연출'];
const STOP_WORDS_EN = ['screenplay', 'script', 'final', 'draft', 'revised', 'rewrite', 'outline'];
const DATE_PATTERN = /^\d{6,8}$/;
const VERSION_PATTERN = /^v\d+$/i;
const MAX_SLUG_LENGTH = 30;
const MAX_TITLE_TOKENS = 2;

/**
 * Sanitize a filename into a short slug for the naming convention.
 *
 * 1. Strip extension
 * 2. Tokenize by _ - space
 * 3. Remove stop-words (dates, numbers, meta keywords, author names)
 * 4. Keep first 2 meaningful tokens (= title)
 * 5. Romanize Korean, hyphen-join, max 20 chars
 */
export function sanitizeBaseName(fileName: string): string {
  // Remove extension
  const name = fileName.replace(/\.[^.]+$/, '');

  // Tokenize
  const tokens = name.split(/[_\-\s]+/).filter(Boolean);

  // Filter out stop-words and noise
  const meaningful = tokens.filter(t => {
    if (DATE_PATTERN.test(t)) return false;
    if (VERSION_PATTERN.test(t)) return false;
    if (/^\d+$/.test(t)) return false;
    if (STOP_WORDS_KO.includes(t)) return false;
    if (STOP_WORDS_EN.includes(t.toLowerCase())) return false;
    return true;
  });

  // Take first N title tokens
  const titleTokens = meaningful.slice(0, MAX_TITLE_TOKENS);

  // Translate Korean tokens to English (dictionary), fallback to romanization
  const slug = titleTokens
    .map(t => {
      if (!hasKorean(t)) return t;
      const translated = translateKorean(t);
      return translated || romanizeKorean(t);
    })
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .slice(0, MAX_SLUG_LENGTH) || 'untitled';

  return slug;
}

/**
 * Get today's date in YYMMDD format.
 */
export function getDateStamp(date?: Date): string {
  const d = date || new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

/**
 * Format version number as v001, v002, etc.
 */
export function formatVersion(version: number): string {
  return `v${String(version).padStart(3, '0')}`;
}

/**
 * Generate a scriptId following the naming convention.
 *
 * Pattern: {slug}_{YYMMDD}_v{NNN}
 *
 * @param fileName - Original filename (e.g., "전율미궁_귀신의집_시나리오_김진영_20260320.pdf")
 * @param version - Version number (default: 1)
 * @param date - Optional date override (default: today)
 * @returns scriptId (e.g., "jeonyul-migung_260323_v001")
 */
export function generateScriptId(
  fileName: string,
  version: number = 1,
  date?: Date,
): string {
  const slug = sanitizeBaseName(fileName);
  const dateStamp = getDateStamp(date);
  const ver = formatVersion(version);
  return `${slug}_${dateStamp}_${ver}`;
}

/**
 * Extract the base name (slug) from a scriptId.
 *
 * New:    "jeonyul-migung_260323_v001" → "jeonyul-migung"
 * Legacy: "migung_analysis_260322_v001" → "migung"
 */
export function extractBaseName(scriptId: string): string {
  // Legacy format with _analysis_
  const legacy = scriptId.match(/^(.+?)_analysis_/);
  if (legacy) return legacy[1];
  // New format: slug_YYMMDD_vNNN
  const match = scriptId.match(/^(.+?)_\d{6}_v\d{3}$/);
  return match ? match[1] : scriptId;
}

/**
 * Extract version number from a scriptId.
 *
 * "jeonyul-migung_260323_v001" → 1
 */
export function extractVersion(scriptId: string): number {
  const match = scriptId.match(/_v(\d{3})$/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Generate PDF/HTML export filename from a scriptId.
 *
 * New:    "jeonyul-migung_260323_v001" → "jeonyul-migung_report_260323_v001"
 * Legacy: "migung_analysis_260322_v001" → "migung_report_260322_v001"
 */
export function generateExportFileName(scriptId: string): string {
  // Legacy format: replace _analysis_ with _report_
  if (scriptId.includes('_analysis_')) {
    return scriptId.replace('_analysis_', '_report_');
  }
  // New format: insert _report_ before date stamp
  return scriptId.replace(/^(.+?)_(\d{6}_v\d{3})$/, '$1_report_$2');
}

/**
 * Build the search pattern for finding existing versions of the same script + date.
 *
 * Returns a prefix like "jeonyul-migung_260323_" for DB LIKE queries.
 */
export function getVersionSearchPattern(fileName: string, date?: Date): string {
  const slug = sanitizeBaseName(fileName);
  const dateStamp = getDateStamp(date);
  return `${slug}_${dateStamp}_`;
}
