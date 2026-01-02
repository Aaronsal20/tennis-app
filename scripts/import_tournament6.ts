import 'dotenv/config';
import { db } from '../src/db';
import { users, tournaments, categories, participants, matches } from '../src/db/schema';
import { eq, and, like } from 'drizzle-orm';
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const TOURNAMENT_ID = 6;
const FILE_PATH = '2nd edition.xlsx';

// Helper to normalize names for matching
function normalizeName(name: string) {
  return name ? name.trim().toLowerCase().replace(/\s+/g, ' ') : '';
}

async function main() {
  console.log('Starting import for Tournament 6...');
  
  const filePath = path.join(process.cwd(), FILE_PATH);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  
  const workbook = xlsx.readFile(filePath);

  // 1. Import Users from Contact Details
  console.log('Importing users from Contact Details...');
  const contactSheet = workbook.Sheets['Contact Details'];
  const contacts = xlsx.utils.sheet_to_json(contactSheet, { header: 1 }) as any[][];
  
  // Skip header (row 0)
  const userMap = new Map<string, any>(); // Normalized Full Name -> User
  const firstNameMap = new Map<string, any[]>(); // Normalized First Name -> [User]
  
  for (let i = 1; i < contacts.length; i++) {
    const row = contacts[i];
    if (!row || row.length === 0) continue;
    
    const name = row[0] as string;
    const phone = row[1] ? String(row[1]) : null;
    
    if (!name) continue;
    
    // Check if user exists by phone (if phone is present)
    let user;
    if (phone) {
      const existingUsers = await db.select().from(users).where(eq(users.phone, phone));
      if (existingUsers.length > 0) {
        user = existingUsers[0];
      }
    }
    
    if (!user) {
      // Check by name if phone didn't match
      const existingUsersByName = await db.select().from(users).where(eq(users.name, name));
      if (existingUsersByName.length > 0) {
        user = existingUsersByName[0];
        // Update phone if missing
        if (!user.phone && phone) {
            await db.update(users).set({ phone }).where(eq(users.id, user.id));
            user.phone = phone;
        }
      }
    }
    
    if (!user) {
      // Create new user
      const [newUser] = await db.insert(users).values({
        name: name.trim(),
        phone: phone,
        role: 'user',
        password: 'password', // Default password
        email: `${name.replace(/\s+/g, '').toLowerCase()}@example.com`, // Dummy email
      }).returning();
      user = newUser;
      console.log(`Created user: ${user.name}`);
    }
    
    const normName = normalizeName(user.name!);
    userMap.set(normName, user);
    
    const firstName = normName.split(' ')[0];
    if (!firstNameMap.has(firstName)) {
      firstNameMap.set(firstName, []);
    }
    firstNameMap.get(firstName)!.push(user);
  }
  
  console.log(`Processed ${userMap.size} users.`);

  // 2. Process Categories
  const categorySheets = [
    'Mens Singles',
    'Mens Doubles',
    'Mixed Doubles',
    'Ladies Doubles',
    'Ladies Singles',
    'Boys Singles',
    'Boys Doubles',
    'Mens 40+ Singles'
  ];

  for (const sheetName of categorySheets) {
    console.log(`Processing category: ${sheetName}`);
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
        console.log(`Sheet ${sheetName} not found, skipping.`);
        continue;
    }
    
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    if (data.length < 2) continue;

    // Create/Get Category
    let categoryType = 'singles';
    if (sheetName.toLowerCase().includes('doubles')) {
        categoryType = 'doubles';
    }

    let category = await db.query.categories.findFirst({
        where: and(
            eq(categories.tournamentId, TOURNAMENT_ID),
            eq(categories.name, sheetName)
        )
    });

    if (!category) {
        const [newCat] = await db.insert(categories).values({
            tournamentId: TOURNAMENT_ID,
            name: sheetName,
            type: categoryType,
            format: 'full-set',
        }).returning();
        category = newCat;
        console.log(`Created category: ${category.name}`);
    }

    // Parse Participants
    const participantsMap = new Map<string, any>(); // Name (from Row) -> Participant

    // Helper to find user(s)
    const findUser = (name: string) => {
        const norm = normalizeName(name);
        if (userMap.has(norm)) return userMap.get(norm);
        
        // Try first name match
        const first = norm.split(' ')[0];
        if (firstNameMap.has(first)) {
            const candidates = firstNameMap.get(first)!;
            if (candidates.length === 1) return candidates[0];
            // Try to match with contains
            const found = candidates.find(u => normalizeName(u.name).includes(norm) || norm.includes(normalizeName(u.name)));
            if (found) return found;
        }
        return null;
    };

    // First pass: Create all participants from the rows (Column 0)
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || !row[0]) continue;
        const participantName = row[0] as string;
        if (participantName === 'Total Points' || participantName === 'Rank') continue;

        if (participantsMap.has(participantName)) continue;

        let p1Id: number | null = null;
        let p2Id: number | null = null;

        if (categoryType === 'doubles') {
            const parts = participantName.split('+').map(s => s.trim());
            if (parts.length === 2) {
                const u1 = findUser(parts[0]);
                const u2 = findUser(parts[1]);
                if (u1) p1Id = u1.id;
                if (u2) p2Id = u2.id;
                
                if (!u1 || !u2) {
                    console.warn(`Could not find users for doubles pair: ${participantName}`);
                }
            }
        } else {
            const u = findUser(participantName);
            if (u) p1Id = u.id;
            else console.warn(`Could not find user for: ${participantName}`);
        }

        if (p1Id) {
            // Check if participant exists in DB
            let participant = await db.query.participants.findFirst({
                where: and(
                    eq(participants.categoryId, category.id),
                    eq(participants.userId, p1Id),
                    p2Id ? eq(participants.partnerId, p2Id) : undefined
                )
            });

            if (!participant) {
                const [newP] = await db.insert(participants).values({
                    categoryId: category.id,
                    userId: p1Id,
                    partnerId: p2Id,
                }).returning();
                participant = newP;
            }
            participantsMap.set(participantName, participant);
        }
    }

    // Second pass: Process Matches
    const headerRow = data[0];
    const opponents: { name: string, colIndex: number, participant: any }[] = [];
    
    // Map header names to participants
    for (let c = 1; c < headerRow.length; c += 2) {
        const name = headerRow[c];
        if (name && typeof name === 'string') {
            // Find the participant that matches this header name
            let matchedParticipant = null;
            
            // Exact match
            if (participantsMap.has(name)) {
                matchedParticipant = participantsMap.get(name);
            } else {
                // Fuzzy match: check if any participant name contains this header name
                for (const [pName, pVal] of participantsMap.entries()) {
                    if (normalizeName(pName).includes(normalizeName(name)) || normalizeName(name).includes(normalizeName(pName))) {
                        matchedParticipant = pVal;
                        break;
                    }
                    // For doubles: "Ashok + Sagar"
                    if (categoryType === 'doubles') {
                         // Check if both names are present
                         const parts = name.split('+').map(s => normalizeName(s));
                         const pParts = pName.split('+').map(s => normalizeName(s));
                         // Logic is getting complex. Let's assume the header name is a substring of the row name.
                    }
                }
            }
            
            if (matchedParticipant) {
                opponents.push({ name, colIndex: c, participant: matchedParticipant });
            } else {
                console.warn(`Could not map header "${name}" to a participant in ${sheetName}`);
            }
        }
    }

    for (let r = 1; r < data.length; r++) {
        const row = data[r];
        if (!row || !row[0]) continue;
        const p1Name = row[0] as string;
        if (p1Name === 'Total Points' || p1Name === 'Rank') continue;

        const p1 = participantsMap.get(p1Name);
        if (!p1) continue;

        for (const opp of opponents) {
            const p2 = opp.participant;
            if (p1.id === p2.id) continue; // Self match

            // Only process if p1.id < p2.id to avoid duplicates
            if (p1.id >= p2.id) continue;

            const score1 = row[opp.colIndex];
            const score2 = row[opp.colIndex + 1];

            if (score1 === undefined || score2 === undefined) continue;
            // Check for empty or null
            if (score1 === null || score2 === null || score1 === '' || score2 === '') continue;

            // Check if match already exists
            const existingMatch = await db.query.matches.findFirst({
                where: and(
                    eq(matches.categoryId, category.id),
                    eq(matches.participant1Id, p1.id),
                    eq(matches.participant2Id, p2.id)
                )
            });

            if (!existingMatch) {
                 await db.insert(matches).values({
                    categoryId: category.id,
                    participant1Id: p1.id,
                    participant2Id: p2.id,
                    set1Player1: Number(score1),
                    set1Player2: Number(score2),
                    status: 'completed',
                    round: 'group'
                });
                console.log(`Created match: ${p1Name} vs ${opp.name} (${score1}-${score2})`);
            }
        }
    }
  }
  
  process.exit(0);
}

main().catch(console.error);
