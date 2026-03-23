import fs from 'fs';
const { PDFParse } = require('pdf-parse');
import { parseFountain, type ScriptElement } from './parser';

async function extractText(data: Buffer | Uint8Array): Promise<string> {
  const parser = new PDFParse({ data });
  const result = await parser.getText();
  // Clean up PDF artifacts: collapse tabs to single space, strip standalone page numbers
  return result.text
    .replace(/\t+/g, ' ')
    .replace(/ {2,}/g, ' ')
    .replace(/^\d+\s*$/gm, '');
}

/**
 * Extracts text from a PDF screenplay and attempts to parse it using the Fountain parser.
 *
 * @param filePath Path to the PDF file
 * @returns Array of parsed script elements
 */
export async function parsePdfToFountainElements(filePath: string): Promise<ScriptElement[]> {
  const dataBuffer = fs.readFileSync(filePath);
  const text = await extractText(dataBuffer);
  return parseFountain(text);
}

/**
 * Parses a PDF buffer directly without file I/O.
 *
 * @param buffer PDF file contents as Buffer
 * @returns Array of parsed script elements
 */
export async function parsePdfBuffer(buffer: Buffer): Promise<ScriptElement[]> {
  const text = await extractText(buffer);
  return parseFountain(text);
}
