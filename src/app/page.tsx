import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { tournaments } from "@/db/schema";
import { desc } from "drizzle-orm";
import { Trophy, Calendar, MapPin } from "lucide-react";

async function getTournaments() {
  try {
    if (!process.env.DATABASE_URL) {
      return [];
    }
    return await db.select().from(tournaments).orderBy(desc(tournaments.startDate));
  } catch (error) {
    console.error("Failed to fetch tournaments:", error);
    return [];
  }
}

export default async function Home() {
  const allTournaments = await getTournaments();

  const now = new Date();
  const upcoming = allTournaments.filter(t => new Date(t.startDate) > now);
  const ongoing = allTournaments.filter(t => new Date(t.startDate) <= now && new Date(t.endDate) >= now);
  const past = allTournaments.filter(t => new Date(t.endDate) < now);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-primary text-primary-foreground py-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
           {/* Giant Tennis Ball Decoration */}
           <svg width="400" height="400" viewBox="0 0 100 100" fill="currentColor">
             <circle cx="50" cy="50" r="45" />
             <path d="M 50 5 A 45 45 0 0 1 50 95" fill="none" stroke="white" strokeWidth="2" />
             <path d="M 20 20 Q 50 50 80 20" fill="none" stroke="white" strokeWidth="2" />
             <path d="M 20 80 Q 50 50 80 80" fill="none" stroke="white" strokeWidth="2" />
           </svg>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="space-y-6 max-w-2xl">
              <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">
                Ace Your Game
              </h1>
              <p className="text-xl text-primary-foreground/90">
                Join the ultimate tennis community. Register for tournaments, track your match scores, and climb the rankings.
              </p>
            </div>
            <div className="hidden md:block mt-8 md:mt-0">
               {/* Tennis Racquet Icon */}
               <svg width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-secondary">
                 <path d="M6 16l6-6" />
                 <path d="M13 15l6-6" />
                 <path d="M12 4a6 6 0 0 0-6 6c0 2.5 1.5 4.5 3.5 5.5L6 21h12l-3.5-5.5C16.5 14.5 18 12.5 18 10a6 6 0 0 0-6-6z" />
                 <path d="M12 4v6" />
                 <path d="M8 8h8" />
               </svg>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        
        {/* Ongoing Section */}
        {ongoing.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-6">
              <div className="h-8 w-2 bg-secondary rounded-full"></div>
              <h2 className="text-3xl font-bold text-primary">Live Now</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {ongoing.map((t) => (
                <TournamentCard key={t.id} tournament={t} status="ongoing" />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Section */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <div className="h-8 w-2 bg-primary rounded-full"></div>
            <h2 className="text-3xl font-bold text-primary">Upcoming Events</h2>
          </div>
          {upcoming.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((t) => (
                <TournamentCard key={t.id} tournament={t} status="upcoming" />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground">No upcoming tournaments scheduled.</p>
            </div>
          )}
        </section>

        {/* Past Section */}
        {past.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-6">
              <div className="h-8 w-2 bg-muted-foreground rounded-full"></div>
              <h2 className="text-3xl font-bold text-muted-foreground">Past Events</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 opacity-75 grayscale hover:grayscale-0 transition-all duration-300">
              {past.map((t) => (
                <TournamentCard key={t.id} tournament={t} status="past" />
              ))}
            </div>
          </section>
        )}

      </main>
    </div>
  );
}

function TournamentCard({ tournament, status }: { tournament: any, status: 'ongoing' | 'upcoming' | 'past' }) {
  return (
    <Link href={`/tournaments/${tournament.id}`}>
      <Card className="hover:shadow-xl transition-all duration-300 h-full cursor-pointer group border-t-4 border-t-transparent hover:border-t-secondary">
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-xl group-hover:text-primary transition-colors">{tournament.name}</CardTitle>
            {status === 'ongoing' && (
              <span className="bg-secondary text-secondary-foreground text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                LIVE
              </span>
            )}
          </div>
          <CardDescription className="flex items-center gap-1">
            <MapPin className="w-4 h-4" /> {tournament.location}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-6 line-clamp-2 text-sm">{tournament.description}</p>
          <div className="flex items-center gap-2 text-sm font-medium text-primary bg-muted/50 p-3 rounded-md">
            <Calendar className="w-4 h-4" />
            <span>
              {new Date(tournament.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} 
              {' - '}
              {new Date(tournament.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

