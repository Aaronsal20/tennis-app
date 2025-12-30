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

  const category = await db.query.categories.findFirst({
    where: eq(categories.id, match.categoryId),
  });
  if (category) {
    revalidatePath(`/admin/tournaments/${category.tournamentId}`);
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

export async function createGuestAndRegister(
  guestDetails: { name: string; email?: string; phone?: string },
  registrations: { categoryId: number; partnerId?: number | null; newPartnerName?: string }[]
) {
  if (!guestDetails.name || registrations.length === 0) return;

  // Generate dummy email if not provided
  const userEmail = guestDetails.email || `guest_${Date.now()}@tennis.app`;

  const [newUser] = await db.insert(users).values({
    name: guestDetails.name,
    email: userEmail,
    phone: guestDetails.phone,
    role: "user",
  }).returning();

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

