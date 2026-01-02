"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoreHorizontal, Shield, ShieldAlert, UserCog } from "lucide-react";
import { toggleUserStatus, resetUserPassword, updateUserRole } from "@/app/actions/users";
import { Badge } from "@/components/ui/badge"; // I might need to create Badge if it doesn't exist, checking next.

export default function UserManagement({ users }: { users: any[] }) {
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");

  const handleStatusToggle = async (user: any) => {
    await toggleUserStatus(user.id, !user.isActive);
  };

  const handleRoleToggle = async (user: any) => {
    const newRole = user.role === "admin" ? "user" : "admin";
    await updateUserRole(user.id, newRole);
  };

  const openPasswordDialog = (user: any) => {
    setSelectedUser(user);
    setNewPassword("");
    setPasswordDialogOpen(true);
  };

  const handlePasswordReset = async () => {
    if (!selectedUser || !newPassword) return;
    await resetUserPassword(selectedUser.id, newPassword);
    setPasswordDialogOpen(false);
    setSelectedUser(null);
    setNewPassword("");
  };

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email || user.phone}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {user.role}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.isActive ? 'Active' : 'Disabled'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.email || user.phone || "")}>
                        Copy Contact
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleStatusToggle(user)}>
                        {user.isActive ? (
                          <span className="text-red-600 flex items-center w-full">
                            <ShieldAlert className="mr-2 h-4 w-4" /> Disable Account
                          </span>
                        ) : (
                          <span className="text-green-600 flex items-center w-full">
                            <Shield className="mr-2 h-4 w-4" /> Enable Account
                          </span>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openPasswordDialog(user)}>
                        <UserCog className="mr-2 h-4 w-4" /> Reset Password
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleRoleToggle(user)}>
                        {user.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter a new password for {selectedUser?.name} ({selectedUser?.email}).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-password" className="text-right">
                Password
              </Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>Cancel</Button>
            <Button onClick={handlePasswordReset}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
