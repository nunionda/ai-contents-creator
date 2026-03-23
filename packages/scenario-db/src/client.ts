import { PrismaClient } from "./generated/client/index.js";
import { resolve } from "path";
import { config } from "dotenv";

// Load .env from the monorepo root (handles running from apps/scenario-api/ etc.)
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), "../../.env") });

const globalForPrisma = globalThis as unknown as {
  scenarioPrisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.scenarioPrisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.scenarioPrisma = prisma;
}
