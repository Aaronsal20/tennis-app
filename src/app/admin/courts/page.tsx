import { getCourtSlots } from "@/app/actions/booking";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CourtScheduleForm } from "@/components/admin/CourtScheduleForm";
import { db } from "@/db";
import { tournaments } from "@/db/schema";
import { desc } from "drizzle-orm";
import { CourtSlotsList } from "@/components/admin/CourtSlotsList";
import { AdminDateFilter } from "@/components/admin/AdminDateFilter";
import { AutoRefresh } from "@/components/AutoRefresh";

export default async function AdminCourtsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    redirect("/");
  }

  const { date } = await searchParams;
  const slots = await getCourtSlots(date ? new Date(date) : undefined);
  const serializedSlots = slots.map(s => ({
    ...s,
    startTime: s.startTime.toISOString(),
    endTime: s.endTime.toISOString(),
  }));
  
  let tournamentList: any[] = [];
  if (process.env.DATABASE_URL) {
    tournamentList = await db.select().from(tournaments).orderBy(desc(tournaments.startDate));
  }

  return (
    <div className="container mx-auto py-10 space-y-8">
      <AutoRefresh />
      <h1 className="text-3xl font-bold">Manage Court Slots</h1>
      
      <CourtScheduleForm tournaments={tournamentList} />

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">Existing Slots</h2>
          <AdminDateFilter />
        </div>
        <CourtSlotsList slots={serializedSlots} />
      </div>
    </div>
  );
}
