/**
 * Frontend naming utility for PDF export filenames.
 *
 * New:    "jeonyul-migung_260323_v001" → "jeonyul-migung_report_260323_v001"
 * Legacy: "migung_analysis_260322_v001" → "migung_report_260322_v001"
 */
export function generateExportFileName(scriptId: string): string {
  // Legacy format: _analysis_ → _report_
  if (scriptId.includes('_analysis_')) {
    return scriptId.replace('_analysis_', '_report_');
  }

  // New format: insert _report_ before date stamp
  const match = scriptId.match(/^(.+?)_(\d{6}_v\d{3})$/);
  if (match) {
    return `${match[1]}_report_${match[2]}`;
  }

  // Fallback for unknown formats
  return `${scriptId}_report`;
}
