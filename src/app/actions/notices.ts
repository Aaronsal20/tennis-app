"use server";

import { db } from "@/db";
import { notices } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createNotice(content: string) {
  try {
    // Deactivate all other notices first if we want only one active at a time?
    // Or maybe just let the admin manage it. Let's just create it as active by default.
    // But usually you want only one main notice. Let's deactivate others for now to keep it simple.
    await db.update(notices).set({ isActive: false });

    await db.insert(notices).values({
      content,
      isActive: true,
    });

    revalidatePath("/");
    revalidatePath("/admin/notices");
    return { success: true };
  } catch (error) {
    console.error("Error creating notice:", error);
    return { success: false, error: "Failed to create notice" };
  }
}

export async function toggleNoticeStatus(id: number, isActive: boolean) {
  try {
    if (isActive) {
      // If turning on, turn off others
      await db.update(notices).set({ isActive: false });
    }

    await db.update(notices).set({ isActive }).where(eq(notices.id, id));

    revalidatePath("/");
    revalidatePath("/admin/notices");
    return { success: true };
  } catch (error) {
    console.error("Error updating notice:", error);
    return { success: false, error: "Failed to update notice" };
  }
}

export async function deleteNotice(id: number) {
  try {
    await db.delete(notices).where(eq(notices.id, id));
    revalidatePath("/");
    revalidatePath("/admin/notices");
    return { success: true };
  } catch (error) {
    console.error("Error deleting notice:", error);
    return { success: false, error: "Failed to delete notice" };
  }
}

export async function getActiveNotice() {
  try {
    const activeNotice = await db.query.notices.findFirst({
      where: eq(notices.isActive, true),
      orderBy: [desc(notices.createdAt)],
    });
    return activeNotice;
  } catch (error) {
    console.error("Error fetching active notice:", error);
    return null;
  }
}

export async function getAllNotices() {
  try {
    const allNotices = await db.query.notices.findMany({
      orderBy: [desc(notices.createdAt)],
    });
    return allNotices;
  } catch (error) {
    console.error("Error fetching notices:", error);
    return [];
  }
}
