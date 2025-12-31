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

  // Check if already booked
  const slot = await db.query.courtSlots.findFirst({
    where: eq(courtSlots.id, slotId),
  });

  if (!slot) throw new Error("Slot not found");
  if (slot.isBooked) throw new Error("Slot already booked");

  await db.update(courtSlots).set({
    isBooked: true,
    bookedBy: session.id,
    categoryId,
    opponentId,
  }).where(eq(courtSlots.id, slotId));

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
  startDate: Date,
  endDate: Date,
  schedules: { days: number[], times: string[] }[],
  durationMinutes: number,
  tournamentId?: number
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    throw new Error("Unauthorized");
  }

  const slotsToInsert: any[] = [];
  let currentDate = new Date(startDate);
  const end = new Date(endDate);

  // Normalize dates to start of day to avoid time issues
  currentDate.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  while (currentDate <= end) {
    const dayOfWeek = currentDate.getDay();
    
    // Find a schedule that matches this day
    const schedule = schedules.find(s => s.days.includes(dayOfWeek));
    
    if (schedule) {
      for (const time of schedule.times) {
        const [hours, minutes] = time.split(':').map(Number);
        
        const slotStart = new Date(currentDate);
        slotStart.setHours(hours, minutes, 0, 0);
        
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + durationMinutes);

        slotsToInsert.push({
          courtName,
          startTime: slotStart,
          endTime: slotEnd,
          tournamentId,
        });
      }
    }
    // Next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  if (slotsToInsert.length > 0) {
    await db.insert(courtSlots).values(slotsToInsert);
  }
  
  revalidatePath("/book");
  revalidatePath("/admin/courts");
}
