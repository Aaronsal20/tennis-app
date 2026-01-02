"use client";

import { Badge } from "@/components/ui/badge";

export default function PublicMatchList({ matches }: { matches: any[] }) {
  if (matches.length === 0) {
    return <p className="text-muted-foreground text-sm italic">No matches scheduled yet.</p>;
  }

  const formatSet = (p1: number | null, p2: number | null, tb1?: number | null, tb2?: number | null) => {
    if (p1 === null || p2 === null) return null;
    
    if (tb1 !== null && tb2 !== null && tb1 !== undefined && tb2 !== undefined) {
       return (
         <span className="whitespace-nowrap">
           {p1}-{p2}<span className="text-[10px] text-muted-foreground ml-[1px]">({tb1}-{tb2})</span>
         </span>
       );
    }
    return <span className="whitespace-nowrap">{p1}-{p2}</span>;
  };

  return (
    <div className="grid gap-4">
      {matches.map((match) => {
        const isFinal = match.round === 'final';
        const isSemi = match.round === 'semi-final';
        const isSpecial = isFinal || isSemi;

        return (
          <div 
            key={match.id} 
            className={`border p-3 rounded flex flex-col sm:flex-row justify-between items-center bg-card gap-2 relative mt-2 ${isFinal ? 'border-primary shadow-sm' : ''}`}
          >
            {isSpecial && (
              <Badge 
                variant={isFinal ? "default" : "secondary"} 
                className="absolute -top-2.5 left-4 text-[10px] px-2 h-5 uppercase tracking-wider"
              >
                {match.round}
              </Badge>
            )}
            <div className="flex-1 grid grid-cols-2 gap-4 w-full mt-1 sm:mt-0">
              <div className={`text-right ${match.winnerId === match.participant1Id ? "font-bold text-primary" : ""}`}>
                {match.participant1.user.name}
                {match.participant1.partner && <span className="text-muted-foreground text-sm"> / {match.participant1.partner.name}</span>}
              </div>
              <div className={`text-left ${match.winnerId === match.participant2Id ? "font-bold text-primary" : ""}`}>
                {match.participant2.user.name}
                {match.participant2.partner && <span className="text-muted-foreground text-sm"> / {match.participant2.partner.name}</span>}
              </div>
            </div>
            <div className="text-sm font-mono mx-4 whitespace-nowrap">
              {match.status === "completed" ? (
                <div className="bg-muted px-2 py-1 rounded flex gap-2">
                  {formatSet(match.set1Player1, match.set1Player2, match.set1TiebreakPlayer1, match.set1TiebreakPlayer2)}
                  {formatSet(match.set2Player1, match.set2Player2, match.set2TiebreakPlayer1, match.set2TiebreakPlayer2)}
                  {formatSet(match.set3Player1, match.set3Player2, match.set3TiebreakPlayer1, match.set3TiebreakPlayer2)}
                </div>
              ) : (
                <span className="text-muted-foreground text-xs uppercase tracking-wider">vs</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
