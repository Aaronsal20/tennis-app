"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { generateFixtures, updateMatchScore, createMatch, generateSemiFinals, generateFinals } from "@/app/actions/tournament";

export default function MatchManager({ category, matches }: { category: any, matches: any[] }) {
  const [editingMatch, setEditingMatch] = useState<any>(null);
  const [scores, setScores] = useState<any>({});
  const [addMatchOpen, setAddMatchOpen] = useState(false);
  const [selectedP1, setSelectedP1] = useState<string>("");
  const [selectedP2, setSelectedP2] = useState<string>("");

  const handleGenerate = async () => {
    await generateFixtures(category.id);
  };

  const handleGenerateSemiFinals = async () => {
    await generateSemiFinals(category.id);
  };

  const handleGenerateFinals = async () => {
    await generateFinals(category.id);
  };

  const handleAddMatch = async () => {
    if (!selectedP1 || !selectedP2 || selectedP1 === selectedP2) return;
    await createMatch(category.id, parseInt(selectedP1), parseInt(selectedP2));
    setAddMatchOpen(false);
    setSelectedP1("");
    setSelectedP2("");
  };

  const handleScoreChange = (field: string, value: string) => {
    const val = value === "" ? undefined : parseInt(value);
    setScores((prev: any) => ({ ...prev, [field]: val }));
  };

  const formatSet = (p1: number | null, p2: number | null, tb1?: number | null, tb2?: number | null) => {
    if (p1 === null || p2 === null || p1 === undefined || p2 === undefined) return null;
    
    if (tb1 !== null && tb2 !== null && tb1 !== undefined && tb2 !== undefined) {
       return (
         <span className="whitespace-nowrap">
           {p1}-{p2}<span className="text-[10px] text-muted-foreground ml-[1px]">({tb1}-{tb2})</span>
         </span>
       );
    }
    return <span className="whitespace-nowrap">{p1}-{p2}</span>;
  };

  const saveScore = async () => {
    if (!editingMatch) return;
    await updateMatchScore(editingMatch.id, scores);
    setEditingMatch(null);
    setScores({});
  };

  const openScoreDialog = (match: any) => {
    setEditingMatch(match);
    setScores({
      set1Player1: match.set1Player1,
      set1Player2: match.set1Player2,
      set1TiebreakPlayer1: match.set1TiebreakPlayer1,
      set1TiebreakPlayer2: match.set1TiebreakPlayer2,
      set2Player1: match.set2Player1,
      set2Player2: match.set2Player2,
      set2TiebreakPlayer1: match.set2TiebreakPlayer1,
      set2TiebreakPlayer2: match.set2TiebreakPlayer2,
      set3Player1: match.set3Player1,
      set3Player2: match.set3Player2,
      set3TiebreakPlayer1: match.set3TiebreakPlayer1,
      set3TiebreakPlayer2: match.set3TiebreakPlayer2,
    });
  };

  const groupedMatches = matches.reduce((acc, match) => {
    const round = match.round || "group";
    if (!acc[round]) acc[round] = [];
    acc[round].push(match);
    return acc;
  }, {} as Record<string, any[]>);

  const roundOrder = ["group", "semi-final", "final"];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-medium">{category.name}</h3>
        <div className="flex gap-2">
          <Dialog open={addMatchOpen} onOpenChange={setAddMatchOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">Add Match</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Match</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Player 1</Label>
                  <Select value={selectedP1} onValueChange={setSelectedP1}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Player 1" />
                    </SelectTrigger>
                    <SelectContent>
                      {category.participants.map((p: any) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.user?.name || "Unknown"} {p.partner ? `/ ${p.partner.name}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Player 2</Label>
                  <Select value={selectedP2} onValueChange={setSelectedP2}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Player 2" />
                    </SelectTrigger>
                    <SelectContent>
                      {category.participants.map((p: any) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.user?.name || "Unknown"} {p.partner ? `/ ${p.partner.name}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddMatch} className="w-full">Create Match</Button>
              </div>
            </DialogContent>
          </Dialog>
          {matches.length === 0 && (
            <Button onClick={handleGenerate} size="sm">Generate Fixtures</Button>
          )}
          {matches.length > 0 && matches.some(m => m.status === 'completed') && !matches.some(m => m.round === 'semi-final') && (
             <Button onClick={handleGenerateSemiFinals} size="sm" variant="secondary">Generate Semi-Finals</Button>
          )}
          {matches.some(m => m.round === 'semi-final' && m.status === 'completed') && !matches.some(m => m.round === 'final') && (
             <Button onClick={handleGenerateFinals} size="sm" variant="secondary">Generate Final</Button>
          )}
        </div>
      </div>

      {matches.length > 0 ? (
        <div className="space-y-6">
          {roundOrder.map((round) => {
            const roundMatches = groupedMatches[round];
            if (!roundMatches || roundMatches.length === 0) return null;
            
            return (
              <div key={round} className="space-y-2">
                <h4 className="text-sm font-semibold capitalize text-muted-foreground">{round.replace("-", " ")} Matches</h4>
                <div className="grid gap-2">
                  {roundMatches.map((match) => (
                    <div key={match.id} className="border p-3 rounded flex justify-between items-center bg-card">
                      <div className="flex-1 grid grid-cols-2 gap-4">
                        <div className={match.winnerId === match.participant1Id ? "font-bold text-primary" : ""}>
                          {match.participant1.user.name}
                          {match.participant1.partner && <span className="text-muted-foreground text-sm"> / {match.participant1.partner.name}</span>}
                        </div>
                        <div className={match.winnerId === match.participant2Id ? "font-bold text-primary" : ""}>
                          {match.participant2.user.name}
                          {match.participant2.partner && <span className="text-muted-foreground text-sm"> / {match.participant2.partner.name}</span>}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground mx-4">
                        {match.status === "completed" ? (
                          <div className="flex gap-2">
                            {formatSet(match.set1Player1, match.set1Player2, match.set1TiebreakPlayer1, match.set1TiebreakPlayer2)}
                            {formatSet(match.set2Player1, match.set2Player2, match.set2TiebreakPlayer1, match.set2TiebreakPlayer2)}
                            {formatSet(match.set3Player1, match.set3Player2, match.set3TiebreakPlayer1, match.set3TiebreakPlayer2)}
                          </div>
                        ) : "Pending"}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => openScoreDialog(match)}>
                        Score
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No matches scheduled.</p>
      )}

      <Dialog open={!!editingMatch} onOpenChange={(open) => !open && setEditingMatch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Score</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-3 gap-2 text-center font-medium text-sm">
              <div>Set</div>
              <div className="truncate">
                {editingMatch?.participant1.user.name}
                {editingMatch?.participant1.partner && <div className="text-xs text-muted-foreground">{editingMatch.participant1.partner.name}</div>}
              </div>
              <div className="truncate">
                {editingMatch?.participant2.user.name}
                {editingMatch?.participant2.partner && <div className="text-xs text-muted-foreground">{editingMatch.participant2.partner.name}</div>}
              </div>
            </div>
            
            {/* Set 1 */}
            <div className="grid grid-cols-3 gap-2 items-center">
              <div className="text-sm font-medium">Set 1</div>
              <div className="flex gap-1">
                <Input type="number" placeholder="G" value={scores.set1Player1 ?? ""} onChange={(e) => handleScoreChange("set1Player1", e.target.value)} />
                <Input type="number" placeholder="TB" className="w-12 text-xs" value={scores.set1TiebreakPlayer1 ?? ""} onChange={(e) => handleScoreChange("set1TiebreakPlayer1", e.target.value)} />
              </div>
              <div className="flex gap-1">
                <Input type="number" placeholder="G" value={scores.set1Player2 ?? ""} onChange={(e) => handleScoreChange("set1Player2", e.target.value)} />
                <Input type="number" placeholder="TB" className="w-12 text-xs" value={scores.set1TiebreakPlayer2 ?? ""} onChange={(e) => handleScoreChange("set1TiebreakPlayer2", e.target.value)} />
              </div>
            </div>

            {/* Set 2 */}
            <div className="grid grid-cols-3 gap-2 items-center">
              <div className="text-sm font-medium">Set 2</div>
              <div className="flex gap-1">
                <Input type="number" placeholder="G" value={scores.set2Player1 ?? ""} onChange={(e) => handleScoreChange("set2Player1", e.target.value)} />
                <Input type="number" placeholder="TB" className="w-12 text-xs" value={scores.set2TiebreakPlayer1 ?? ""} onChange={(e) => handleScoreChange("set2TiebreakPlayer1", e.target.value)} />
              </div>
              <div className="flex gap-1">
                <Input type="number" placeholder="G" value={scores.set2Player2 ?? ""} onChange={(e) => handleScoreChange("set2Player2", e.target.value)} />
                <Input type="number" placeholder="TB" className="w-12 text-xs" value={scores.set2TiebreakPlayer2 ?? ""} onChange={(e) => handleScoreChange("set2TiebreakPlayer2", e.target.value)} />
              </div>
            </div>

            {/* Set 3 */}
            <div className="grid grid-cols-3 gap-2 items-center">
              <div className="text-sm font-medium">Set 3</div>
              <div className="flex gap-1">
                <Input type="number" placeholder="G" value={scores.set3Player1 ?? ""} onChange={(e) => handleScoreChange("set3Player1", e.target.value)} />
                <Input type="number" placeholder="TB" className="w-12 text-xs" value={scores.set3TiebreakPlayer1 ?? ""} onChange={(e) => handleScoreChange("set3TiebreakPlayer1", e.target.value)} />
              </div>
              <div className="flex gap-1">
                <Input type="number" placeholder="G" value={scores.set3Player2 ?? ""} onChange={(e) => handleScoreChange("set3Player2", e.target.value)} />
                <Input type="number" placeholder="TB" className="w-12 text-xs" value={scores.set3TiebreakPlayer2 ?? ""} onChange={(e) => handleScoreChange("set3TiebreakPlayer2", e.target.value)} />
              </div>
            </div>
            
            <Button onClick={saveScore} className="w-full mt-4">Save Score</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
