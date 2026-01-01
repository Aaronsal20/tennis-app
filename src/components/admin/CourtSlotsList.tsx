"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteCourtSlot, toggleCourtSlotStatus } from "@/app/actions/booking";
import { TimeDisplay } from "@/components/TimeDisplay";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Slot = {
  id: number;
  courtName: string;
  startTime: string | Date;
  endTime: string | Date;
  isBooked: boolean | null;
  isActive: boolean;
  bookedByUser: { name: string | null } | null;
};

function SlotGroup({ slots, onToggle }: { slots: Slot[], onToggle: (slot: Slot) => void }) {
  const [groupedSlots, setGroupedSlots] = useState<Record<string, Slot[]>>({});

  useEffect(() => {
    const grouped = slots.reduce((acc, slot) => {
      const dateKey = new Date(slot.startTime).toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(slot);
      return acc;
    }, {} as Record<string, Slot[]>);
    setGroupedSlots(grouped);
  }, [slots]);

  const sortedDates = Object.keys(groupedSlots).sort((a, b) => {
    return new Date(a).getTime() - new Date(b).getTime();
  });

  if (slots.length === 0) {
      return <p className="text-muted-foreground">No slots found.</p>;
  }

  return (
    <div className="space-y-6">
      {sortedDates.map(date => (
        <Card key={date}>
          <CardHeader>
            <CardTitle>{date}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {groupedSlots[date].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()).map(slot => (
                <div key={slot.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                  <div>
                    <div className="font-medium">
                      <TimeDisplay date={slot.startTime} format="time" /> - <TimeDisplay date={slot.endTime} format="time" />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {slot.courtName} • {slot.isBooked ? <span className="text-red-500">Booked by {slot.bookedByUser?.name}</span> : (slot.isActive ? <span className="text-green-600">Available</span> : <span className="text-gray-500">Disabled</span>)}
                    </div>
                  </div>
                  <Button 
                    variant={slot.isActive ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => onToggle(slot)}
                  >
                    {slot.isActive ? "Disable" : "Enable"}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function CourtSlotsList({ slots }: { slots: Slot[] }) {
  const [mounted, setMounted] = useState(false);
  const [slotToToggle, setSlotToToggle] = useState<Slot | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const courtNames = useMemo(() => Array.from(new Set(slots.map(s => s.courtName))).sort(), [slots]);

  if (!mounted) {
    return <div className="text-muted-foreground">Loading slots...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="all">All Courts</TabsTrigger>
            {courtNames.map(name => (
                <TabsTrigger key={name} value={name}>{name}</TabsTrigger>
            ))}
        </TabsList>
        
        <TabsContent value="all">
            <SlotGroup slots={slots} onToggle={setSlotToToggle} />
        </TabsContent>

        {courtNames.map(name => (
            <TabsContent key={name} value={name}>
                <SlotGroup slots={slots.filter(s => s.courtName === name)} onToggle={setSlotToToggle} />
            </TabsContent>
        ))}
      </Tabs>

      <Dialog open={slotToToggle !== null} onOpenChange={(open) => !open && setSlotToToggle(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{slotToToggle?.isActive ? "Disable Slot" : "Enable Slot"}</DialogTitle>
            <DialogDescription>
              {slotToToggle?.isActive 
                ? "Are you sure you want to disable this slot? Users will not be able to book it." 
                : "Are you sure you want to enable this slot? Users will be able to book it."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSlotToToggle(null)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button 
              variant={slotToToggle?.isActive ? "destructive" : "default"}
              disabled={isProcessing}
              onClick={async () => {
                if (slotToToggle) {
                  setIsProcessing(true);
                  try {
                    await toggleCourtSlotStatus(slotToToggle.id, !slotToToggle.isActive);
                    toast.success(`Slot ${slotToToggle.isActive ? "disabled" : "enabled"} successfully`);
                    setSlotToToggle(null);
                  } catch (error) {
                    toast.error(`Failed to ${slotToToggle.isActive ? "disable" : "enable"} slot`);
                  } finally {
                    setIsProcessing(false);
                  }
                }
              }}
            >
              {isProcessing ? "Processing..." : (slotToToggle?.isActive ? "Disable" : "Enable")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
