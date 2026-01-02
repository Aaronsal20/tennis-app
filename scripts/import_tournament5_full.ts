import "dotenv/config";
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { db } from "../src/db";
import { users, participants, categories, tournaments } from "../src/db/schema";
import { eq, or, and, sql, ilike } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function hashPasswordLocal(password: string) {
  return await bcrypt.hash(password, 10);
}

async function getOrCreateUser(name: string, phone: string | number | undefined) {
  const phoneStr = phone ? String(phone).trim() : undefined;
  const nameStr = name.trim();

  // 1. Try exact match by Phone (High confidence)
  if (phoneStr) {
    const userByPhone = await db.query.users.findFirst({
      where: eq(users.phone, phoneStr)
    });
    if (userByPhone) return userByPhone;
  }

  // 2. Try exact match by Name (Case insensitive)
  const userByName = await db.query.users.findFirst({
    where: ilike(users.name, nameStr)
  });
  if (userByName) return userByName;

  // 3. Try fuzzy match (Starts with) - e.g. "Aaron" matches "Aaron Saldanha"
  // Only if name length is reasonable to avoid matching "A" to everyone
  if (nameStr.length >= 3) {
    const userByPartialName = await db.query.users.findFirst({
      where: ilike(users.name, `${nameStr}%`)
    });
    
    if (userByPartialName) {
      console.log(`Fuzzy match: "${nameStr}" -> "${userByPartialName.name}"`);
      return userByPartialName;
    }
  }

  // 4. Create new user if not found
  console.log(`Creating new user: ${nameStr}`);
  const hashedPassword = await hashPasswordLocal("password123");
  const [newUser] = await db.insert(users).values({
    name: nameStr,
    phone: phoneStr || null,
    email: null,
    password: hashedPassword,
    role: "user",
    isActive: true
  }).returning();
  return newUser;
}

async function main() {
  console.log("Starting import for Tournament 5...");

  // 1. Create Tournament 5 (Skipped as requested)
  // try {
  //   await db.execute(sql`
  //     INSERT INTO tournaments (id, name, start_date, end_date, description)
  //     VALUES (5, 'Tournament 5', NOW(), NOW() + INTERVAL '7 days', 'Imported from Excel')
  //     ON CONFLICT (id) DO NOTHING
  //   `);
  //   console.log("Tournament 5 created (or already exists).");
  // } catch (e) {
  //   console.error("Error creating tournament:", e);
  //   // Fallback if ID 5 fails (e.g. if sequence is messed up, but ON CONFLICT should handle it)
  // }

  const buf = fs.readFileSync('Updated Points Table.xlsx');
  const wb = XLSX.read(buf);

  const sheetMappings = [
    { sheet: 'mens singles', category: "Men's Singles", type: 'singles' },
    { sheet: 'men doub', category: "Men's Doubles", type: 'doubles' },
    { sheet: 'boys sing', category: "Boys Singles", type: 'singles' },
    { sheet: 'boys doub', category: "Boys Doubles", type: 'doubles' },
    { sheet: '40+ Singles', category: "40+ Men", type: 'singles' },
    { sheet: 'women sing', category: "Ladies Singles", type: 'singles' },
    { sheet: 'women doub', category: "Ladies Doubles", type: 'doubles' },
  ];

  for (const mapping of sheetMappings) {
    console.log(`\nProcessing ${mapping.sheet} -> ${mapping.category}...`);
    
    const sheet = wb.Sheets[mapping.sheet];
    if (!sheet) {
      console.log(`Sheet ${mapping.sheet} not found. Skipping.`);
      continue;
    }

    // 2. Find Category
    const existingCategory = await db.query.categories.findFirst({
      where: and(
        eq(categories.tournamentId, 5),
        eq(categories.name, mapping.category)
      )
    });

    if (!existingCategory) {
      console.log(`Category "${mapping.category}" not found for Tournament 5. Skipping.`);
      continue;
    }
    
    const categoryId = existingCategory.id;
    console.log(`Found Category ID: ${categoryId}`);

    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    // 3. Process Rows
    if (mapping.sheet === 'boys doub') {
      // Special logic for split rows
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        // Look for rows where column 0 (Sr No) is a number
        if (row.length > 0 && typeof row[0] === 'number') {
          const name1 = row[1];
          const phone1 = row[3];
          
          // Next row should be partner
          const nextRow = data[i+1];
          if (nextRow && !nextRow[0] && nextRow[1]) {
             const name2 = nextRow[1];
             const phone2 = nextRow[3];

             if (name1 && name2) {
               console.log(`Found Team: ${name1} & ${name2}`);
               const user1 = await getOrCreateUser(name1, phone1);
               const user2 = await getOrCreateUser(name2, phone2);

               // Add to participants
               await addToCategory(user1.id, categoryId, user2.id);
             }
          }
        }
      }
    } else if (mapping.sheet === 'men doub' || mapping.sheet === 'women doub') {
      // Special logic for combined names "Name1 & Name2"
      for (const row of data) {
        if (row.length > 0 && typeof row[0] === 'number') {
          const combinedName = row[1] as string;
          const phone1 = row[3];
          const phone2 = row[4]; // 5th column

          if (combinedName && combinedName.includes('&')) {
            const [name1, name2] = combinedName.split('&').map(s => s.trim());
            console.log(`Found Team: ${name1} & ${name2}`);
            
            const user1 = await getOrCreateUser(name1, phone1);
            const user2 = await getOrCreateUser(name2, phone2);

            await addToCategory(user1.id, categoryId, user2.id);
          }
        }
      }
    } else {
      // Standard Singles
      for (const row of data) {
        if (row.length > 0 && typeof row[0] === 'number') {
          const name = row[1];
          const phone = row[3];

          if (name) {
            console.log(`Found Player: ${name}`);
            const user = await getOrCreateUser(name, phone);
            await addToCategory(user.id, categoryId);
          }
        }
      }
    }
  }

  console.log("Import complete.");
  process.exit(0);
}

async function addToCategory(userId: number, categoryId: number, partnerId?: number) {
  const existing = await db.query.participants.findFirst({
    where: and(
      eq(participants.userId, userId),
      eq(participants.categoryId, categoryId)
    )
  });

  if (!existing) {
    await db.insert(participants).values({
      userId,
      categoryId,
      partnerId: partnerId || null
    });
  }
}

main();
