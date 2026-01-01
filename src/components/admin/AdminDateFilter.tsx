"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

export function AdminDateFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [date, setDate] = useState(searchParams.get("date") || "");

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    const params = new URLSearchParams(searchParams);
    if (newDate) {
      params.set("date", newDate);
    } else {
      params.delete("date");
    }
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        type="date"
        value={date}
        onChange={(e) => handleDateChange(e.target.value)}
        className="w-auto"
      />
      {date && (
        <Button variant="ghost" size="icon" onClick={() => handleDateChange("")}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
