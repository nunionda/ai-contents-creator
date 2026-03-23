/**
 * A basic Fountain screenplay parser.
 * Fountain is a simple markup format for screenplays.
 */

export interface ScriptElement {
  type: "scene_heading" | "character" | "dialogue" | "action" | "transition" | "parenthetical";
  text: string;
  metadata?: {
    setting?: string;
    location?: string;
    time?: string;
  };
}

/**
 * Pre-processes Korean screenplays that use inline dialogue format:
 * "동수 야야 너희들..." → splits into "동수\n야야 너희들..."
 * Detects recurring character names at line starts via frequency analysis.
 */
function preprocessKoreanInlineDialogue(text: string): string {
  const lines = text.split("\n");

  // Pass 1: collect candidate names — Korean 2-4 chars (optional trailing digit) at line start
  const candidateRe = /^([가-힣]{2,4}\d?)\s+(.+)/;
  const nameCount = new Map<string, number>();

  // Words that look like names but are action/narration starters
  const excludedWords = new Set([
    '그런', '하는데', '하지만', '그래서', '그리고', '그때', '잠시', '여기', '거기',
    '보면', '하며', '하고', '하면', '웃는', '우는', '놀란', '들어온', '나가는',
    '클로즈업', '인서트', '컷투', '플래시백', '타이틀', '자막', '몽타주',
    '오전', '오후', '새벽', '저녁', '아침', '어둠', '복도', '바깥', '안쪽',
    '인터커팅', '인터컷', '모니터', '바닥에', '문이', '전화가',
    // Formatting/layout artifacts (PDF parsing noise)
    '크기', '간격', '속도', '높이', '너비', '위치', '방향', '비율', '굵기',
    // Organization names / non-character nouns
    '카르텔', '총국', '본부', '위원회', '사무실', '경찰서', '병원',
    '정찰총국', '수사대', '특공대', '사령부', '연구소', '검찰청',
    // Common words / exclamations / pronouns misidentified as characters
    '그냥', '그래', '아마', '내가', '우리', '뉴스', '헤이',
    '제단', '수술실', '현장',
  ]);
  // Verb/adjective endings — line-start words ending in these are not character names
  const verbEndingRe = /[다고며면서지요네까죠게할된건걸는데만런은]$/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const m = trimmed.match(candidateRe);
    if (!m) continue;
    const name = m[1];
    if (name.length < 2) continue;
    if (excludedWords.has(name)) continue;
    if (verbEndingRe.test(name)) continue;
    // Reject words ending in object/possessive/locative particles
    if (/[을를의에]$/.test(name)) continue;
    // Reject 3+ char words ending in subject/topic particles (protects 2-char names)
    if (name.length >= 3 && /[이가]$/.test(name)) continue;
    // Reject organization/location suffixes (총국, 본부, 위원회, etc.)
    if (/(?:총국|정찰국|본부|위원회|사무실|경찰서|사령부|연구소|검찰청|특공대|수사대|카르텔)$/.test(name)) continue;
    nameCount.set(name, (nameCount.get(name) || 0) + 1);
  }

  // Pass 1.5: remove particle-suffixed duplicates (유진이 when 유진 exists with higher count)
  for (const [name, count] of nameCount) {
    if (name.length >= 3) {
      const base = name.slice(0, -1);
      const baseCount = nameCount.get(base) || 0;
      if (baseCount > count) {
        nameCount.delete(name);
      }
    }
  }

  // Confirmed characters: appear ≥ 5 times at line starts
  const confirmedNames = new Set<string>();
  for (const [name, count] of nameCount) {
    if (count >= 5) confirmedNames.add(name);
  }

  if (confirmedNames.size === 0) return text;

  // Pass 2: split lines where confirmed character name starts the line
  const result: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    const m = trimmed.match(candidateRe);
    if (m && confirmedNames.has(m[1])) {
      // Split into character line + dialogue line
      result.push(m[1]);
      result.push(m[2]);
    } else {
      result.push(line);
    }
  }

  return result.join("\n");
}

