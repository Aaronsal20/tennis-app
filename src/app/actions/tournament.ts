"use server";

import { db } from "@/db";
import { tournaments, categories, participants, matches, users } from "@/db/schema";
import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type CategoryInput = {
  name: string;
  type: "singles" | "doubles";
  format: string;
};

export type TournamentInput = {
  name: string;
  description: string;
  location: string;
  startDate: Date;
  endDate: Date;
  categories: CategoryInput[];
};

export async function createTournamentWithCategories(data: TournamentInput) {
  if (!process.env.DATABASE_URL) {
    throw new Error("Database not configured");
  }

  // 1. Create Tournament
  const [newTournament] = await db.insert(tournaments).values({
    name: data.name,
    description: data.description,
    location: data.location,
    startDate: data.startDate,
    endDate: data.endDate,
  }).returning();

  // 2. Create Categories if any
  if (data.categories.length > 0) {
    await db.insert(categories).values(
      data.categories.map((cat) => ({
        tournamentId: newTournament.id,
        name: cat.name,
        type: cat.type,
        format: cat.format,
      }))
    );
  }

  redirect(`/admin/tournaments/${newTournament.id}`);
}

export async function generateFixtures(categoryId: number) {
  const parts = await db.select().from(participants).where(eq(participants.categoryId, categoryId));
  
  if (parts.length < 2) return;

  const newMatches = [];
  for (let i = 0; i < parts.length; i++) {
    for (let j = i + 1; j < parts.length; j++) {
      newMatches.push({
        categoryId,
        participant1Id: parts[i].id,
        participant2Id: parts[j].id,
        status: "pending",
        round: "group",
      });
    }
  }

  if (newMatches.length > 0) {
    await db.insert(matches).values(newMatches);
  }
  
  const category = await db.query.categories.findFirst({
    where: eq(categories.id, categoryId),
  });
  if (category) {
    revalidatePath(`/admin/tournaments/${category.tournamentId}`);
  }
}

export async function updateMatchScore(matchId: number, data: any) {
  const match = await db.query.matches.findFirst({
      where: eq(matches.id, matchId),
  });
  
  if (!match) return;

  let p1Sets = 0;
  let p2Sets = 0;

  // Helper to check set winner
  const checkSet = (p1: number, p2: number, tb1?: number, tb2?: number) => {
      if (p1 > p2) return 1;
      if (p2 > p1) return 2;
      if (tb1 !== undefined && tb2 !== undefined) {
          if (tb1 > tb2) return 1;
          if (tb2 > tb1) return 2;
      }
      return 0;
  };

  if (checkSet(data.set1Player1, data.set1Player2, data.set1TiebreakPlayer1, data.set1TiebreakPlayer2) === 1) p1Sets++;
  else if (checkSet(data.set1Player1, data.set1Player2, data.set1TiebreakPlayer1, data.set1TiebreakPlayer2) === 2) p2Sets++;

  if (checkSet(data.set2Player1, data.set2Player2, data.set2TiebreakPlayer1, data.set2TiebreakPlayer2) === 1) p1Sets++;
  else if (checkSet(data.set2Player1, data.set2Player2, data.set2TiebreakPlayer1, data.set2TiebreakPlayer2) === 2) p2Sets++;

  if (data.set3Player1 !== undefined && data.set3Player2 !== undefined) {
      if (checkSet(data.set3Player1, data.set3Player2, data.set3TiebreakPlayer1, data.set3TiebreakPlayer2) === 1) p1Sets++;
      else if (checkSet(data.set3Player1, data.set3Player2, data.set3TiebreakPlayer1, data.set3TiebreakPlayer2) === 2) p2Sets++;
  }

  let winnerId = null;
  let status = "pending";

  if (p1Sets >= 2) {
      winnerId = match.participant1Id;
      status = "completed";
  } else if (p2Sets >= 2) {
      winnerId = match.participant2Id;
      status = "completed";
  }

  await db.update(matches).set({
      ...data,
      winnerId,
      status,
  }).where(eq(matches.id, matchId));

  if (match.categoryId) {
    const category = await db.query.categories.findFirst({
      where: eq(categories.id, match.categoryId),
    });
    if (category) {
      revalidatePath(`/admin/tournaments/${category.tournamentId}`);
    }
  }
}

export async function registerPlayer(
  userId: number, 
  registrations: { categoryId: number; partnerId?: number | null }[]
) {
  if (!userId || registrations.length === 0) return;

  for (const reg of registrations) {
    // Check if user is already in this category
    const existing = await db.query.participants.findFirst({
      where: and(
        eq(participants.categoryId, reg.categoryId),
        eq(participants.userId, userId)
      )
    });

    if (!existing) {
      await db.insert(participants).values({
        categoryId: reg.categoryId,
        userId,
        partnerId: reg.partnerId || null,
      });
    }
  }

  // Revalidate
  const firstCat = await db.query.categories.findFirst({
    where: eq(categories.id, registrations[0].categoryId),
  });
  if (firstCat) {
    revalidatePath(`/admin/tournaments/${firstCat.tournamentId}`);
  }
}

