import "dotenv/config";
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { db } from "../src/db";
import { users, participants, categories, matches } from "../src/db/schema";
import { eq, or, and, ilike } from "drizzle-orm";

// Helper to normalize strings for comparison
function normalize(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const manualNameMap: Record<string, string> = {
  "kai": "kaivalya",
  "tvisha": "tvisha", 
  "anisha": "anisha",
  "nadia": "nadia",
  "kimberly": "kimberly",
  "junette": "junette",
  "neerja": "neerja",
  "urvi": "urvi",
  "saanj": "saanj",
};

async function main() {
  console.log("Starting score update for Tournament 5...");

  const buf = fs.readFileSync('Updated Points Table.xlsx');
  const wb = XLSX.read(buf);

  const sheetMappings = [
    { sheet: 'mens singles', category: "Men's Singles", type: 'singles' },
    // { sheet: 'men doub', category: "Men's Doubles", type: 'doubles' },
    // { sheet: 'boys sing', category: "Boys Singles", type: 'singles' },
    // { sheet: 'boys doub', category: "Boys Doubles", type: 'doubles' },
    // { sheet: '40+ Singles', category: "40+ Men", type: 'singles' },
    // { sheet: 'women sing', category: "Ladies Singles", type: 'singles' },
    // { sheet: 'women doub', category: "Ladies Doubles", type: 'doubles' },
  ];

  for (const mapping of sheetMappings) {
    console.log(`\nProcessing ${mapping.sheet} -> ${mapping.category}...`);
    
    const sheet = wb.Sheets[mapping.sheet];
    if (!sheet) continue;

    // 1. Get Category ID
    const category = await db.query.categories.findFirst({
      where: and(
        eq(categories.tournamentId, 5),
        eq(categories.name, mapping.category)
      )
    });

    if (!category) {
      console.log(`Category ${mapping.category} not found.`);
      continue;
    }

    // 2. Fetch all participants for this category
    const categoryParticipants = await db.query.participants.findMany({
      where: eq(participants.categoryId, category.id),
      with: {
        user: true,
        partner: true
      }
    });

    // 3. Parse Excel Data
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    
    // Find the rows that have 'x' in them.
    const rowsWithX = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (row.some(cell => typeof cell === 'string' && cell.toLowerCase() === 'x')) {
        rowsWithX.push(i);
      }
    }

    if (rowsWithX.length === 0) {
      console.log("No matrix found (no 'x' cells).");
      continue;
    }

    // Map Row Index -> Participant
    const rowParticipantMap = new Map<number, any>();
    
    for (const rowIndex of rowsWithX) {
      const row = data[rowIndex];
      
      // Try index 1 or 2 for Name
      let nameCell = row[1];
      if (typeof nameCell !== 'string') {
        nameCell = row[2];
      }
      
      if (typeof nameCell !== 'string') continue;

      // Find participant matching this name
      const matchedParticipant = findParticipant(nameCell, categoryParticipants, mapping.type);
      if (matchedParticipant) {
        rowParticipantMap.set(rowIndex, matchedParticipant);
        console.log(`Row ${rowIndex}: "${nameCell}" -> ID ${matchedParticipant.id}`);
      } else {
        console.log(`Row ${rowIndex}: "${nameCell}" -> Not found`);
        // Debug: print available names to help identify why
        // console.log("Available:", categoryParticipants.map(p => normalize(p.user.name)));
      }
    }

    // Map Column Index -> Participant
    const colParticipantMap = new Map<number, any>();
    
    for (const [rowIndex, participant] of rowParticipantMap.entries()) {
      const row = data[rowIndex];
      // Find the column index that has 'x'
      const xColIndex = row.findIndex(cell => typeof cell === 'string' && cell.toLowerCase() === 'x');
      if (xColIndex !== -1) {
        colParticipantMap.set(xColIndex, participant);
      }
    }

    // 4. Process Scores
    for (const [rowIndex, rowParticipant] of rowParticipantMap.entries()) {
      const row = data[rowIndex];
      
      for (const [colIndex, colParticipant] of colParticipantMap.entries()) {
        if (rowIndex === colIndex) continue; // Skip diagonal (should be 'x')
        if (rowParticipant.id === colParticipant.id) continue; // Same participant

        const cellValue = row[colIndex];
        if (typeof cellValue !== 'string') continue;
        
        const scoreStr = cellValue.trim();
        if (scoreStr === 'x' || scoreStr === '') continue;

        let p1Score = 0;
        let p2Score = 0;
        
        // Remove double dashes
        const cleanScore = scoreStr.replace('--', '-');
        const parts = cleanScore.split('-');
        if (parts.length === 2) {
          p1Score = parseInt(parts[0]);
          p2Score = parseInt(parts[1]);
        } else {
          continue;
        }

        if (isNaN(p1Score) || isNaN(p2Score)) continue;

        // Determine match result
        // RowParticipant vs ColParticipant
        // Score is p1Score - p2Score
        
        // We need to find the match in DB
        const match = await db.query.matches.findFirst({
          where: or(
            and(eq(matches.participant1Id, rowParticipant.id), eq(matches.participant2Id, colParticipant.id)),
            and(eq(matches.participant1Id, colParticipant.id), eq(matches.participant2Id, rowParticipant.id))
          )
        });

        if (!match) {
          console.log(`Match not found: ${rowParticipant.id} vs ${colParticipant.id}`);
          continue;
        }

        // Determine who is P1 and P2 in the DB match
        const isRowP1 = match.participant1Id === rowParticipant.id;
        
        // Calculate Set Scores based on user rules
        // Rule 1: "2-0" -> Singles: 4-0 4-0, Doubles: 6-0 6-0
        // Rule 2: "2-1" -> 4-0 0-4 4-0
        
        let set1P1, set1P2, set2P1, set2P2, set3P1, set3P2;
        
        const winningScore = mapping.type === 'doubles' ? 6 : 4;
        const losingScore = 0;

        if (p1Score === 2 && p2Score === 0) {
          // Row Player Won 2-0
          set1P1 = winningScore; set1P2 = losingScore;
          set2P1 = winningScore; set2P2 = losingScore;
        } else if (p1Score === 0 && p2Score === 2) {
          // Row Player Lost 0-2
          set1P1 = losingScore; set1P2 = winningScore;
          set2P1 = losingScore; set2P2 = winningScore;
        } else if (p1Score === 2 && p2Score === 1) {
          // Row Player Won 2-1
          set1P1 = winningScore; set1P2 = losingScore;
          set2P1 = losingScore; set2P2 = winningScore;
          set3P1 = winningScore; set3P2 = losingScore;
        } else if (p1Score === 1 && p2Score === 2) {
          // Row Player Lost 1-2
          set1P1 = losingScore; set1P2 = winningScore;
          set2P1 = winningScore; set2P2 = losingScore;
          set3P1 = losingScore; set3P2 = winningScore;
        } else if (p1Score > 2 || p2Score > 2) {
          // Assume Game Score for Single Set (e.g. 4-0, 4-1, 3-2)
          set1P1 = p1Score;
          set1P2 = p2Score;
        } else {
          console.log(`Unhandled score format: ${scoreStr} for ${rowParticipant.id} vs ${colParticipant.id}`);
          continue;
        }

        // Apply to match object (swapping if RowPlayer is P2)
        const updateData: any = {
          status: 'completed',
          winnerId: p1Score > p2Score ? rowParticipant.id : colParticipant.id
        };

        if (isRowP1) {
          updateData.set1Player1 = set1P1; updateData.set1Player2 = set1P2;
          updateData.set2Player1 = set2P1; updateData.set2Player2 = set2P2;
          updateData.set3Player1 = set3P1; updateData.set3Player2 = set3P2;
        } else {
          updateData.set1Player1 = set1P2; updateData.set1Player2 = set1P1;
          updateData.set2Player1 = set2P2; updateData.set2Player2 = set2P1;
          updateData.set3Player1 = set3P2; updateData.set3Player2 = set3P1;
        }

        // Update DB
        await db.update(matches).set(updateData).where(eq(matches.id, match.id));
        console.log(`Updated Match ${match.id}: ${scoreStr} -> Sets updated.`);
      }
    }
  }
  
  console.log("Score update complete.");
  process.exit(0);
}

