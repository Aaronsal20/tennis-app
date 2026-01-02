import { db } from "@/db";
import { tournaments, categories, participants, users, courtSlots } from "@/db/schema";
import { eq, and, gte, lt, or } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import JoinCategoryForm from "@/components/tournament/JoinCategoryForm";
import StandingsTable from "@/components/tournament/StandingsTable";
import PublicMatchList from "@/components/tournament/PublicMatchList";

import WinnersDisplay from "@/components/tournament/WinnersDisplay";
import { TimeDisplay } from "@/components/TimeDisplay";

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournamentId = parseInt(id);
  const user = await getSession();
  
  if (!process.env.DATABASE_URL) {
      return <div className="container mx-auto py-10">Database not configured. Please set DATABASE_URL.</div>;
  }

  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, tournamentId),
  });

  if (!tournament) {
      return <div className="container mx-auto py-10">Tournament not found.</div>;
  }

  // Fetch categories with matches and participants
  const tournamentCategories = await db.query.categories.findMany({
    where: eq(categories.tournamentId, tournamentId),
    with: {
      participants: {
        with: {
          user: true,
          partner: true
        }
      },
      matches: {
        with: {
          participant1: { with: { user: true, partner: true } },
          participant2: { with: { user: true, partner: true } },
        }
      }
    }
  });

  const allUsers = await db.select().from(users);
  const potentialPartners = user ? allUsers.filter(u => u.id !== user.id) : [];
  
  // Fetch user's current participations in this tournament
  let userParticipations: number[] = [];
  if (user) {
    const parts = await db.select().from(participants).where(
      or(
        eq(participants.userId, user.id),
        eq(participants.partnerId, user.id)
      )
    );
    userParticipations = parts.map(p => p.categoryId).filter((id): id is number => id !== null);
  }

  // Fetch upcoming fixtures (booked slots) for today and tomorrow
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const dayAfterTomorrow = new Date(tomorrow);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

  const upcomingFixtures = await db.query.courtSlots.findMany({
    where: and(
      eq(courtSlots.tournamentId, tournamentId),
      eq(courtSlots.isBooked, true),
      gte(courtSlots.startTime, today),
      lt(courtSlots.startTime, dayAfterTomorrow)
    ),
    with: {
      bookedByUser: true,
      opponent: true,
      category: true,
    },
    orderBy: (courtSlots, { asc }) => [asc(courtSlots.startTime)],
  });

  const todayFixtures = upcomingFixtures.filter(f => f.startTime < tomorrow);
  const tomorrowFixtures = upcomingFixtures.filter(f => f.startTime >= tomorrow);

  const getDisplayName = (userId: number | undefined | null, categoryId: number | undefined | null) => {
    if (!userId || !categoryId) return "TBD";
    const category = tournamentCategories.find(c => c.id === categoryId);
    if (!category) return "Unknown";

    const participant = category.participants.find(p => p.userId === userId || p.partnerId === userId);
    if (!participant) return "Unknown";

    if (category.type === 'doubles' && participant.partner && participant.user) {
      return `${participant.user.name} / ${participant.partner.name}`;
    }
    
    return participant.user?.name || "Unknown";
  };

  const isCompleted = tournament.status === 'completed';

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">{tournament.name}</h1>
            <p className="text-lg text-gray-600 mt-2">{tournament.description}</p>
            <div className="mt-4 flex gap-4 text-sm text-gray-500">
                <span>📍 {tournament.location}</span>
                <span>📅 {new Date(tournament.startDate).toLocaleDateString()} - {new Date(tournament.endDate).toLocaleDateString()}</span>
            </div>
          </div>
          {isCompleted && (
            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full font-bold text-sm">
              Tournament Completed
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue={isCompleted ? "winners" : "overview"} className="w-full">
        <TabsList className="flex flex-col sm:grid w-full sm:grid-cols-3 h-auto gap-2 sm:gap-0 bg-muted/50 p-1">
          {isCompleted ? (
            <>
              <TabsTrigger value="winners" className="w-full">Winners</TabsTrigger>
              <TabsTrigger value="standings" className="w-full">Final Table</TabsTrigger>
              <TabsTrigger value="scores" className="w-full">Scores</TabsTrigger>
            </>
          ) : (
            <>
              <TabsTrigger value="overview" className="w-full">Overview & Registration</TabsTrigger>
              <TabsTrigger value="fixtures" className="w-full">Fixtures & Results</TabsTrigger>
              <TabsTrigger value="standings" className="w-full">Standings</TabsTrigger>
            </>
          )}
        </TabsList>

        {isCompleted ? (
          <>
            <TabsContent value="winners" className="mt-6">
              <WinnersDisplay categories={tournamentCategories} />
            </TabsContent>
            <TabsContent value="standings" className="mt-6 space-y-8">
              {tournamentCategories.map((cat) => (
                <Card key={cat.id}>
                  <CardHeader>
                    <CardTitle>{cat.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <StandingsTable participants={cat.participants} matches={cat.matches} />
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
            <TabsContent value="scores" className="mt-6 space-y-8">
              {tournamentCategories.map((cat) => (
                <Card key={cat.id}>
                  <CardHeader>
                    <CardTitle>{cat.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PublicMatchList matches={cat.matches} />
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </>
        ) : (
          <>
            <TabsContent value="overview" className="mt-6 space-y-8">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Today's Schedule</CardTitle>
                    <CardDescription>{today.toLocaleDateString()}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {todayFixtures.length > 0 ? (
                      <ul className="space-y-4">
                        {todayFixtures.map((fixture) => (
                          <li key={fixture.id} className="border-b pb-2 last:border-0 last:pb-0">
                            <div className="font-semibold text-sm">
                              <TimeDisplay date={fixture.startTime} format="time" /> - {fixture.courtName}
                            </div>
                            <div className="text-sm mt-1">
                              <span className="text-primary">{getDisplayName(fixture.bookedBy, fixture.categoryId)}</span> vs <span className="text-primary">{getDisplayName(fixture.opponentId, fixture.categoryId)}</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {fixture.category?.name}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No matches scheduled for today.</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Tomorrow's Schedule</CardTitle>
                    <CardDescription>{tomorrow.toLocaleDateString()}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {tomorrowFixtures.length > 0 ? (
                      <ul className="space-y-4">
                        {tomorrowFixtures.map((fixture) => (
                          <li key={fixture.id} className="border-b pb-2 last:border-0 last:pb-0">
                            <div className="font-semibold text-sm">
                              <TimeDisplay date={fixture.startTime} format="time" /> - {fixture.courtName}
                            </div>
                            <div className="text-sm mt-1">
                              <span className="text-primary">{getDisplayName(fixture.bookedBy, fixture.categoryId)}</span> vs <span className="text-primary">{getDisplayName(fixture.opponentId, fixture.categoryId)}</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {fixture.category?.name}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No matches scheduled for tomorrow.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div>
                <h2 className="text-2xl font-bold mb-4">Available Categories</h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {tournamentCategories.map((cat) => {
                        const isJoined = userParticipations.includes(cat.id);
                        return (
                        <Card key={cat.id} className={isJoined ? "border-green-500 bg-green-50" : ""}>
                            <CardHeader>
                                <CardTitle className="flex justify-between items-center">
                                    {cat.name}
                                    {isJoined && <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">Joined</span>}
                                </CardTitle>
                                <CardDescription className="uppercase text-xs font-bold">{cat.type}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-gray-500">
                                    {isJoined ? "You are registered for this category." : "Open for registration"}
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  {cat.participants.length} participants
                                </p>
                            </CardContent>
                            <CardFooter>
                                {user ? (
                                    isJoined ? (
                                        <Button disabled className="w-full bg-green-600 hover:bg-green-700">Registered</Button>
                                    ) : (
                                        <JoinCategoryForm 
                                          category={cat} 
                                          userId={user.id} 
                                          potentialPartners={potentialPartners} 
                                        />
                                    )
                                ) : (
                                    <Link href="/login" className="w-full">
                                        <Button variant="outline" className="w-full">Login to Join</Button>
                                    </Link>
                                )}
                            </CardFooter>
                        </Card>
                    )})}
                    {tournamentCategories.length === 0 && (
                        <p className="text-gray-500">No categories available for this tournament yet.</p>
                    )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="fixtures" className="mt-6 space-y-8">
              {tournamentCategories.map((cat) => (
                <Card key={cat.id}>
                  <CardHeader>
                    <CardTitle>{cat.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PublicMatchList matches={cat.matches} />
                  </CardContent>
                </Card>
              ))}
              {tournamentCategories.length === 0 && <p className="text-muted-foreground">No fixtures available.</p>}
            </TabsContent>

            <TabsContent value="standings" className="mt-6 space-y-8">
              {tournamentCategories.map((cat) => (
                <Card key={cat.id}>
                  <CardHeader>
                    <CardTitle>{cat.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <StandingsTable participants={cat.participants} matches={cat.matches} />
                  </CardContent>
                </Card>
              ))}
              {tournamentCategories.length === 0 && <p className="text-muted-foreground">No standings available.</p>}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
