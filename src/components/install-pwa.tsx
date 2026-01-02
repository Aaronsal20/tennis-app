"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

export function InstallPWA() {
  const [supportsPWA, setSupportsPWA] = useState(false);
  const [promptInstall, setPromptInstall] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setSupportsPWA(true);
      setPromptInstall(e);
    };
    
    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const onClick = (evt: any) => {
    evt.preventDefault();
    if (!promptInstall) {
      return;
    }
    promptInstall.prompt();
    promptInstall.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        toast.success("Installing app...");
      }
      setPromptInstall(null);
    });
  };

  if (!supportsPWA) {
    return null;
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={onClick}
      className="flex gap-2 w-full md:w-auto justify-start md:justify-center"
      title="Install App"
    >
      <Download className="h-4 w-4" />
      <span>Install App</span>
    </Button>
  );
}
