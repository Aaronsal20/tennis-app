import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getSession, logout } from "@/lib/auth";
import { ModeToggle } from "@/components/mode-toggle";
import { MobileNav } from "@/components/mobile-nav";

export async function Header() {
  const user = await getSession();

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm border-b dark:border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-gray-900 dark:text-white">
          Tennis App
        </Link>
        
        <div className="flex items-center gap-2">
          <ModeToggle />
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-sm text-gray-600 dark:text-gray-300">Welcome, {user.name}</span>
                <Link href="/book">
                  <Button variant="ghost">Book Court</Button>
                </Link>
                {user.role === "admin" && (
                  <>
                    <Link href="/admin">
                      <Button variant="ghost">Admin</Button>
                    </Link>
                    <Link href="/admin/courts">
                      <Button variant="ghost">Manage Courts</Button>
                    </Link>
                  </>
                )}
                <form action={async () => {
                  "use server";
                  await logout();
                }}>
                  <Button variant="outline" type="submit">Logout</Button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="outline">Login</Button>
                </Link>
                <Link href="/register">
                  <Button>Register</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Navigation */}
          <MobileNav user={user} />
        </div>
      </div>
    </header>
  );
}
