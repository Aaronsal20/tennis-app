import "dotenv/config";
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { db } from "../src/db";
import { users, participants } from "../src/db/schema";
import { eq, or, and } from "drizzle-orm";
import { hashPassword } from "../src/lib/auth"; // I might need to mock this or import it. 
// Wait, hashPassword uses bcryptjs which might not be available in the script context if I don't compile it? 
// No, tsx handles typescript files. But `src/lib/auth` imports `next/headers` which might fail in a script.
// I should implement a simple hash or just set a default password without using the auth lib if it has nextjs dependencies.

// Let's check src/lib/auth.ts content again.
// It imports `cookies` from `next/headers`. This will crash in a standalone script.
// So I will implement a local hash function or just use bcryptjs directly.

import bcrypt from "bcryptjs";

async function hashPasswordLocal(password: string) {
  return await bcrypt.hash(password, 10);
}

async function main() {
  const buf = fs.readFileSync('Updated Points Table.xlsx');
  const wb = XLSX.read(buf);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);

  const categoryId = 14; // Men's Singles for Tournament 3

  // The data array has rows. Rows 1-14 (index 0-13) contain the user list.
  // We can iterate through them.
  // The keys are __EMPTY_1 (Name) and __EMPTY_2 (Contact Number).
  
  // Let's filter for rows that have a valid name and contact number.
  // Based on the previous output, the first row is header "Sr No", "Name", "Contact Number".
  // But sheet_to_json might have used the first row as keys if not specified, but here it generated __EMPTY keys.
  // The output showed:
  // { "__EMPTY": 1, "__EMPTY_1": "Nihaal Borkar", "__EMPTY_2": 9225989803 }
  
  const usersList = [];
  for (const row of data as any[]) {
    if (row.__EMPTY_1 && row.__EMPTY_2 && typeof row.__EMPTY === 'number') {
      usersList.push({
        name: row.__EMPTY_1,
        phone: String(row.__EMPTY_2)
      });
    }
  }

  console.log(`Found ${usersList.length} users to process.`);

  for (const u of usersList) {
    console.log(`Processing ${u.name} (${u.phone})...`);

    // Check if user exists
    let user = await db.query.users.findFirst({
      where: or(
        eq(users.phone, u.phone),
        eq(users.name, u.name)
      )
    });

    if (!user) {
      console.log(`Creating new user: ${u.name}`);
      const hashedPassword = await hashPasswordLocal("password123"); // Default password
      const [newUser] = await db.insert(users).values({
        name: u.name,
        phone: u.phone,
        email: null, // Optional now
        password: hashedPassword,
        role: "user",
        isActive: true
      }).returning();
      user = newUser;
    } else {
      console.log(`User found: ${user.name} (ID: ${user.id})`);
      // Update phone if missing?
      if (!user.phone && u.phone) {
         await db.update(users).set({ phone: u.phone }).where(eq(users.id, user.id));
      }
    }

    // Add to participants
    const existingParticipant = await db.query.participants.findFirst({
      where: and(
        eq(participants.userId, user.id),
        eq(participants.categoryId, categoryId)
      )
    });

    if (!existingParticipant) {
      console.log(`Adding to category ${categoryId}...`);
      await db.insert(participants).values({
        userId: user.id,
        categoryId: categoryId,
        partnerId: null
      });
    } else {
      console.log(`Already in category.`);
    }
  }

  console.log("Done.");
  process.exit(0);
}

main();
