import { ScriptElement } from '../../script/infrastructure/parser';
import { CharacterNode } from '../../creative/domain/CharacterNetwork';
import { LocationBreakdown, CastBreakdown } from '../domain/ProductionBreakdown';

export class ProductionAnalyzer {
  analyzeLocations(elements: ScriptElement[]): LocationBreakdown[] {
    const locationMap = new Map<string, LocationBreakdown>();
    let sceneNumber = 0;

    for (const el of elements) {
      if (el.type !== 'scene_heading') continue;
      sceneNumber++;

      const setting = this.parseSetting(el.text, el.metadata?.setting);
      const locationName = this.parseLocationName(el.text, el.metadata?.location);
      const time = el.metadata?.time || this.parseTime(el.text);
      const key = locationName.toUpperCase();

      const existing = locationMap.get(key);
      if (existing) {
        existing.sceneNumbers.push(sceneNumber);
        existing.frequency++;
        if (!existing.time && time) existing.time = time;
      } else {
        locationMap.set(key, {
          name: locationName,
          setting,
          time: time || 'UNSPECIFIED',
          sceneNumbers: [sceneNumber],
          frequency: 1,
        });
      }
    }

    return Array.from(locationMap.values())
      .sort((a, b) => b.frequency - a.frequency);
  }

  analyzeCast(elements: ScriptElement[], characters: CharacterNode[]): CastBreakdown[] {
    const castMap = new Map<string, { sceneNumbers: Set<number>; role: string }>();
    let currentScene = 0;

    // Build character role lookup
    const roleMap = new Map<string, string>();
    for (const c of characters) {
      roleMap.set(c.name.toUpperCase(), c.role);
    }

    for (const el of elements) {
      if (el.type === 'scene_heading') {
        currentScene++;
        continue;
      }
      if (el.type === 'character' && currentScene > 0) {
        const name = el.text.replace(/\s*\(.*?\)\s*/g, '').trim().toUpperCase();
        if (!name) continue;

        const existing = castMap.get(name);
        if (existing) {
          existing.sceneNumbers.add(currentScene);
        } else {
          castMap.set(name, {
            sceneNumbers: new Set([currentScene]),
            role: roleMap.get(name) || 'Minor',
          });
        }
      }
    }

    return Array.from(castMap.entries())
      .map(([name, data]) => ({
        name,
        role: data.role,
        sceneNumbers: Array.from(data.sceneNumbers).sort((a, b) => a - b),
        totalScenes: data.sceneNumbers.size,
      }))
      .sort((a, b) => b.totalScenes - a.totalScenes);
  }

  computeIntExtRatio(locations: LocationBreakdown[]): { int: number; ext: number } {
    let int = 0;
    let ext = 0;
    for (const loc of locations) {
      if (loc.setting === 'INT') int += loc.frequency;
      else if (loc.setting === 'EXT') ext += loc.frequency;
      else { int += loc.frequency; ext += loc.frequency; }
    }
    const total = int + ext || 1;
    return { int: Math.round((int / total) * 100), ext: Math.round((ext / total) * 100) };
  }

  estimateShootingDays(sceneCount: number): number {
    return Math.max(1, Math.ceil(sceneCount / 5));
  }

  private parseSetting(text: string, metadataSetting?: string): 'INT' | 'EXT' | 'INT/EXT' {
    const upper = (metadataSetting || text).toUpperCase();
    if (upper.includes('INT/EXT') || upper.includes('INT./EXT') || upper.includes('I/E')) return 'INT/EXT';
    if (upper.includes('EXT')) return 'EXT';
    return 'INT';
  }

  private parseLocationName(text: string, metadataLocation?: string): string {
    if (metadataLocation) return metadataLocation;
    // Strip INT./EXT. prefix and time suffix
    let loc = text
      .replace(/^(INT\.?\/EXT\.?|INT\.?|EXT\.?|I\/E\.?|EST\.?)\s*[-–—.]?\s*/i, '')
      .replace(/\s*[-–—]\s*(DAY|NIGHT|MORNING|EVENING|DAWN|DUSK|LATER|CONTINUOUS|SAME|MOMENTS?\s*LATER).*$/i, '')
      .trim();
    return loc || 'UNKNOWN';
  }

  private parseTime(text: string): string {
    const match = text.match(/[-–—]\s*(DAY|NIGHT|MORNING|EVENING|DAWN|DUSK|LATER|CONTINUOUS)/i);
    return match ? match[1].toUpperCase() : '';
  }
}
