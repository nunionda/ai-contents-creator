// ---------------------------------------------------------------------------
// @marionette/agents — barrel exports + agent registry
// ---------------------------------------------------------------------------

// Base
export { BaseAgent } from "./base/agent.js"
export type { AgentInput, AgentOutput } from "./base/agent.js"
export { PipelineOrchestrator } from "./base/pipeline.js"

// Pre-Production
export { ScriptWriterAgent } from "./pre-production/script-writer.js"
export type { ScriptWriterInput } from "./pre-production/script-writer.js"
export { ScripterAgent } from "./pre-production/scripter.js"
export type { ScripterInput } from "./pre-production/scripter.js"
export { ConceptArtistAgent } from "./pre-production/concept-artist.js"
export type { ConceptArtistInput } from "./pre-production/concept-artist.js"
export { CastingDirectorAgent } from "./pre-production/casting-director.js"
export type { CastingDirectorInput } from "./pre-production/casting-director.js"
export { LocationScoutAgent } from "./pre-production/location-scout.js"
export type { LocationScoutInput } from "./pre-production/location-scout.js"
export { PrevisualizerAgent } from "./pre-production/previsualizer.js"
export type { PrevisualizerInput } from "./pre-production/previsualizer.js"

// Main-Production
export { CinematographerAgent } from "./main-production/cinematographer.js"
export type { CinematographerInput } from "./main-production/cinematographer.js"
export { GeneralistAgent } from "./main-production/generalist.js"

// Post-Production
export { SoundDesignerAgent } from "./post-production/sound-designer.js"
export type { SoundDesignerInput } from "./post-production/sound-designer.js"
export { MasterEditorAgent } from "./post-production/master-editor.js"
export { ComposerAgent } from "./post-production/composer.js"
export type { ComposerInput } from "./post-production/composer.js"
export { ColoristAgent } from "./post-production/colorist.js"
export type { ColoristInput } from "./post-production/colorist.js"
export { MixingEngineerAgent } from "./post-production/mixing-engineer.js"
export type { MixingEngineerInput } from "./post-production/mixing-engineer.js"

// ─── Agent Registry ───

import type { PrismaClient } from "@prisma/client"
import type { AIGateway } from "@marionette/ai-gateway"
import type { BaseAgent } from "./base/agent.js"
import { ScriptWriterAgent } from "./pre-production/script-writer.js"
import { ScripterAgent } from "./pre-production/scripter.js"
import { ConceptArtistAgent } from "./pre-production/concept-artist.js"
import { CastingDirectorAgent } from "./pre-production/casting-director.js"
import { LocationScoutAgent } from "./pre-production/location-scout.js"
import { PrevisualizerAgent } from "./pre-production/previsualizer.js"
import { CinematographerAgent } from "./main-production/cinematographer.js"
import { GeneralistAgent } from "./main-production/generalist.js"
import { SoundDesignerAgent } from "./post-production/sound-designer.js"
import { MasterEditorAgent } from "./post-production/master-editor.js"
import { ComposerAgent } from "./post-production/composer.js"
import { ColoristAgent } from "./post-production/colorist.js"
import { MixingEngineerAgent } from "./post-production/mixing-engineer.js"

/**
 * Create all available agents with shared dependencies.
 * Returns a map of agent name → agent instance.
 */
export function createAgentRegistry(gateway: AIGateway, db: PrismaClient): Map<string, BaseAgent> {
  const registry = new Map<string, BaseAgent>()

  // Pre-Production
  registry.set("script_writer", new ScriptWriterAgent(gateway, db))
  registry.set("scripter", new ScripterAgent(gateway, db))
  registry.set("concept_artist", new ConceptArtistAgent(gateway, db))
  registry.set("casting_director", new CastingDirectorAgent(gateway, db))
  registry.set("location_scout", new LocationScoutAgent(gateway, db))
  registry.set("previsualizer", new PrevisualizerAgent(gateway, db))

  // Main-Production
  registry.set("cinematographer", new CinematographerAgent(gateway, db))
  registry.set("generalist", new GeneralistAgent(gateway, db))

  // Post-Production
  registry.set("sound_designer", new SoundDesignerAgent(gateway, db))
  registry.set("composer", new ComposerAgent(gateway, db))
  registry.set("master_editor", new MasterEditorAgent(gateway, db))
  registry.set("colorist", new ColoristAgent(gateway, db))
  registry.set("mixing_engineer", new MixingEngineerAgent(gateway, db))

  return registry
}