function findParticipant(name: string, participants: any[], type: string) {
  const normName = normalize(name);
  
  // Check manual map
  for (const [key, val] of Object.entries(manualNameMap)) {
    if (normName.includes(key) || key.includes(normName)) {
       // Try to find the mapped name in participants
       const mappedNorm = normalize(val);
       const found = participants.find(p => {
         const pName = normalize(p.user.name);
         return pName.includes(mappedNorm) || mappedNorm.includes(pName);
       });
       if (found) return found;
    }
  }

  // 1. Exact/Fuzzy match on User Name
  let found = participants.find(p => {
    const pName = normalize(p.user.name);
    return pName === normName || pName.includes(normName) || normName.includes(pName);
  });
  if (found) return found;

  // 2. For Doubles, check Partner Name or Combined Name
  if (type === 'doubles') {
    // Check if name contains '&'
    if (name.includes('&')) {
      const parts = name.split('&').map(s => normalize(s));
      found = participants.find(p => {
        if (!p.partner) return false;
        const uName = normalize(p.user.name);
        const pName = normalize(p.partner.name);
        // Check if both parts match either user or partner
        const match1 = (uName.includes(parts[0]) || parts[0].includes(uName)) && (pName.includes(parts[1]) || parts[1].includes(pName));
        const match2 = (uName.includes(parts[1]) || parts[1].includes(uName)) && (pName.includes(parts[0]) || parts[0].includes(pName));
        return match1 || match2;
      });
      if (found) return found;
    } else {
      // Sometimes doubles team is listed by just one name in the row header?
      found = participants.find(p => {
        if (!p.partner) return false;
        const uName = normalize(p.user.name);
        const pName = normalize(p.partner.name);
        return uName.includes(normName) || normName.includes(uName) || pName.includes(normName) || normName.includes(pName);
      });
      if (found) return found;
    }
  }

  return null;
}

main();
