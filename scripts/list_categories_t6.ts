import { db } from '../src/db';
import { categories } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function listCategories() {
  const tournamentId = 6;
  const cats = await db.select().from(categories).where(eq(categories.tournamentId, tournamentId));
  console.log(cats);
}

listCategories().catch(console.error);
