"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";

interface MobileNavProps {
  user: any;
}

export function MobileNav({ user }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}>
        {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {open && (
        <div className="absolute top-16 left-0 right-0 bg-background border-b shadow-lg p-4 z-50 flex flex-col space-y-4">
          {user ? (
            <>
              <div className="text-sm font-medium text-muted-foreground px-2">
                Welcome, {user.name}
              </div>
              <Link href="/book" onClick={() => setOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">Book Court</Button>
              </Link>
              {user.role === "admin" && (
                <>
                  <Link href="/admin" onClick={() => setOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">Admin Dashboard</Button>
                  </Link>
                  <Link href="/admin/courts" onClick={() => setOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">Manage Courts</Button>
                  </Link>
                </>
              )}
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={async () => {
                  await logoutAction();
                  setOpen(false);
                }}
              >
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setOpen(false)}>
                <Button variant="outline" className="w-full">Login</Button>
              </Link>
              <Link href="/register" onClick={() => setOpen(false)}>
                <Button className="w-full">Register</Button>
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
