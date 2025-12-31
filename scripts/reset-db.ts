
import "dotenv/config";
import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function reset() {
  console.log("🗑️  Emptying database...");
  
  // Disable foreign key checks to allow truncation in any order (optional, but safer to just cascade)
  // However, Neon/Postgres supports TRUNCATE ... CASCADE
  
  try {
    await db.execute(sql`TRUNCATE TABLE tournament_matches, court_slots, participants, categories, tournaments, users CASCADE`);
    console.log("✅ Database emptied successfully");
  } catch (error) {
    console.error("❌ Error emptying database:", error);
  }
  
  process.exit(0);
}

reset();
