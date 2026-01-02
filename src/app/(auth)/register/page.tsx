import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { db } from "@/db";
import { users } from "@/db/schema";
import { login, hashPassword } from "@/lib/auth";
import { redirect } from "next/navigation";
import { eq, or } from "drizzle-orm";
import { createNotification } from "@/app/actions/notifications";

export default function RegisterPage() {
  async function handleRegister(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const password = formData.get("password") as string;

    if ((!email && !phone) || !password) {
      // TODO: Handle error - at least one contact method required
      return;
    }

    const hashedPassword = await hashPassword(password);

    // Check if user already exists (by email or phone)
    const conditions = [];
    if (email) conditions.push(eq(users.email, email));
    if (phone) conditions.push(eq(users.phone, phone));

    let existingUser = undefined;
    if (conditions.length > 0) {
      existingUser = await db.query.users.findFirst({
        where: or(...conditions),
      });
    }

    // If not found by email/phone, check by name to link guest accounts
    if (!existingUser && name) {
      existingUser = await db.query.users.findFirst({
        where: eq(users.name, name),
      });
    }

    if (existingUser) {
      // Update existing user with new details (e.g. claiming a guest account)
      await db.update(users).set({
        name,
        email: email || existingUser.email,
        phone: phone || existingUser.phone,
        password: hashedPassword,
      }).where(eq(users.id, existingUser.id));

      await login(existingUser.id);
      redirect("/");
    } else {
      // Create new user
      const [newUser] = await db.insert(users).values({
        name,
        email: email || null,
        phone: phone || null,
        password: hashedPassword,
      }).returning();

      if (newUser) {
        await createNotification("registration", `New user registered: ${name || email || phone}`, { userId: newUser.id });
        await login(newUser.id);
        redirect("/");
      }
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Register</CardTitle>
          <CardDescription className="text-center">
            Create a new account to join tournaments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleRegister}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" placeholder="John Doe" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (Optional)</Label>
                <Input id="email" name="email" type="email" placeholder="m@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (Optional)</Label>
                <Input id="phone" name="phone" type="tel" placeholder="+1234567890" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" required />
              </div>
              <p className="text-xs text-muted-foreground">
                Please provide either an email or a phone number.
              </p>
              <Button type="submit" className="w-full">
                Register
              </Button>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-600 hover:underline">
              Login
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
