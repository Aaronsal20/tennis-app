"use client";

import { useState } from "react";
import { createCourtSchedule } from "@/app/actions/booking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

import { Plus, Trash2 } from "lucide-react";

const DAYS = [
  { id: 0, label: "Sunday" },
  { id: 1, label: "Monday" },
  { id: 2, label: "Tuesday" },
  { id: 3, label: "Wednesday" },
  { id: 4, label: "Thursday" },
  { id: 5, label: "Friday" },
  { id: 6, label: "Saturday" },
];

type ScheduleConfig = {
  id: string;
  days: number[];
  timeSlots: string;
};

export function CourtScheduleForm({ tournaments }: { tournaments: any[] }) {
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | undefined>(undefined);
  
  const [schedules, setSchedules] = useState<ScheduleConfig[]>([
    { id: "1", days: [], timeSlots: "" }
  ]);

  const addSchedule = () => {
    setSchedules(prev => [...prev, { id: Math.random().toString(), days: [], timeSlots: "" }]);
  };

  const removeSchedule = (id: string) => {
    if (schedules.length > 1) {
      setSchedules(prev => prev.filter(s => s.id !== id));
    }
  };

  const updateSchedule = (id: string, field: keyof ScheduleConfig, value: any) => {
    setSchedules(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, [field]: value };
      }
      return s;
    }));
  };

  const toggleDay = (scheduleId: string, dayId: number) => {
    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) return;

    const newDays = schedule.days.includes(dayId)
      ? schedule.days.filter(d => d !== dayId)
      : [...schedule.days, dayId];
    
    updateSchedule(scheduleId, "days", newDays);
  };

  const handleTournamentSelect = (tournamentId: string) => {
    setSelectedTournamentId(tournamentId);
    const tournament = tournaments.find(t => t.id.toString() === tournamentId);
    if (tournament) {
      const start = new Date(tournament.startDate).toISOString().split('T')[0];
      const end = new Date(tournament.endDate).toISOString().split('T')[0];
      setStartDate(start);
      setEndDate(end);
    }
  };

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    try {
      const name = formData.get("name") as string;
      const startDate = formData.get("startDate") as string;
      const endDate = formData.get("endDate") as string;
      const duration = Number(formData.get("duration"));
      const timezoneOffset = new Date().getTimezoneOffset();

      const formattedSchedules = schedules.map(s => {
        const times = s.timeSlots
          .split(/[\n,]/)
          .map(t => t.trim())
          .filter(t => t.match(/^\d{1,2}:\d{2}$/));
        return { days: s.days, times };
      }).filter(s => s.days.length > 0 && s.times.length > 0);

      if (formattedSchedules.length === 0) {
        toast.error("Please add at least one valid schedule configuration.");
        setLoading(false);
        return;
      }

      await createCourtSchedule(
        name, 
        startDate, 
        endDate, 
        formattedSchedules, 
        duration, 
        timezoneOffset,
        selectedTournamentId ? Number(selectedTournamentId) : undefined
      );
      toast.success("Schedule created successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to create schedule");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Court Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label>Court Name</Label>
            <Input name="name" placeholder="e.g. Fatorda Court 1" required />
          </div>

          <div className="space-y-2">
            <Label>Select Tournament (Optional - Auto-fills dates)</Label>
            <Select onValueChange={handleTournamentSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a tournament..." />
              </SelectTrigger>
              <SelectContent>
                {tournaments.map((t) => (
                  <SelectItem key={t.id} value={t.id.toString()}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input 
                name="startDate" 
                type="date" 
                required 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input 
                name="endDate" 
                type="date" 
                required 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Weekly Schedule</Label>
              <Button type="button" variant="outline" size="sm" onClick={addSchedule}>
                <Plus className="w-4 h-4 mr-2" /> Add Schedule Group
              </Button>
            </div>

            {schedules.map((schedule, index) => (
              <div key={schedule.id} className="p-4 border rounded-lg space-y-4 bg-muted/10">
                <div className="flex justify-between items-start">
                  <Label className="text-base">Group {index + 1}</Label>
                  {schedules.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeSchedule(schedule.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Days</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {DAYS.map(day => (
                      <div key={day.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`s${schedule.id}-day-${day.id}`} 
                          checked={schedule.days.includes(day.id)}
                          onCheckedChange={() => toggleDay(schedule.id, day.id)}
                        />
                        <label htmlFor={`s${schedule.id}-day-${day.id}`} className="text-sm font-medium leading-none cursor-pointer">
                          {day.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Time Slots (HH:MM)</Label>
                  <p className="text-xs text-muted-foreground">Enter times separated by commas or new lines (e.g. 07:00, 08:00)</p>
                  <Textarea 
                    value={schedule.timeSlots}
                    onChange={(e) => updateSchedule(schedule.id, "timeSlots", e.target.value)}
                    placeholder="07:00, 07:45, 08:30, 09:15" 
                    className="font-mono h-20"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Slot Duration (minutes)</Label>
            <Input name="duration" type="number" defaultValue="45" required />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating..." : "Generate Schedule"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
