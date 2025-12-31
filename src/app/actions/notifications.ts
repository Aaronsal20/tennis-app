"use server";

import { db } from "@/db";
import { notifications } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getNotifications() {
  return await db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(20);
}

export async function getUnreadCount() {
  const result = await db.select().from(notifications).where(eq(notifications.isRead, false));
  return result.length;
}

export async function markAsRead(id: number) {
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  revalidatePath("/admin");
}

export async function markAllAsRead() {
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.isRead, false));
  revalidatePath("/admin");
}

export async function createNotification(type: string, message: string, data?: any) {
  await db.insert(notifications).values({
    type,
    message,
    data: data ? JSON.stringify(data) : null,
  });
  revalidatePath("/admin");
}
