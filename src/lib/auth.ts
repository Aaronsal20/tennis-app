import { cookies } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getSession() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("userId")?.value;
  
  if (!userId) return null;

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, parseInt(userId)),
    });
    return user || null;
  } catch (error) {
    return null;
  }
}

export async function login(userId: number) {
  const cookieStore = await cookies();
  // In a real app, use a secure, signed token. This is just for demo.
  cookieStore.set("userId", userId.toString(), { httpOnly: true, path: "/" });
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("userId");
}
