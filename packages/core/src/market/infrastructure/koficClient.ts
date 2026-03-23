import type { BoxOfficeData } from "../domain/BoxOfficeData";

/**
 * KOFIC KOBIS Client — Korean Film Council Open API.
 * Fetches Korean box office data, movie info, and admission counts.
 * API Docs: https://www.kobis.or.kr/kobisopenapi/homepg/main/main.do
 * Rate limit: 3,000 requests/day (free tier).
 */
export class KOFICClient {
  private readonly baseUrl = "https://www.kobis.or.kr/kobisopenapi/webservice/rest";
  private readonly apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.KOFIC_API_KEY || "";
    if (!this.apiKey) {
      console.warn("KOFIC_API_KEY is not set. Korean box office API calls will fail.");
    }
  }

  /**
   * Search for a movie by title in KOBIS database.
   * Returns the KOBIS movieCd (movie code) for the best match.
   */
  async searchMovie(title: string): Promise<string | null> {
    try {
      const url = `${this.baseUrl}/movie/searchMovieList.json?key=${this.apiKey}&movieNm=${encodeURIComponent(title)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`KOFIC search failed: ${response.statusText}`);

      const data = await response.json() as KOFICMovieListResponse;
      const movies = data.movieListResult?.movieList;
      if (!movies || movies.length === 0) return null;

      // Prefer exact title match, then first result
      const exact = movies.find(m => m.movieNm === title);
      return (exact || movies[0])?.movieCd ?? null;
    } catch (error) {
      console.error(`Error searching KOFIC for "${title}":`, error);
      return null;
    }
  }

  /**
   * Fetch detailed movie info by KOBIS movie code.
   */
  async getMovieInfo(movieCd: string): Promise<KOFICMovieInfo | null> {
    try {
      const url = `${this.baseUrl}/movie/searchMovieInfo.json?key=${this.apiKey}&movieCd=${movieCd}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`KOFIC movie info failed: ${response.statusText}`);

      const data = await response.json() as KOFICMovieInfoResponse;
      return data.movieInfoResult?.movieInfo ?? null;
    } catch (error) {
      console.error(`Error fetching KOFIC movie info for ${movieCd}:`, error);
      return null;
    }
  }

  /**
   * Fetch daily box office rankings.
   * @param targetDt - Date in YYYYMMDD format
   */
  async getDailyBoxOffice(targetDt: string): Promise<KOFICBoxOfficeEntry[]> {
    try {
      const url = `${this.baseUrl}/boxoffice/searchDailyBoxOfficeList.json?key=${this.apiKey}&targetDt=${targetDt}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`KOFIC daily box office failed: ${response.statusText}`);

      const data = await response.json() as KOFICDailyBoxOfficeResponse;
      return data.boxOfficeResult?.dailyBoxOfficeList ?? [];
    } catch (error) {
      console.error(`Error fetching KOFIC daily box office for ${targetDt}:`, error);
      return [];
    }
  }

  /**
   * Fetch weekly box office rankings.
   * @param targetDt - Date in YYYYMMDD format (any day within the target week)
   * @param weekGb - Week type: 0=Mon-Sun, 1=Fri-Thu, 2=Sat-Fri
   */
  async getWeeklyBoxOffice(targetDt: string, weekGb: '0' | '1' | '2' = '0'): Promise<KOFICBoxOfficeEntry[]> {
    try {
      const url = `${this.baseUrl}/boxoffice/searchWeeklyBoxOfficeList.json?key=${this.apiKey}&targetDt=${targetDt}&weekGb=${weekGb}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`KOFIC weekly box office failed: ${response.statusText}`);

      const data = await response.json() as KOFICWeeklyBoxOfficeResponse;
      return data.boxOfficeResult?.weeklyBoxOfficeList ?? [];
    } catch (error) {
      console.error(`Error fetching KOFIC weekly box office for ${targetDt}:`, error);
      return [];
    }
  }

  /**
   * Convert a KOFIC box office entry to the common BoxOfficeData format.
   */
  toBoxOfficeData(entry: KOFICBoxOfficeEntry): BoxOfficeData {
    return {
      movieId: entry.movieCd,
      title: entry.movieNm,
      budget: 0, // KOFIC does not provide budget data
      revenue: parseInt(entry.salesAcc, 10) || 0,
      releaseDate: entry.openDt,
      topCast: [],
      genres: [],
      market: 'korean',
      currencyCode: 'KRW',
      admissions: parseInt(entry.audiAcc, 10) || 0,
    };
  }
}

// ─── KOFIC API Response Types ───

interface KOFICMovieListResponse {
  movieListResult?: {
    totCnt: number;
    source: string;
    movieList: KOFICMovieListEntry[];
  };
}

interface KOFICMovieListEntry {
  movieCd: string;
  movieNm: string;
  movieNmEn: string;
  prdtYear: string;
  openDt: string;
  typeNm: string;
  nationAlt: string;
  genreAlt: string;
  repNationNm: string;
  repGenreNm: string;
  directors: { peopleNm: string }[];
  companys: { companyCd: string; companyNm: string }[];
}

interface KOFICMovieInfoResponse {
  movieInfoResult?: {
    movieInfo: KOFICMovieInfo;
    source: string;
  };
}

export interface KOFICMovieInfo {
  movieCd: string;
  movieNm: string;
  movieNmEn: string;
  showTm: string;
  prdtYear: string;
  openDt: string;
  typeNm: string;
  nations: { nationNm: string }[];
  genres: { genreNm: string }[];
  directors: { peopleNm: string; peopleNmEn: string }[];
  actors: { peopleNm: string; peopleNmEn: string; cast: string }[];
  audits: { auditNo: string; watchGradeNm: string }[];
  companys: { companyCd: string; companyNm: string; companyPartNm: string }[];
}

export interface KOFICBoxOfficeEntry {
  rnum: string;
  rank: string;
  rankInten: string;
  rankOldAndNew: string;
  movieCd: string;
  movieNm: string;
  openDt: string;
  salesAmt: string;
  salesShare: string;
  salesInten: string;
  salesChange: string;
  salesAcc: string;
  audiCnt: string;
  audiInten: string;
  audiChange: string;
  audiAcc: string;
  scrnCnt: string;
  showCnt: string;
}

interface KOFICDailyBoxOfficeResponse {
  boxOfficeResult?: {
    boxofficeType: string;
    showRange: string;
    dailyBoxOfficeList: KOFICBoxOfficeEntry[];
  };
}

interface KOFICWeeklyBoxOfficeResponse {
  boxOfficeResult?: {
    boxofficeType: string;
    showRange: string;
    yearWeekTime: string;
    weeklyBoxOfficeList: KOFICBoxOfficeEntry[];
  };
}
