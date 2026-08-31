import { PrismaClient } from "@prisma/client";

// Reuse a single PrismaClient instance across hot reloads in development
// so we don't exhaust the Postgres connection pool.
function getDatabaseUrl(): string | undefined {
  let url = process.env.DATABASE_URL;
  if (!url) return undefined;
  if (url.includes("pooler.supabase.com")) {
    if (url.includes(":5432")) {
      url = url.replace(":5432", ":6543");
    }
    if (!url.includes("pgbouncer=true")) {
      url += (url.includes("?") ? "&" : "?") + "pgbouncer=true";
    }
    if (!url.includes("connection_limit=")) {
      url += "&connection_limit=1";
    }
  }
  return url;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const databaseUrl = getDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: databaseUrl ? { db: { url: databaseUrl } } : undefined,
    log: ["error"],
  });

globalForPrisma.prisma = prisma;
