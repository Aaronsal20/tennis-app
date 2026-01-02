import "dotenv/config";
import { db } from "../src/db";
import { categories } from "../src/db/schema";
import { eq, and } from "drizzle-orm";

async function main() {
  const tournamentId = 3;
  const categoryName = "Men's Singles";

  const category = await db.query.categories.findFirst({
    where: and(
      eq(categories.tournamentId, tournamentId),
      eq(categories.name, categoryName)
    ),
  });

  if (category) {
    console.log(`Category ID: ${category.id}`);
  } else {
    console.log("Category not found");
    // Create it if it doesn't exist?
    // The user said "respective categories", implying they might exist.
    // If not found, I should probably create it.
  }
  process.exit(0);
}

main();
