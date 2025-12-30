"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function DateFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [date, setDate] = useState(searchParams.get("date") || new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (date) {
      params.set("date", date);
    } else {
      params.delete("date");
    }
    router.push(`?${params.toString()}`);
  }, [date, router, searchParams]);

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 bg-card p-4 rounded-lg border shadow-sm w-full md:w-auto">
      <Label htmlFor="date-filter" className="whitespace-nowrap font-medium">Select Date:</Label>
      <Input
        id="date-filter"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="w-full sm:w-auto"
      />
    </div>
  );
}
