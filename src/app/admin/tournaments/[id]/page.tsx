import { db } from "@/db";
import { tournaments, categories, participants, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { revalidatePath } from "next/cache";
import MatchManager from "@/components/admin/MatchManager";
import AddParticipantForm from "@/components/admin/AddParticipantForm";
import CreateUserForm from "@/components/admin/CreateUserForm";

const CATEGORY_OPTIONS = [
  "Mens Singles",
  "Mens 40+ Singles",
  "Mens Doubles",
  "Boys Singles",
  "Doubles",
  "Mixed Doubles",
  "Ladies Singles",
  "Ladies Doubles"
];

export default async function ManageTournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournamentId = parseInt(id);
  
  if (!process.env.DATABASE_URL) return <div>Database not configured</div>;

  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, tournamentId),
  });

  if (!tournament) return <div>Tournament not found</div>;

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

  async function addCategory(formData: FormData) {
    "use server";
    const name = formData.get("category") as string;
    const format = formData.get("format") as string;
    if (!name) return;
    
    await db.insert(categories).values({
      tournamentId,
      name,
      type: name.toLowerCase().includes("doubles") ? "doubles" : "singles",
      format,
    });
    revalidatePath(`/admin/tournaments/${tournamentId}`);
  }

  async function endTournament() {
    "use server";
    await db.update(tournaments)
      .set({ status: "completed" })
      .where(eq(tournaments.id, tournamentId));
    revalidatePath(`/admin/tournaments/${tournamentId}`);
  }

  async function reopenTournament() {
    "use server";
    await db.update(tournaments)
      .set({ status: "ongoing" })
      .where(eq(tournaments.id, tournamentId));
    revalidatePath(`/admin/tournaments/${tournamentId}`);
  }

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{tournament.name}</h1>
          <p className="text-gray-500">{tournament.location} • {new Date(tournament.startDate).toLocaleDateString()}</p>
          <div className="mt-2">
            <span className={`px-2 py-1 rounded text-sm font-medium ${
              tournament.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
            }`}>
              {tournament.status === 'completed' ? 'Completed' : 'Ongoing'}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {tournament.status !== 'completed' ? (
            <form action={endTournament}>
              <Button variant="destructive" type="submit">End Tournament</Button>
            </form>
          ) : (
            <form action={reopenTournament}>
              <Button variant="outline" type="submit">Reopen Tournament</Button>
            </form>
          )}
        </div>
      </div>

      <Tabs defaultValue="setup" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="setup">Setup & Categories</TabsTrigger>
          <TabsTrigger value="participants">Participants</TabsTrigger>
          <TabsTrigger value="fixtures">Fixtures & Scores</TabsTrigger>
        </TabsList>
        
        <TabsContent value="setup">
          <Card>
            <CardHeader>
              <CardTitle>Tournament Setup</CardTitle>
              <CardDescription>Configure categories and formats.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Add Category</h3>
                <form action={addCategory} className="grid gap-4 md:grid-cols-3 items-end">
                  <div className="space-y-2">
                    <Label>Category Name</Label>
                    <Select name="category">
                      <SelectTrigger>
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Format</Label>
                    <Select name="format">
                      <SelectTrigger>
                        <SelectValue placeholder="Select Format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full-set">Full Set</SelectItem>
                        <SelectItem value="mini-set">Mini Set</SelectItem>
                        <SelectItem value="pro-set">Pro Set</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit">Add Category</Button>
                </form>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-medium">Existing Categories</h3>
                {tournamentCategories.map((cat) => (
                  <div key={cat.id} className="p-4 bg-gray-50 rounded-md border flex justify-between items-center">
                    <div>
                      <span className="font-medium">{cat.name}</span>
                      <span className="ml-2 text-xs text-gray-500 uppercase">{cat.type}</span>
                    </div>
                    <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {cat.format || "No format set"}
                    </span>
                  </div>
                ))}
                {tournamentCategories.length === 0 && <p className="text-sm text-gray-500">No categories added yet.</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="participants">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Create New User</CardTitle>
                <CardDescription>Add a new user to the system.</CardDescription>
              </CardHeader>
              <CardContent>
                <CreateUserForm />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Register User to Categories</CardTitle>
                <CardDescription>Select an existing user and add them to categories.</CardDescription>
              </CardHeader>
              <CardContent>
                <AddParticipantForm categories={tournamentCategories} users={allUsers} />
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 space-y-6">
            <h3 className="text-xl font-semibold">Registered Participants</h3>
            {tournamentCategories.map((cat) => (
              <Card key={cat.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{cat.name}</CardTitle>
                  <CardDescription>{cat.participants.length} players registered</CardDescription>
                </CardHeader>
                <CardContent>
                  {cat.participants.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {cat.participants.map((p) => (
                        <div key={p.id} className="flex items-center space-x-3 p-3 border rounded-md bg-muted/20">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                            {p.user?.name?.substring(0, 2).toUpperCase() ?? "??"}
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-sm font-medium truncate">
                              {p.user?.name ?? "Unknown User"}
                              {p.partner && <span className="text-muted-foreground"> & {p.partner.name}</span>}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No participants yet.</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="fixtures">
          <Card>
            <CardHeader>
              <CardTitle>Fixtures & Scores</CardTitle>
              <CardDescription>Generate fixtures and enter match scores.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {tournamentCategories.map((cat) => (
                <MatchManager key={cat.id} category={cat} matches={cat.matches} />
              ))}
              {tournamentCategories.length === 0 && <p className="text-sm text-gray-500">No categories found.</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
