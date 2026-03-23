import { describe, expect, test, mock, beforeEach } from 'bun:test';
import { TMDBClient } from './tmdbClient';

describe('TMDBClient', () => {
  let client: TMDBClient;

  beforeEach(() => {
    // Inject a dummy key to bypass console warnings during test
    client = new TMDBClient('dummy_key');
  });

  test('searchMovie should successfully extract movie ID from JSON', async () => {
    // Mock the global fetch API for the test
    global.fetch = mock(async () => {
      return new Response(JSON.stringify({
        results: [{ id: 550, title: "Fight Club" }]
      }));
    }) as any;

    const id = await client.searchMovie("Fight Club");
    expect(id).toBe(550);
  });

  test('getBoxOfficeData should correctly map TMDB JSON to BoxOfficeData domain entity', async () => {
    global.fetch = mock(async () => {
      return new Response(JSON.stringify({
        id: 550,
        title: "Fight Club",
        budget: 63000000,
        revenue: 100853753,
        release_date: "1999-10-15",
        credits: {
          cast: [
            { name: "Edward Norton" },
            { name: "Brad Pitt" },
            { name: "Meat Loaf" },
            { name: "Jared Leto" },
            { name: "Helena Bonham Carter" },
            { name: "Extra Actor" } // 6th won't be mapped
          ]
        }
      }));
    }) as any;

    const data = await client.getBoxOfficeData(550);
    
    expect(data).not.toBeNull();
    expect(data?.movieId).toBe("550");
    expect(data?.budget).toBe(63000000);
    expect(data?.revenue).toBe(100853753);
    expect(data?.topCast).toHaveLength(5);
    expect(data?.topCast[0]).toBe("Edward Norton");
    expect(data?.topCast[4]).toBe("Helena Bonham Carter");
  });
});
