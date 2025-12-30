import { getCourtSlots, deleteCourtSlot } from "@/app/actions/booking";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CourtScheduleForm } from "@/components/admin/CourtScheduleForm";
import { db } from "@/db";
import { tournaments } from "@/db/schema";
import { desc } from "drizzle-orm";

export default async function AdminCourtsPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    redirect("/");
  }

  const slots = await getCourtSlots();
  
  let tournamentList = [];
  if (process.env.DATABASE_URL) {
    tournamentList = await db.select().from(tournaments).orderBy(desc(tournaments.startDate));
  }

  return (
    <div className="container mx-auto py-10 space-y-8">
      <h1 className="text-3xl font-bold">Manage Court Slots</h1>
      
      <CourtScheduleForm tournaments={tournamentList} />

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Existing Slots</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {slots.map(slot => (
            <Card key={slot.id}>
              <CardHeader>
                <CardTitle>{slot.courtName}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Date: {slot.startTime.toLocaleDateString()}</p>
                <p>Time: {slot.startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {slot.endTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                <p>Status: {slot.isBooked ? `Booked by ${slot.bookedByUser?.name}` : "Available"}</p>
                <form action={async () => {
                  "use server";
                  await deleteCourtSlot(slot.id);
                }}>
                  <Button variant="destructive" size="sm" className="mt-4">Delete</Button>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
