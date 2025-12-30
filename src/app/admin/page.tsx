import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { tournaments } from "@/db/schema";
import { desc } from "drizzle-orm";

export default async function AdminDashboard() {
  let tournamentList: any[] = [];
  try {
      if (process.env.DATABASE_URL) {
        tournamentList = await db.select().from(tournaments).orderBy(desc(tournaments.startDate));
      }
  } catch (e) {
      console.error("Failed to fetch tournaments", e);
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Link href="/admin/tournaments/new">
          <Button>Create Tournament</Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tournamentList.map((t) => (
          <Card key={t.id}>
            <CardHeader>
              <CardTitle>{t.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                {new Date(t.startDate).toLocaleDateString()} - {new Date(t.endDate).toLocaleDateString()}
              </p>
              <Link href={`/admin/tournaments/${t.id}`}>
                <Button variant="outline" className="w-full">Manage</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
        {tournamentList.length === 0 && (
            <p>No tournaments found. Create one to get started.</p>
        )}
      </div>
    </div>
  );
}
