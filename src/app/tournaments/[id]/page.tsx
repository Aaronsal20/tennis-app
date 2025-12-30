import { db } from "@/db";
import { tournaments, categories, participants, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import JoinCategoryForm from "@/components/tournament/JoinCategoryForm";
import StandingsTable from "@/components/tournament/StandingsTable";
import PublicMatchList from "@/components/tournament/PublicMatchList";

export default async function TournamentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
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
    const parts = await db.select().from(participants).where(eq(participants.userId, user.id));
    userParticipations = parts.map(p => p.categoryId);
  }

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h1 className="text-4xl font-bold text-gray-900">{tournament.name}</h1>
        <p className="text-lg text-gray-600 mt-2">{tournament.description}</p>
        <div className="mt-4 flex gap-4 text-sm text-gray-500">
            <span>📍 {tournament.location}</span>
            <span>📅 {new Date(tournament.startDate).toLocaleDateString()} - {new Date(tournament.endDate).toLocaleDateString()}</span>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview & Registration</TabsTrigger>
          <TabsTrigger value="fixtures">Fixtures & Results</TabsTrigger>
          <TabsTrigger value="standings">Standings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
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
      </Tabs>
    </div>
  );
}
