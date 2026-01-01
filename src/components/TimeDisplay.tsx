"use client";

import { useEffect, useState } from "react";

export function TimeDisplay({ date, format = "time" }: { date: Date | string, format?: "time" | "date" | "datetime" }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; 
  }

  const d = new Date(date);

  if (format === "time") {
    return <>{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>;
  } else if (format === "date") {
    return <>{d.toLocaleDateString()}</>;
  } else {
    return <>{d.toLocaleString()}</>;
  }
}
