/**
 * Benchmark CLI — Compare LLM providers across analysis engines.
 *
 * Usage:
 *   bun run packages/core/src/creative/infrastructure/benchmark/run.ts
 *   bun run packages/core/src/creative/infrastructure/benchmark/run.ts --engines beatSheet,emotion --providers gemini,groq
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseFountain } from '../../../../script/infrastructure/parser';
import { LLMFactory } from '../llm/LLMFactory';
import { BenchmarkRunner } from './BenchmarkRunner';
import type { EngineName, ProviderChoice } from '../llm/AnalysisStrategy';
import type { BenchmarkSuite } from './ProviderBenchmark';

function parseArgs(): { engines: EngineName[]; providers: ProviderChoice[] } {
  const args = process.argv.slice(2);
  let engines: EngineName[] = ['beatSheet', 'emotion', 'rating', 'trope'];
  let providers: ProviderChoice[] = ['gemini', 'groq', 'deepseek'];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--engines' && args[i + 1]) {
      engines = args[i + 1]!.split(',') as EngineName[];
      i++;
    } else if (args[i] === '--providers' && args[i + 1]) {
      providers = args[i + 1]!.split(',') as ProviderChoice[];
      i++;
    }
  }

  return { engines, providers };
}

function printTable(suite: BenchmarkSuite) {
  const engines = [...new Set(suite.results.map(r => r.engine))];
  const providers = [...new Set(suite.results.map(r => r.provider))];

  // Header
  const colWidth = 16;
  const engineWidth = 14;
  let header = 'Engine'.padEnd(engineWidth) + '|';
  for (const p of providers) {
    header += ` ${p}`.padEnd(colWidth) + '|';
  }
  const separator = '-'.repeat(header.length);

  console.log('\n' + separator);
  console.log(header);
  console.log(separator);

  // Rows
  for (const engine of engines) {
    let row = engine.padEnd(engineWidth) + '|';
    for (const prov of providers) {
      const r = suite.results.find(r => r.engine === engine && r.provider === prov);
      if (r?.error) {
        row += ` ERR`.padEnd(colWidth) + '|';
      } else if (r) {
        row += ` ${r.overallScore} (${(r.latencyMs / 1000).toFixed(1)}s)`.padEnd(colWidth) + '|';
      } else {
        row += ` -`.padEnd(colWidth) + '|';
      }
    }
    console.log(row);
  }

  // Cost row
  let costRow = 'Cost/run'.padEnd(engineWidth) + '|';
  for (const prov of providers) {
    const provResults = suite.results.filter(r => r.provider === prov);
    const totalCost = provResults.reduce((sum, r) => sum + r.costEstimate, 0);
    costRow += ` $${totalCost.toFixed(4)}`.padEnd(colWidth) + '|';
  }
  console.log(separator);
  console.log(costRow);
  console.log(separator);

  // Summary
  console.log(`\nBest Quality: ${suite.summary.bestQuality}`);
  console.log(`Best Budget:  ${suite.summary.bestBudget}`);
  console.log(`Total Time:   ${(suite.summary.totalTimeMs / 1000).toFixed(1)}s`);
  console.log(`Total Cost:   $${suite.summary.totalCostEstimate.toFixed(4)}`);
}

async function main() {
  const { engines, providers } = parseArgs();

  console.log('=== LLM Provider Benchmark ===');
  console.log(`Engines:   ${engines.join(', ')}`);
  console.log(`Providers: ${providers.join(', ')}`);

  // Load reference script
  const scriptPath = path.resolve(__dirname, '../../../../../../data/fight_club_sample.fountain');
  if (!fs.existsSync(scriptPath)) {
    console.error(`Reference script not found: ${scriptPath}`);
    process.exit(1);
  }
  const scriptText = fs.readFileSync(scriptPath, 'utf8');
  const elements = parseFountain(scriptText);
  console.log(`Script:    fight_club_sample (${elements.length} elements)\n`);

  const factory = new LLMFactory();
  const runner = new BenchmarkRunner(factory);

  const suite = await runner.runSuite('fight_club', elements, engines, providers);

  printTable(suite);

  // Save results
  const outDir = path.resolve(__dirname, '../../../../../../output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `benchmark-${Date.now()}.json`);
  fs.writeFileSync(outPath, JSON.stringify(suite, null, 2));
  console.log(`\nResults saved: ${outPath}`);
}

main().catch(console.error);
