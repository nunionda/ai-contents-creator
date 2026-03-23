import { z } from "zod";
import * as dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file (search up from cwd to find monorepo root)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.enum(["error", "warn", "info", "http", "verbose", "debug", "silly"]).default("info"),
  // External APIs
  TMDB_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  KOFIC_API_KEY: z.string().optional(),
  PINECONE_API_KEY: z.string().optional(),
});

// This will throw an error immediately if any required environment variables are missing
export const env = envSchema.parse(process.env);
