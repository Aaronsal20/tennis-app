import { db } from '../src/db';
import { matches, participants, users, categories } from '../src/db/schema';
import { eq, and, or } from 'drizzle-orm';
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const TOURNAMENT_ID = 6;

// Map Sheet Name to Category Name (if different)
const SHEET_TO_CATEGORY: Record<string, string> = {
  'Mens Singles': 'Mens Singles',
  'Mens Doubles': 'Mens Doubles',
  'Mixed Doubles': 'Mixed Doubles',
  'Ladies Doubles': 'Ladies Doubles',
  'Ladies Singles': 'Ladies Singles',
  'Boys Singles': 'Boys Singles',
  'Boys Doubles': 'Boys Doubles',
  'Mens 40+ Singles': 'Mens 40+ Singles',
};

async function updateScores() {
  const filePath = path.join(process.cwd(), '2nd edition.xlsx');
  const workbook = xlsx.readFile(filePath);

  for (const [sheetName, categoryName] of Object.entries(SHEET_TO_CATEGORY)) {
    console.log(`Processing ${sheetName}...`);
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      console.log(`Sheet ${sheetName} not found.`);
      continue;
    }

    // Get Category ID
    const category = await db.query.categories.findFirst({
      where: and(
        eq(categories.tournamentId, TOURNAMENT_ID),
        eq(categories.name, categoryName)
      ),
    });

    if (!category) {
      console.log(`Category ${categoryName} not found in DB.`);
      continue;
    }

    const isDoubles = category.type === 'doubles';

    // Get all participants for this category
    const categoryParticipants = await db.query.participants.findMany({
      where: eq(participants.categoryId, category.id),
      with: {
        user: true,
        partner: true,
      },
    });

    // Helper to find participant by name(s)
    const findParticipant = (nameStr: string) => {
      const normalizedName = nameStr.toLowerCase().trim().replace(/\s+/g, ' ');
      
      if (isDoubles) {
        // Split by '+' or '&' or ' and '
        const parts = normalizedName.split(/\+|&| and /).map(s => s.trim());
        if (parts.length < 2) return null;
        
        return categoryParticipants.find(p => {
          if (!p.user || !p.partner) return false;
          const p1 = p.user.name?.toLowerCase().trim().replace(/\s+/g, ' ');
          const p2 = p.partner.name?.toLowerCase().trim().replace(/\s+/g, ' ');
          
          // Check both combinations
          return (
            (p1?.includes(parts[0]) && p2?.includes(parts[1])) ||
            (p1?.includes(parts[1]) && p2?.includes(parts[0]))
          );
        });
      } else {
        return categoryParticipants.find(p => {
          const pName = p.user?.name?.toLowerCase().trim().replace(/\s+/g, ' ');
          return pName === normalizedName || pName?.includes(normalizedName) || normalizedName.includes(pName || '___');
        });
      }
    };

    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    if (data.length < 2) continue;

    // Row 0 is headers (Opponents)
    // Opponents start at index 1 (cols 1,2), 3 (cols 3,4), etc.
    // Actually, based on inspection:
    // 0: Name
    // 1: Opponent 1 Name
    // 2: Empty
    // 3: Opponent 2 Name
    // 4: Empty
    
    const headerRow = data[0];
    const opponents: { name: string, colIndex: number }[] = [];
    
    for (let i = 1; i < headerRow.length; i += 2) {
      const name = headerRow[i];
      if (name && typeof name === 'string' && name !== 'Total Points' && name !== 'Rank') {
        opponents.push({ name, colIndex: i });
      }
    }

    // Iterate Rows (Players)
    for (let r = 1; r < data.length; r++) {
      const row = data[r];
      const playerName = row[0];
      if (!playerName || typeof playerName !== 'string') continue;

      const playerParticipant = findParticipant(playerName);
      if (!playerParticipant) {
        console.log(`Participant not found for: ${playerName}`);
        continue;
      }

      for (const opponent of opponents) {
        const scoreP1 = row[opponent.colIndex]; // Player Score
        const scoreP2 = row[opponent.colIndex + 1]; // Opponent Score

        // Check if scores are valid numbers
        if (typeof scoreP1 === 'number' && typeof scoreP2 === 'number') {
          const opponentParticipant = findParticipant(opponent.name);
          if (!opponentParticipant) {
             // console.log(`Opponent not found: ${opponent.name}`);
             continue;
          }

          if (playerParticipant.id === opponentParticipant.id) continue;

          // Find Match
          const match = await db.query.matches.findFirst({
            where: and(
              eq(matches.categoryId, category.id),
              or(
                and(eq(matches.participant1Id, playerParticipant.id), eq(matches.participant2Id, opponentParticipant.id)),
                and(eq(matches.participant1Id, opponentParticipant.id), eq(matches.participant2Id, playerParticipant.id))
              )
            ),
          });

          if (match) {
            // Determine scores based on perspective
            let p1Score = scoreP1;
            let p2Score = scoreP2;
            
            // If match is stored as Opponent vs Player, swap scores
            if (match.participant1Id === opponentParticipant.id) {
              p1Score = scoreP2;
              p2Score = scoreP1;
            }

            // Calculate Sets
            let set1P1 = 0, set1P2 = 0;
            let set2P1 = 0, set2P2 = 0;
            let set3P1 = 0, set3P2 = 0;
            let winnerId = null;

            const winSetScore = isDoubles ? 6 : 4;
            const loseSetScore = 0;

            if (p1Score === 2 && p2Score === 0) {
              set1P1 = winSetScore; set1P2 = loseSetScore;
              set2P1 = winSetScore; set2P2 = loseSetScore;
              winnerId = match.participant1Id;
            } else if (p1Score === 0 && p2Score === 2) {
              set1P1 = loseSetScore; set1P2 = winSetScore;
              set2P1 = loseSetScore; set2P2 = winSetScore;
              winnerId = match.participant2Id;
            } else if (p1Score === 2 && p2Score === 1) {
              set1P1 = winSetScore; set1P2 = loseSetScore;
              set2P1 = loseSetScore; set2P2 = winSetScore;
              set3P1 = winSetScore; set3P2 = loseSetScore;
              winnerId = match.participant1Id;
            } else if (p1Score === 1 && p2Score === 2) {
              set1P1 = loseSetScore; set1P2 = winSetScore;
              set2P1 = winSetScore; set2P2 = loseSetScore;
              set3P1 = loseSetScore; set3P2 = winSetScore;
              winnerId = match.participant2Id;
            } else {
               // console.log(`Unknown score format: ${p1Score}-${p2Score} for match ${match.id}`);
               continue;
            }

            // Update Match
            await db.update(matches)
              .set({
                set1Player1: set1P1,
                set1Player2: set1P2,
                set2Player1: set2P1,
                set2Player2: set2P2,
                set3Player1: set3P1,
                set3Player2: set3P2,
                winnerId: winnerId,
                status: 'completed',
              })
              .where(eq(matches.id, match.id));
              
            console.log(`Updated match ${match.id}: ${playerName} vs ${opponent.name} (${p1Score}-${p2Score})`);
          } else {
             // console.log(`Match not found: ${playerName} vs ${opponent.name}`);
          }
        }
      }
    }
  }
}

updateScores().catch(console.error);
