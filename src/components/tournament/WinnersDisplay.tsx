"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { useEffect } from "react";
import confetti from "canvas-confetti";

export default function WinnersDisplay({ categories }: { categories: any[] }) {
  useEffect(() => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      // since particles fall down, start a bit higher than random
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {categories.map((category) => {
        const { matches } = category;
        
        // Find Final Match
        const finalMatch = matches.find((m: any) => m.round === 'final' && m.status === 'completed');

        if (!finalMatch) {
           return (
            <Card key={category.id} className="overflow-hidden border-2 border-dashed border-gray-200">
              <CardHeader className="bg-gray-50/50 pb-4">
                <CardTitle className="flex items-center gap-2 text-lg text-gray-500">
                  <Trophy className="h-5 w-5" />
                  {category.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  Final match result not recorded.
                </div>
              </CardContent>
            </Card>
           );
        }

        const winnerId = finalMatch.winnerId;
        const winner = winnerId === finalMatch.participant1Id ? finalMatch.participant1 : finalMatch.participant2;
        const runnerUp = winnerId === finalMatch.participant1Id ? finalMatch.participant2 : finalMatch.participant1;

        if (!winner) return null;

        return (
          <Card key={category.id} className="overflow-hidden border-2 border-yellow-100">
            <CardHeader className="bg-yellow-50/50 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Trophy className="h-5 w-5 text-yellow-600" />
                {category.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">Winner</div>
                <div className="text-xl font-bold text-primary">
                  {winner.user.name}
                  {winner.partner && ` & ${winner.partner.name}`}
                </div>
              </div>
              
              {runnerUp && (
                <div className="text-center pt-4 border-t">
                  <div className="text-xs text-muted-foreground mb-1">Runner Up</div>
                  <div className="font-medium">
                    {runnerUp.user.name}
                    {runnerUp.partner && ` & ${runnerUp.partner.name}`}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
