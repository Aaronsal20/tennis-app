import { getCourtSlots, cancelBooking } from "@/app/actions/booking";
import { DateFilter } from "@/components/booking/DateFilter";
import { BookingForm } from "@/components/booking/BookingForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function BookingPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { date } = await searchParams;
  const slots = await getCourtSlots(date ? new Date(date) : undefined);
  const myBookings = slots.filter(s => s.bookedBy === session.id);
  const otherSlots = slots.filter(s => s.bookedBy !== session.id);

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold">Book a Court</h1>
        <DateFilter />
      </div>

      {myBookings.length > 0 && (
        <section>
          <h2 className="text-2xl font-semibold mb-4">My Bookings</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {myBookings.map(slot => (
              <Card key={slot.id} className="border-primary">
                <CardHeader>
                  <CardTitle>{slot.courtName}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{slot.startTime.toLocaleString()} - {slot.endTime.toLocaleTimeString()}</p>
                  <form action={async () => {
                    "use server";
                    await cancelBooking(slot.id);
                  }}>
                    <Button variant="destructive" className="mt-4">Cancel Booking</Button>
                  </form>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-2xl font-semibold mb-4">All Slots</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {otherSlots.map(slot => (
            <Card key={slot.id} className={slot.isBooked ? "bg-muted/50" : ""}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  {slot.courtName}
                  {slot.isBooked && <span className="text-sm font-normal text-muted-foreground">(Booked)</span>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>{slot.startTime.toLocaleString()} - {slot.endTime.toLocaleTimeString()}</p>
                {slot.isBooked ? (
                  <Button disabled className="mt-4 w-full" variant="secondary">Booked</Button>
                ) : (
                  <BookingForm 
                    slotId={slot.id} 
                    tournamentId={slot.tournamentId} 
                    currentUserId={session.id} 
                  />
                )}
              </CardContent>
            </Card>
          ))}
          {otherSlots.length === 0 && (
            <p className="text-muted-foreground">No slots available.</p>
          )}
        </div>
      </section>
    </div>
  );
}
