"use server";

import { logout as authLogout } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function logoutAction() {
  await authLogout();
  redirect("/");
}