export function parseFountain(script: string): ScriptElement[] {
  // Pre-process Korean inline dialogue format before parsing
  const preprocessed = preprocessKoreanInlineDialogue(script);
  const lines = preprocessed.split("\n");
  const elements: ScriptElement[] = [];

  let currentCharacter = "";
  let allowBlankAfterCharacter = false;
  const sceneRegex = /^((INT\.|EXT\.|INT|EXT|EST|I\/E)[. ]|(S#|S\/|씬|씬\/)\s*\d+|제\s*\d+\s*경|\d+\.\s+|○\s*)/i;

  for (let i = 0; i < lines.length; i++) {
    const originalLine = lines[i] || "";
    const line = originalLine.trim();

    if (line === "") {
      if (allowBlankAfterCharacter) {
        allowBlankAfterCharacter = false;
      } else {
        currentCharacter = "";
      }
      continue;
    }
    allowBlankAfterCharacter = false;

    // Scene Headings
    if (line.match(sceneRegex) || line.startsWith(".")) {
      const text = line.startsWith(".") ? line.substring(1).trim() : line;
      
      let setting = "";
      let location = "";
      let time = "";
      
      const enMatch = text.match(/^(INT\.|EXT\.|INT|EXT|EST|I\/E)\s+(.*?)(?:\s*-\s*(.*))?$/i);
      const koMatch = text.match(/^((?:S#|S\/|씬|씬\/)\s*\d+|제\s*\d+\s*경|\d+\.)[.,\s]*(.*?)(?:\s*[-–]\s*(.*))?$/i);
      const jpMatch = text.match(/^○?\s*(.*?)(?:\s*[-–]\s*(.*))?$/);

      if (enMatch) {
        setting = enMatch[1] ? enMatch[1].trim() : "";
        location = enMatch[2] ? enMatch[2].trim() : "";
        time = enMatch[3] ? enMatch[3].trim() : "";
      } else if (koMatch) {
        setting = koMatch[1] ? koMatch[1].trim() : "";
        location = koMatch[2] ? koMatch[2].trim() : "";
        time = koMatch[3] ? koMatch[3].trim() : "";
      } else if (jpMatch) {
        setting = "○";
        location = jpMatch[1] ? jpMatch[1].trim() : "";
        time = jpMatch[2] ? jpMatch[2].trim() : "";
      }

      elements.push({ type: "scene_heading", text, metadata: { setting, location, time } });
      currentCharacter = "";
    }
    // Parentheticals
    else if (line.startsWith("(") && line.endsWith(")")) {
      elements.push({ type: "parenthetical", text: line });
    }
    // Transitions
    else if (line.startsWith("<") && line.endsWith(">")) {
      elements.push({ type: "action", text: line });
      currentCharacter = "";
    }
    // Transitions
    else if ((line === line.toUpperCase() && line.endsWith("TO:")) || line.match(/^(FADE IN:|FADE OUT\.|CUT\s+TO\b|디졸브|암전|暗転|フェードイン|フェードアウト|ディゾルブ)/) || /^다시\s+\S+$/.test(line)) {
      elements.push({ type: "transition", text: line });
      currentCharacter = "";
    }
    // Characters
    else {
      // Reject bracketed system messages: [STATUS: ...], [TIMER: D-45], etc.
      const isBracketedMessage = /^\[.*\]$/.test(line) || /^\[.*\]$/.test(line.replace(/\s*\(.*?\)\s*/g, '').trim());
      // Reject lines containing brackets or unmatched closing parens (system/UI text)
      const hasBracketsOrUnmatchedParen = /[\[\]]/.test(line) || (line.endsWith(')') && !line.includes('('));

      const isUppercaseEnglish = !isBracketedMessage && !hasBracketsOrUnmatchedParen && line === line.toUpperCase() && /[A-Z]/.test(line) && !line.match(/[.:?!\]]$/) && !/[가-힣ぁ-んァ-ヴー一-龯]/.test(line);
      const nextLine = i + 1 < lines.length ? (lines[i + 1]?.trim() ?? "") : "";

      // CJK character detection: shorter length, no punctuation, NOT empty next line
      const nameWithoutParens = line.replace(/\s*\(.*?\)\s*/g, '').trim();
      const isCjkNamePattern = !isBracketedMessage && !hasBracketsOrUnmatchedParen && /^[가-힣ぁ-んァ-ヴー一-龯A-Za-z0-9\s]+$/.test(nameWithoutParens) && /[가-힣ぁ-んァ-ヴー一-龯]/.test(nameWithoutParens);
      const wordCount = nameWithoutParens.split(/\s+/).length;
      // Korean particle check: reject words > 3 chars ending in particles
      // Short names (≤3 chars) like 을순이, 동수 are protected from false particle rejection
      // 오 excluded from particles (common surname Oh)
      const hasKoreanParticle = nameWithoutParens.length > 3 && /[이가을를은는도의에서와로들야님]$/.test(nameWithoutParens);
      // Korean common nouns / action-like phrases that should not be character names
      const koreanCommonWordRe = /^(오전|오후|새벽|저녁|아침|밤|낮|단계|행동|순간|현재|계속|시작|완료|하지만|그때|갑자기|잠시|여기|거기|나중|다시|크기|간격|속도|높이|너비|위치|방향|비율|굵기|카르텔|정찰총국|총국|본부|위원회|사무실|경찰서|병원|수사대|특공대|사령부|연구소|검찰청|그냥|그래|아마|내가|우리|뉴스|헤이|제단|수술실|현장|씨발|으악|부웅|하더니|그러자)$/;
      const isKoreanCommonWord = nameWithoutParens.split(/\s+/).some(w => koreanCommonWordRe.test(w));
      // Korean verb/adjective endings that indicate action text, not character names
      const hasKoreanVerbEnding = /[다고며면서지요네까죠게할된건걸]$/.test(nameWithoutParens);
      // Organization/location suffix check
      const hasOrgSuffix = /(?:총국|정찰국|본부|위원회|사무실|경찰서|사령부|연구소|검찰청|특공대|수사대|카르텔)$/.test(nameWithoutParens);
      const isCjkCharacter = isCjkNamePattern && nameWithoutParens.length <= 6 && wordCount <= 2 && !line.match(/[.?!,:;。？！、；\]\)]$/) && !hasKoreanParticle && !isKoreanCommonWord && !hasKoreanVerbEnding && !hasOrgSuffix;

      // CJK names: short names (≤3 chars) allow a blank line before dialogue (Korean PDF screenplays)
      const nextNextLine = i + 2 < lines.length ? (lines[i + 2]?.trim() ?? "") : "";
      const isShortName = nameWithoutParens.length <= 3;
      const hasFollowingContent = nextLine !== "" || (isShortName && nextNextLine !== "");

      if (isUppercaseEnglish || (isCjkCharacter && hasFollowingContent)) {
        elements.push({ type: "character", text: line });
        currentCharacter = line;
        allowBlankAfterCharacter = true;
      }
      // Dialogue
      else if (currentCharacter !== "") {
        elements.push({ type: "dialogue", text: line });
      }
      // Action
      else {
        elements.push({ type: "action", text: line });
      }
    }
  }

  return elements;
}
