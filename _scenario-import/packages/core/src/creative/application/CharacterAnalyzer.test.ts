import { describe, expect, test } from 'bun:test';
import { CharacterAnalyzer } from './CharacterAnalyzer';
import { ScriptElement } from '../../script/infrastructure/parser';

describe('CharacterAnalyzer', () => {
  const analyzer = new CharacterAnalyzer();

  test('should accurately extract and rank characters based on dialogue frequencies', () => {
    const mockElements: ScriptElement[] = [
      { type: "scene_heading", text: "INT. ROOM - DAY" },
      { type: "action", text: "John looks sharply at Mary." }, // Action lines shouldn't count for dialogue mapping
      { type: "character", text: "JOHN" },
      { type: "dialogue", text: "Hello there." },
      { type: "character", text: "JOHN (V.O.)" },         // Verify parenthetical stripping
      { type: "dialogue", text: "Are you listening to me?" },
      { type: "character", text: "MARY" },
      { type: "dialogue", text: "Yes, I am." },
      { type: "character", text: "RANDOM GUY" },
      { type: "dialogue", text: "Coffee delivery." }
    ];

    const network = analyzer.analyze("script-abc", mockElements);
    
    expect(network.characters).toHaveLength(3);
    
    // John should be protagonist (2 lines)
    expect(network.characters[0].name).toBe("JOHN");
    expect(network.characters[0].totalLines).toBe(2);
    expect(network.characters[0].totalWords).toBe(7); // "Hello there", "Are you listening to me?"
    expect(network.characters[0].role).toBe("Protagonist");
    
    // Mary should be antagonist/supporting based on rank 2
    expect(network.characters[1].name).toBe("MARY");
    expect(network.characters[1].totalLines).toBe(1);
    expect(network.characters[1].role).toBe("Antagonist"); 
    
    // Random guy should be supporting
    expect(network.characters[2].name).toBe("RANDOM GUY");
    expect(network.characters[2].role).toBe("Supporting");
  });
});
