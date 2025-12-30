"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { bookCourtSlot, getTournamentCategories, getCategoryParticipants } from "@/app/actions/booking";

interface BookingFormProps {
  slotId: number;
  tournamentId: number | null;
  currentUserId: number;
}

export function BookingForm({ slotId, tournamentId, currentUserId }: BookingFormProps) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedOpponent, setSelectedOpponent] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleOpen = async (open: boolean) => {
    setOpen(open);
    if (open && tournamentId) {
      setLoading(true);
      try {
        const cats = await getTournamentCategories(tournamentId);
        setCategories(cats);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCategoryChange = async (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedOpponent(""); // Reset opponent when category changes
    setLoading(true);
    try {
      const parts = await getCategoryParticipants(parseInt(categoryId));
      // Filter out current user
      setParticipants(parts.filter(p => p.id !== currentUserId));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async () => {
    setLoading(true);
    try {
      await bookCourtSlot(
        slotId, 
        selectedCategory ? parseInt(selectedCategory) : undefined, 
        selectedOpponent ? parseInt(selectedOpponent) : undefined
      );
      setOpen(false);
    } catch (e) {
      console.error(e);
      alert("Failed to book slot");
    } finally {
      setLoading(false);
    }
  };

  if (!tournamentId) {
    return (
      <form action={async () => {
        await bookCourtSlot(slotId);
      }}>
        <Button className="mt-4">Book Now</Button>
      </form>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button className="mt-4">Book Now</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Book Court Slot</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={selectedCategory} onValueChange={handleCategoryChange} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCategory && (
            <div className="space-y-2">
              <Label>Opponent</Label>
              <Select value={selectedOpponent} onValueChange={setSelectedOpponent} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Opponent" />
                </SelectTrigger>
                <SelectContent>
                  {participants.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleBook} disabled={loading || !selectedCategory || !selectedOpponent}>
            {loading ? "Booking..." : "Confirm Booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
