import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface AgentSeed {
  agentName: string;
  phase: "PRE" | "MAIN" | "POST";
  provider: string;
  model: string;
  enabled: boolean;
}

const agents: AgentSeed[] = [
  { agentName: "script-writer",    phase: "PRE",  provider: "gemini", model: "gemini-2.5-flash",       enabled: true  },
  { agentName: "scripter",         phase: "PRE",  provider: "gemini", model: "gemini-2.5-flash",       enabled: true  },
  { agentName: "concept-artist",   phase: "PRE",  provider: "gemini", model: "gemini-2.5-flash-image", enabled: true  },
  { agentName: "previsualizer",    phase: "PRE",  provider: "gemini", model: "veo-3.0",                enabled: true  },
  { agentName: "casting-director", phase: "PRE",  provider: "gemini", model: "gemini-2.5-flash-image", enabled: true  },
  { agentName: "location-scout",   phase: "PRE",  provider: "gemini", model: "gemini-2.5-flash-image", enabled: true  },
  { agentName: "cinematographer",  phase: "MAIN", provider: "gemini", model: "gemini-2.5-flash",       enabled: true  },
  { agentName: "generalist",       phase: "MAIN", provider: "gemini", model: "veo-3.0",                enabled: true  },
  { agentName: "asset-designer",   phase: "MAIN", provider: "meshy",  model: "meshy-v1",               enabled: false },
  { agentName: "vfx-compositor",   phase: "POST", provider: "local",  model: "ffmpeg",                 enabled: false },
  { agentName: "master-editor",    phase: "POST", provider: "local",  model: "ffmpeg",                 enabled: true  },
  { agentName: "colorist",         phase: "POST", provider: "local",  model: "ffmpeg",                 enabled: true  },
  { agentName: "sound-designer",   phase: "POST", provider: "gemini", model: "gemini-tts",             enabled: true  },
  { agentName: "composer",         phase: "POST", provider: "suno",   model: "suno-v4",                enabled: true  },
  { agentName: "mixing-engineer",  phase: "POST", provider: "local",  model: "ffmpeg",                 enabled: true  },
];

async function main() {
  console.log("Seeding AgentConfig...");

  for (const agent of agents) {
    await prisma.agentConfig.upsert({
      where: { agentName: agent.agentName },
      update: {
        phase: agent.phase,
        provider: agent.provider,
        model: agent.model,
        enabled: agent.enabled,
      },
      create: agent,
    });
    console.log(`  Upserted: ${agent.agentName}`);
  }

  console.log(`Seeded ${agents.length} agent configs.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
