/**
 * Frontend naming utility for PDF export filenames.
 *
 * Converts scriptId to investor analysis filename:
 *   "migung_analysis_260322_v001" → "migung_investor_analysis_260322_v001"
 */
export function generateExportFileName(scriptId: string): string {
  // New naming convention: {name}_analysis_{YYMMDD}_v{NNN}
  if (scriptId.includes('_analysis_')) {
    return scriptId.replace('_analysis_', '_investor_analysis_');
  }

  // Legacy scriptId fallback (e.g., "MyScript$", "[Romanized]한글$")
  const cleanName = scriptId
    .replace(/\[.*?\]/g, '')  // remove [Romanized] prefix
    .replace(/\$$/g, '')       // remove trailing $
    .replace(/[^a-zA-Z0-9]/g, '_')
    .toLowerCase();

  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');

  return `${cleanName || 'script'}_investor_analysis_${yy}${mm}${dd}_v001`;
}
