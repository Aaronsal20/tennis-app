"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { registerPlayer } from "@/app/actions/tournament";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function JoinCategoryForm({ category, userId, potentialPartners }: { category: any, userId: number, potentialPartners: any[] }) {
  const [partnerId, setPartnerId] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    setLoading(true);
    try {
      await registerPlayer(userId, [{
        categoryId: category.id,
        partnerId: partnerId ? parseInt(partnerId) : null
      }]);
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to join", error);
    } finally {
      setLoading(false);
    }
  };

  if (category.type === "doubles") {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="w-full">Join Category</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join {category.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Partner</Label>
              <Select value={partnerId} onValueChange={setPartnerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Partner" />
                </SelectTrigger>
                <SelectContent>
                  {potentialPartners.map(u => (
                    <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">A partner is required for doubles events.</p>
            </div>
            <Button onClick={handleJoin} disabled={!partnerId || loading} className="w-full">
              {loading ? "Joining..." : "Confirm Registration"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Button onClick={handleJoin} disabled={loading} className="w-full">
      {loading ? "Joining..." : "Join Category"}
    </Button>
  );
}
