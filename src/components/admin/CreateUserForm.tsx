"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createUser } from "@/app/actions/tournament";
import { useRouter } from "next/navigation";

export default function CreateUserForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setLoading(true);
    try {
      await createUser({ name, email, phone });
      setName("");
      setEmail("");
      setPhone("");
      router.refresh();
    } catch (error) {
      console.error("Failed to create user", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input 
          id="name"
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          placeholder="John Doe" 
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email (Optional)</Label>
        <Input 
          id="email"
          type="email"
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          placeholder="john@example.com" 
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone (Optional)</Label>
        <Input 
          id="phone"
          type="tel"
          value={phone} 
          onChange={(e) => setPhone(e.target.value)} 
          placeholder="+1234567890" 
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Creating..." : "Create User"}
      </Button>
    </form>
  );
}
