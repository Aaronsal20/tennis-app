import { db } from '../src/db';
import { users } from '../src/db/schema';
import { ilike } from 'drizzle-orm';

async function findMarcus() {
  const res = await db.select().from(users).where(ilike(users.name, '%Marcus%'));
  console.log(res);
}

findMarcus().catch(console.error);
