import type { BoxOfficeData } from "../domain/BoxOfficeData";

/**
 * TMDB Client to fetch financial and cast metadata for movies.
 * Requires TMDB_API_KEY to be provided either through constructor or environment variables.
 */
export class TMDBClient {
  private readonly baseUrl = "https://api.themoviedb.org/3";
  private readonly apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.TMDB_API_KEY || "";
    if (!this.apiKey) {
      console.warn("⚠️ TMDB_API_KEY is not set. API calls will fail or return unauthorized.");
    }
  }

  /**
   * Search for a movie by its precise script title and return the most relevant TMDB ID.
   */
  async searchMovie(title: string): Promise<number | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/search/movie?query=${encodeURIComponent(title)}&api_key=${this.apiKey}`
      );
      if (!response.ok) throw new Error(`TMDB Search check failed: ${response.statusText}`);
      
      const data = await response.json();
      return data.results && data.results.length > 0 ? data.results[0].id : null;
    } catch (error) {
      console.error(`Error searching movie "${title}":`, error);
      return null;
    }
  }

  /**
   * Fetch detailed financial and cast data for a specific TMDB movie ID.
   * Integrates the "append_to_response=credits" feature to save network roundtrips.
   */
  async getBoxOfficeData(tmdbId: number): Promise<BoxOfficeData | null> {
    try {
      const detailsUrl = `${this.baseUrl}/movie/${tmdbId}?append_to_response=credits&api_key=${this.apiKey}`;
      const response = await fetch(detailsUrl);
      
      if (!response.ok) throw new Error(`TMDB Details check failed: ${response.statusText}`);
      
      const data = await response.json() as any;
      
      // Extract up to top 5 cast members for star power profiling
      const topCast = data.credits?.cast?.slice(0, 5).map((actor: { name: string }) => actor.name) || [];

      return {
        movieId: tmdbId.toString(),
        title: data.title,
        budget: data.budget || 0,
        revenue: data.revenue || 0,
        releaseDate: data.release_date,
        topCast,
      };
    } catch (error) {
      console.error(`Error fetching movie details for ID ${tmdbId}:`, error);
      return null;
    }
  }
}
