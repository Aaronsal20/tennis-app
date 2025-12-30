import { db } from "../src/db";
import { users } from "../src/db/schema";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Please provide an email address.");
    process.exit(1);
  }

  console.log(`Promoting ${email} to admin...`);

  const [updatedUser] = await db.update(users)
    .set({ role: "admin" })
    .where(eq(users.email, email))
    .returning();

  if (updatedUser) {
    console.log(`Successfully promoted ${updatedUser.name} (${updatedUser.email}) to admin.`);
  } else {
    console.error("User not found.");
  }

  process.exit(0);
}

main();
