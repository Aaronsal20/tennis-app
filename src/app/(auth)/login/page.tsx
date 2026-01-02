import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { login, verifyPassword } from "@/lib/auth";
import { redirect } from "next/navigation";

export default function LoginPage() {
  async function handleLogin(formData: FormData) {
    "use server";
    const identifier = formData.get("identifier") as string;
    const password = formData.get("password") as string;
    
    if (!identifier || !password) return;

    const user = await db.query.users.findFirst({
      where: or(
        eq(users.email, identifier),
        eq(users.phone, identifier)
      ),
    });

    if (user && user.password) {
      if (!user.isActive) {
        // Account disabled
        return; 
      }
      const isValid = await verifyPassword(password, user.password);
      if (isValid) {
        await login(user.id);
        redirect("/");
      }
    }
    
    // If login fails, we could redirect with an error or just stay on page
    // For now, let's redirect to register if user not found, or just do nothing if password wrong
    if (!user) {
        redirect("/register");
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Login</CardTitle>
          <CardDescription className="text-center">
            Enter your email or phone and password to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleLogin}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier">Email or Phone</Label>
                <Input id="identifier" name="identifier" type="text" placeholder="Email or Phone Number" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" required />
              </div>
              <Button type="submit" className="w-full">
                Login
              </Button>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{" "}
            <Link href="/register" className="text-blue-600 hover:underline">
              Register
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
