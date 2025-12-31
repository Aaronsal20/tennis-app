import { cookies } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

const secretKey = process.env.JWT_SECRET || "secret-key-change-me";
const key = new TextEncoder().encode(secretKey);

export async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return await bcrypt.compare(password, hash);
}

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1 week")
    .sign(key);
}

export async function decrypt(input: string): Promise<any> {
  const { payload } = await jwtVerify(input, key, {
    algorithms: ["HS256"],
  });
  return payload;
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) return null;
  
  try {
    const payload = await decrypt(session);
    if (!payload || !payload.userId) return null;
    
    const user = await db.query.users.findFirst({
      where: eq(users.id, parseInt(payload.userId)),
    });
    return user || null;
  } catch (error) {
    return null;
  }
}

export async function login(userId: number) {
  const cookieStore = await cookies();
  // Create a session token
  const session = await encrypt({ userId: userId.toString() });
  
  // Set the cookie
  cookieStore.set("session", session, { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7 // 1 week
  });
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}
