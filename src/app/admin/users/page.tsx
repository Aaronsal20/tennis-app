import { db } from "@/db";
import { users } from "@/db/schema";
import { desc } from "drizzle-orm";
import UserManagement from "@/components/admin/UserManagement";

export default async function AdminUsersPage() {
  const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">User Management</h1>
      <UserManagement users={allUsers} />
    </div>
  );
}
