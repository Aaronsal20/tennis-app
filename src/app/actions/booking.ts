"use server";

import { db } from "@/db";
import { courtSlots, categories, participants, users } from "@/db/schema";
import { eq, gte, and, lte, ne, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { createNotification } from "./notifications";

export async function getCourtSlots(date?: Date) {
  try {
    if (!process.env.DATABASE_URL) return [];
    
    let whereClause;

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      whereClause = and(
        gte(courtSlots.startTime, startOfDay),
        lte(courtSlots.startTime, endOfDay)
      );
    } else {
      whereClause = gte(courtSlots.startTime, new Date());
    }

    return await db.query.courtSlots.findMany({
      where: whereClause,
      orderBy: (courtSlots, { asc }) => [asc(courtSlots.startTime)],
      with: {
        bookedByUser: true,
      }
    });
  } catch (e) {
    console.error(e);
    return [];
  }
}

export async function createCourtSlot(courtName: string, startTime: Date, endTime: Date) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    throw new Error("Unauthorized");
  }

  await db.insert(courtSlots).values({
    courtName,
    startTime,
    endTime,
  });
  revalidatePath("/book");
  revalidatePath("/admin/courts");
}

export async function toggleCourtSlotStatus(id: number, isActive: boolean) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    throw new Error("Unauthorized");
  }

  await db.update(courtSlots).set({ isActive }).where(eq(courtSlots.id, id));
  revalidatePath("/book");
  revalidatePath("/admin/courts");
}

export async function deleteCourtSlot(id: number) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    throw new Error("Unauthorized");
  }

  await db.delete(courtSlots).where(eq(courtSlots.id, id));
  revalidatePath("/book");
  revalidatePath("/admin/courts");
}

export async function bookCourtSlot(slotId: number, categoryId?: number, opponentId?: number) {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }

  // Attempt to book the slot atomically
  // We check for isBooked = false AND isActive = true to prevent race conditions
  const updated = await db.update(courtSlots)
    .set({
      isBooked: true,
      bookedBy: session.id,
      categoryId,
      opponentId,
    })
    .where(and(
      eq(courtSlots.id, slotId), 
      eq(courtSlots.isBooked, false),
      eq(courtSlots.isActive, true)
    ))
    .returning({ id: courtSlots.id, courtName: courtSlots.courtName });

  if (updated.length === 0) {
    // Check why it failed to give a better error message
    const slot = await db.query.courtSlots.findFirst({
      where: eq(courtSlots.id, slotId),
    });

    if (!slot) throw new Error("Slot not found");
    if (!slot.isActive) throw new Error("Slot is currently disabled");
    if (slot.isBooked) throw new Error("Slot already booked");
    throw new Error("Failed to book slot");
  }

  const slot = updated[0];
  await createNotification("booking", `New court booking by ${session.name} for ${slot.courtName}`, { slotId, userId: session.id });

  revalidatePath("/book");
  revalidatePath("/admin/courts");
}

export async function getTournamentCategories(tournamentId: number) {
  const session = await getSession();
  if (!session) return [];

  // Get all categories for this tournament
  const tournamentCats = await db.query.categories.findMany({
    where: eq(categories.tournamentId, tournamentId),
  });

  // Get user's participations (as player or partner)
  const userParticipations = await db.query.participants.findMany({
    where: or(
      eq(participants.userId, session.id),
      eq(participants.partnerId, session.id)
    ),
  });

  const participatedCategoryIds = new Set(userParticipations.map(p => p.categoryId));

  return tournamentCats.filter(c => participatedCategoryIds.has(c.id));
}

export async function getCategoryParticipants(categoryId: number) {
  const category = await db.query.categories.findFirst({
    where: eq(categories.id, categoryId),
  });

  if (!category) return [];

  const parts = await db.query.participants.findMany({
    where: eq(participants.categoryId, categoryId),
    with: {
      user: true,
      partner: true,
    }
  });

  return parts.map(p => {
    if (category.type === 'doubles' && p.partner) {
      return {
        id: p.user?.id,
        name: `${p.user?.name} / ${p.partner.name}`,
      };
    } else {
      return {
        id: p.user?.id,
        name: p.user?.name,
      };
    }
  }).filter(u => u.id != null);
}

export async function cancelBooking(slotId: number) {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const slot = await db.query.courtSlots.findFirst({
    where: eq(courtSlots.id, slotId),
  });

  if (!slot) throw new Error("Slot not found");
  
  // Allow if admin or if user owns the booking
  if (session.role !== "admin" && slot.bookedBy !== session.id) {
    throw new Error("Unauthorized");
  }

  await db.update(courtSlots).set({
    isBooked: false,
    bookedBy: null,
  }).where(eq(courtSlots.id, slotId));

  revalidatePath("/book");
  revalidatePath("/admin/courts");
}

export async function createCourtSchedule(
  courtName: string,
  startDateStr: string,
  endDateStr: string,
  schedules: { days: number[], times: string[] }[],
  durationMinutes: number,
  timezoneOffset: number,
  tournamentId?: number
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    throw new Error("Unauthorized");
  }

  const slotsToInsert: any[] = [];
  
  // Parse dates as UTC to avoid server timezone issues
  // Treat these as "Local Date 00:00" represented in UTC
  let currentDate = new Date(startDateStr + "T00:00:00Z");
  const end = new Date(endDateStr + "T00:00:00Z");

  while (currentDate <= end) {
    const dayOfWeek = currentDate.getUTCDay(); // Use UTC day since we forced UTC
    
    // Find a schedule that matches this day
    const schedule = schedules.find(s => s.days.includes(dayOfWeek));
    
    if (schedule) {
      for (const time of schedule.times) {
        const [hours, minutes] = time.split(':').map(Number);
        
        // Create "Local Time" in UTC container
        const slotStartLocal = new Date(currentDate);
        slotStartLocal.setUTCHours(hours, minutes, 0, 0);
        
        // Apply timezone offset to get real UTC
        // timezoneOffset is (UTC - Local) in minutes.
        // So UTC = Local + offset.
        const slotStartUTC = new Date(slotStartLocal.getTime() + timezoneOffset * 60000);
        
        const slotEndUTC = new Date(slotStartUTC.getTime() + durationMinutes * 60000);

        slotsToInsert.push({
          courtName,
          startTime: slotStartUTC,
          endTime: slotEndUTC,
          tournamentId,
        });
      }
    }
    // Next day
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  if (slotsToInsert.length > 0) {
    await db.insert(courtSlots).values(slotsToInsert);
  }
  
  revalidatePath("/book");
  revalidatePath("/admin/courts");
}
