"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { hashPassword } from "@/lib/auth";

export async function toggleUserStatus(userId: number, isActive: boolean) {
  await db.update(users).set({ isActive }).where(eq(users.id, userId));
  revalidatePath("/admin/users");
}

export async function resetUserPassword(userId: number, newPassword: string) {
  const hashedPassword = await hashPassword(newPassword);
  await db.update(users).set({ password: hashedPassword }).where(eq(users.id, userId));
  revalidatePath("/admin/users");
}

export async function updateUserRole(userId: number, role: "admin" | "user") {
  await db.update(users).set({ role }).where(eq(users.id, userId));
  revalidatePath("/admin/users");
}
