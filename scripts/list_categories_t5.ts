import "dotenv/config";
import { db } from "../src/db";
import { categories } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const cats = await db.query.categories.findMany({
    where: eq(categories.tournamentId, 5)
  });
  console.log("Existing Categories for Tournament 5:");
  cats.forEach(c => console.log(`- "${c.name}" (ID: ${c.id})`));
  process.exit(0);
}

main();
