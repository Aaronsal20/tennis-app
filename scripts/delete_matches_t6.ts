import { db } from '../src/db';
import { matches, categories } from '../src/db/schema';
import { eq, inArray } from 'drizzle-orm';

async function deleteMatches() {
  const tournamentId = 6;
  
  console.log(`Finding categories for tournament ${tournamentId}...`);
  
  // Find categories for this tournament
  const tournamentCategories = await db.select({ id: categories.id })
    .from(categories)
    .where(eq(categories.tournamentId, tournamentId));
    
  const categoryIds = tournamentCategories.map(c => c.id);
  
  if (categoryIds.length === 0) {
    console.log('No categories found for tournament', tournamentId);
    return;
  }
  
  console.log('Found categories:', categoryIds);
  
  // Delete matches in these categories
  const result = await db.delete(matches)
    .where(inArray(matches.categoryId, categoryIds))
    .returning({ id: matches.id });
    
  console.log(`Deleted ${result.length} matches.`);
}

deleteMatches().catch(console.error);
