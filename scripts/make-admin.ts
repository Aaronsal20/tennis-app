import { db } from "../src/db";
import { users } from "../src/db/schema";
import { eq, or } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

async function main() {
  const identifier = process.argv[2];
  if (!identifier) {
    console.error("Please provide an email address or phone number.");
    process.exit(1);
  }

  console.log(`Promoting ${identifier} to admin...`);

  const [updatedUser] = await db.update(users)
    .set({ role: "admin" })
    .where(or(eq(users.email, identifier), eq(users.phone, identifier)))
    .returning();

  if (updatedUser) {
    console.log(`Successfully promoted ${updatedUser.name} (${updatedUser.email || updatedUser.phone}) to admin.`);
  } else {
    console.error("User not found.");
  }

  process.exit(0);
}

main();