export async function createUser(data: { name: string; email?: string; phone?: string }) {
  if (!data.name) return;

  const userEmail = data.email || `guest_${Date.now()}@tennis.app`;

  await db.insert(users).values({
    name: data.name,
    email: userEmail,
    phone: data.phone,
    role: "user",
  });
  
  revalidatePath("/admin");
  revalidatePath("/admin/tournaments/[id]", "page"); // Attempt to invalidate dynamic routes
}

export async function createGuestAndRegister(
  guestDetails: { name: string; email?: string; phone?: string },
  registrations: { categoryId: number; partnerId?: number | null; newPartnerName?: string }[]
) {
  if (!guestDetails.name) return;

  // Generate dummy email if not provided
  const userEmail = guestDetails.email || `guest_${Date.now()}@tennis.app`;

  const [newUser] = await db.insert(users).values({
    name: guestDetails.name,
    email: userEmail,
    phone: guestDetails.phone,
    role: "user",
  }).returning();

  if (registrations.length > 0) {
    // Process registrations to resolve new partners
    const finalRegistrations = [];
    for (const reg of registrations) {
      let partnerId = reg.partnerId;

      if (reg.newPartnerName) {
         const partnerEmail = `guest_partner_${Date.now()}_${Math.random().toString(36).substring(7)}@tennis.app`;
         const [newPartner] = await db.insert(users).values({
           name: reg.newPartnerName,
           email: partnerEmail,
           role: "user",
         }).returning();
         partnerId = newPartner.id;
      }

      finalRegistrations.push({
        categoryId: reg.categoryId,
        partnerId: partnerId || null
      });
    }

    await registerPlayer(newUser.id, finalRegistrations);
  }
}

export async function createMatch(categoryId: number, participant1Id: number, participant2Id: number) {
  await db.insert(matches).values({
    categoryId,
    participant1Id,
    participant2Id,
    status: "pending",
  });

  const category = await db.query.categories.findFirst({
    where: eq(categories.id, categoryId),
  });
  if (category) {
    revalidatePath(`/admin/tournaments/${category.tournamentId}`);
  }
}

export async function generateSemiFinals(categoryId: number) {
  // 1. Get all group matches
  const groupMatches = await db.query.matches.findMany({
    where: and(
      eq(matches.categoryId, categoryId),
      eq(matches.round, "group"),
      eq(matches.status, "completed")
    ),
  });

  // 2. Get all participants
  const parts = await db.select().from(participants).where(eq(participants.categoryId, categoryId));
  
  // 3. Calculate standings
  const stats: Record<number, { wins: number }> = {};
  parts.forEach(p => {
    stats[p.id] = { wins: 0 };
  });

  groupMatches.forEach(m => {
    if (m.winnerId) {
      if (stats[m.winnerId]) {
        stats[m.winnerId].wins++;
      }
    }
  });

  // 4. Sort by wins
  const sorted = parts.sort((a, b) => {
    const statA = stats[a.id] || { wins: 0 };
    const statB = stats[b.id] || { wins: 0 };
    return statB.wins - statA.wins;
  });

  if (sorted.length < 4) return;

  // 5. Create Semi-Finals (1 vs 4, 2 vs 3)
  await db.insert(matches).values([
    {
      categoryId,
      participant1Id: sorted[0].id,
      participant2Id: sorted[3].id,
      round: "semi-final",
      status: "pending",
    },
    {
      categoryId,
      participant1Id: sorted[1].id,
      participant2Id: sorted[2].id,
      round: "semi-final",
      status: "pending",
    }
  ]);

  const category = await db.query.categories.findFirst({
    where: eq(categories.id, categoryId),
  });
  if (category) {
    revalidatePath(`/admin/tournaments/${category.tournamentId}`);
  }
}

export async function generateFinals(categoryId: number) {
  // 1. Get semi-final matches
  const semiMatches = await db.query.matches.findMany({
    where: and(
      eq(matches.categoryId, categoryId),
      eq(matches.round, "semi-final"),
      eq(matches.status, "completed")
    ),
  });

  if (semiMatches.length < 2) return;

  // 2. Get winners
  const winners = semiMatches.map(m => m.winnerId).filter(Boolean);
  if (winners.length < 2) return;

  // 3. Create Final
  await db.insert(matches).values({
    categoryId,
    participant1Id: winners[0] as number,
    participant2Id: winners[1] as number,
    round: "final",
    status: "pending",
  });

  const category = await db.query.categories.findFirst({
    where: eq(categories.id, categoryId),
  });
  if (category) {
    revalidatePath(`/admin/tournaments/${category.tournamentId}`);
  }
}

