import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "../../drizzle/schema";

let pool: Pool | undefined;
let database: ReturnType<typeof createDatabase> | undefined;

function createDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured. Connect a Neon database to this Vercel project.");
  }
  pool = new Pool({ connectionString, max: 5 });
  return drizzle({ client: pool, schema });
}

export function getDb() {
  database ??= createDatabase();
  return database;
}
