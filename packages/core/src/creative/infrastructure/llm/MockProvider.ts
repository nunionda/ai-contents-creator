import type { ILLMProvider, LLMResponse } from './ILLMProvider';

export class MockProvider implements ILLMProvider {
  name = 'mock';

  async generateText(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    console.log("🛠️ MockProvider: Generating dummy response...");
    
    let content = "{}";

    if ((systemPrompt.includes("3-Act") || systemPrompt.includes("15-beat framework")) && !systemPrompt.includes("coverage")) {
      content = JSON.stringify({
        beats: [
          { act: 1, name: "Setup", sceneStart: 1, sceneEnd: 2, description: "The world and protagonist are introduced, establishing the status quo." },
          { act: 1, name: "Inciting Incident", sceneStart: 3, sceneEnd: 4, description: "An unexpected event disrupts the protagonist's ordinary life." },
          { act: 2, name: "Rising Action", sceneStart: 5, sceneEnd: 6, description: "Conflict intensifies as the protagonist faces mounting challenges." },
          { act: 2, name: "Midpoint Crisis", sceneStart: 7, sceneEnd: 7, description: "A major revelation forces the protagonist to reassess everything." },
          { act: 3, name: "Climax", sceneStart: 8, sceneEnd: 9, description: "The protagonist confronts the central conflict head-on." },
          { act: 3, name: "Resolution", sceneStart: 10, sceneEnd: 10, description: "Loose ends are tied and the protagonist emerges transformed." },
        ]
      });
    } else if (systemPrompt.includes("Emotional Arc") || systemPrompt.includes("valence")) {
      // Dynamically generate scenes matching the actual script scene count
      const sceneMatches = userPrompt.match(/\[Scene \d+\]/g);
      const sceneCount = sceneMatches ? sceneMatches.length : 10;

      const arcTemplate = [
        { emotion: "Curiosity", explanations: ["Opening establishes an intriguing premise.", "A mysterious world is introduced.", "Questions are raised about the protagonist's situation."] },
        { emotion: "Joy", explanations: ["Protagonist discovers an unexpected opportunity.", "A moment of connection brings warmth.", "Early victory lifts spirits."] },
        { emotion: "Hope", explanations: ["Early success builds momentum.", "An ally appears with a new possibility.", "Progress toward the goal renews confidence."] },
        { emotion: "Doubt", explanations: ["First signs of trouble emerge.", "The protagonist questions their path.", "An unexpected obstacle creates uncertainty."] },
        { emotion: "Tension", explanations: ["Conflict intensifies as stakes rise.", "Opposing forces close in.", "A confrontation reveals hidden dangers."] },
        { emotion: "Despair", explanations: ["Major setback pushes protagonist to their lowest.", "A devastating loss changes everything.", "All hope seems lost as allies fall away."] },
        { emotion: "Resolve", explanations: ["Protagonist begins to find inner strength.", "A choice is made to fight back.", "Past lessons crystallize into determination."] },
        { emotion: "Determination", explanations: ["A new plan takes shape against the odds.", "Resources are gathered for the final push.", "The protagonist commits fully to the mission."] },
        { emotion: "Triumph", explanations: ["Climactic confrontation with a decisive victory.", "The protagonist overcomes their greatest challenge.", "A hard-won battle reaches its turning point."] },
        { emotion: "Catharsis", explanations: ["Resolution brings emotional closure and transformation.", "The journey's meaning becomes clear.", "A new equilibrium emerges from the struggle."] },
      ];

      const scenes = Array.from({ length: sceneCount }, (_, i) => {
        const progress = sceneCount > 1 ? i / (sceneCount - 1) : 0.5;
        const templateIdx = Math.min(Math.floor(progress * arcTemplate.length), arcTemplate.length - 1);
        const t = arcTemplate[templateIdx]!;
        // Generate a "Man in a Hole" emotional arc curve
        const score = Math.round(8 * Math.sin((progress - 0.15) * Math.PI * 2) * (0.5 + 0.5 * progress));
        return {
          sceneNumber: i + 1,
          score: Math.max(-10, Math.min(10, score)),
          dominantEmotion: t.emotion,
          explanation: t.explanations[i % t.explanations.length],
        };
      });

      content = JSON.stringify({ scenes });
    } else if (systemPrompt.includes("market intelligence")) {
      content = JSON.stringify({
        tier: "Hit",
        predictedMultiplier: 3.5,
        confidence: 0.8,
        reasoning: "Mock reasoning"
      });
    } else if (systemPrompt.includes("MPAA") || systemPrompt.includes("KMRB")) {
      const isKorean = systemPrompt.includes("KMRB");
      content = JSON.stringify({
        rating: isKorean ? "15+" : "PG-13",
        reasons: isKorean ? ["모의 폭력 장면"] : ["Mock violence"],
        confidence: 0.9
      });
    } else if (systemPrompt.includes("Script Coverage") || systemPrompt.includes("coverage analyst")) {
      content = JSON.stringify({
        title: "Untitled Screenplay",
        genre: "Drama",
        logline: "A mock screenplay evaluation.",
        synopsis: "This is a placeholder synopsis generated by the mock provider.",
        categories: [
          { name: "Plot Structure & Logic", score: 70, subcategories: [
            { name: "Narrative Structure Completeness", score: 72, assessment: "Follows basic three-act structure." },
            { name: "Pacing & Scene Flow", score: 68, assessment: "Adequate pacing with room for improvement." },
            { name: "Conflict Intensity", score: 70, assessment: "Moderate conflict development." },
          ]},
          { name: "Character & Dialogue", score: 65, subcategories: [
            { name: "Character Arc", score: 65, assessment: "Characters show some growth." },
            { name: "Dialogue Quality & Subtext", score: 65, assessment: "Dialogue is functional but lacks subtext." },
          ]},
          { name: "Theme & Tone", score: 68, subcategories: [
            { name: "Theme Clarity", score: 70, assessment: "Theme is present but could be stronger." },
            { name: "Tone Consistency", score: 66, assessment: "Generally consistent tone." },
          ]},
          { name: "Market Appeal", score: 72, subcategories: [
            { name: "Genre Fit & Trend Alignment", score: 70, assessment: "Fits genre conventions." },
            { name: "Industry Benchmarking", score: 72, assessment: "Comparable to mid-tier releases." },
            { name: "Rating Appropriateness", score: 74, assessment: "Content level appropriate for target audience." },
          ]},
          { name: "Production Feasibility", score: 75, subcategories: [
            { name: "Budget & Resource Viability", score: 75, assessment: "Production requirements are reasonable." },
          ]},
        ],
        overallScore: 70,
        verdict: "Consider",
        strengths: ["Solid premise", "Clear genre identity", "Manageable production scope"],
        weaknesses: ["Character depth needs work", "Dialogue lacks subtext", "Pacing inconsistencies"],
        recommendation: "The screenplay shows promise with a solid structural foundation but needs further development in character depth and dialogue quality before it can be recommended for production.",
      });
    } else if (systemPrompt.includes("genre classifier")) {
      content = "Drama";
    } else if (systemPrompt.includes("trope analyzer") || systemPrompt.includes("narrative tropes")) {
      content = JSON.stringify(["Coming of Age", "Redemption", "Anti-Hero", "Mentor", "Family"]);
    } else if (systemPrompt.includes("VFX Supervisor") || systemPrompt.includes("visual effects")) {
      content = JSON.stringify([
        { index: 1, tier: "simple", hours: 30 },
        { index: 2, tier: "moderate", hours: 60 },
        { index: 3, tier: "complex", hours: 140 },
      ]);
    }

    return {
      provider: 'mock',
      model: 'mock-v1',
      content,
      latencyMs: 100
    };
  }
}
