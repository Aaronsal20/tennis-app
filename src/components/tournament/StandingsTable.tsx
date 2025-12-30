"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function StandingsTable({ participants, matches }: { participants: any[], matches: any[] }) {
  const getSetWinner = (p1: number | null, p2: number | null, tb1?: number | null, tb2?: number | null) => {
    if (p1 === null || p2 === null || p1 === undefined || p2 === undefined) return 0;
    if (p1 > p2) return 1;
    if (p2 > p1) return 2;
    if (tb1 !== null && tb2 !== null && tb1 !== undefined && tb2 !== undefined) {
      if (tb1 > tb2) return 1;
      if (tb2 > tb1) return 2;
    }
    return 0;
  };

  // Calculate standings
  const stats = participants.map(p => {
    const pMatches = matches.filter(m => 
      (m.participant1Id === p.id || m.participant2Id === p.id) && m.status === "completed"
    );
    const wins = pMatches.filter(m => m.winnerId === p.id).length;
    const losses = pMatches.length - wins;
    
    let points = 0;
    pMatches.forEach(m => {
        const isP1 = m.participant1Id === p.id;
        const targetWinner = isP1 ? 1 : 2;

        if (getSetWinner(m.set1Player1, m.set1Player2, m.set1TiebreakPlayer1, m.set1TiebreakPlayer2) === targetWinner) points++;
        if (getSetWinner(m.set2Player1, m.set2Player2, m.set2TiebreakPlayer1, m.set2TiebreakPlayer2) === targetWinner) points++;
        if (getSetWinner(m.set3Player1, m.set3Player2, m.set3TiebreakPlayer1, m.set3TiebreakPlayer2) === targetWinner) points++;
    });
    
    return {
      ...p,
      played: pMatches.length,
      wins,
      losses,
      points
    };
  });

  // Sort by points, then wins
  stats.sort((a, b) => b.points - a.points || b.wins - a.wins);

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Player/Team</TableHead>
            <TableHead className="text-center w-12">P</TableHead>
            <TableHead className="text-center w-12">W</TableHead>
            <TableHead className="text-center w-12">L</TableHead>
            <TableHead className="text-center w-12">Pts</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stats.map((stat) => (
            <TableRow key={stat.id}>
              <TableCell className="font-medium">
                {stat.user.name}
                {stat.partner && <span className="text-muted-foreground"> / {stat.partner.name}</span>}
              </TableCell>
              <TableCell className="text-center">{stat.played}</TableCell>
              <TableCell className="text-center">{stat.wins}</TableCell>
              <TableCell className="text-center">{stat.losses}</TableCell>
              <TableCell className="text-center font-bold">{stat.points}</TableCell>
            </TableRow>
          ))}
          {stats.length === 0 && (
              <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground h-24">No participants yet.</TableCell>
              </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
