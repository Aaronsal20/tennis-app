"use client";

import { useState } from "react";
import { createNotice, deleteNotice, toggleNoticeStatus } from "@/app/actions/notices";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Trash2, CheckCircle, XCircle } from "lucide-react";

type Notice = {
  id: number;
  content: string;
  isActive: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export default function NoticeManager({ initialNotices }: { initialNotices: Notice[] }) {
  const [notices, setNotices] = useState<Notice[]>(initialNotices);
  const [newNoticeContent, setNewNoticeContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoticeContent.trim()) return;

    setIsSubmitting(true);
    const result = await createNotice(newNoticeContent);
    setIsSubmitting(false);

    if (result.success) {
      toast.success("Notice created");
      setNewNoticeContent("");
      window.location.reload(); 
    } else {
      toast.error(result.error);
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: boolean) => {
    const result = await toggleNoticeStatus(id, !currentStatus);
    if (result.success) {
      toast.success(`Notice is now ${!currentStatus ? "active" : "inactive"}.`);
      window.location.reload();
    } else {
      toast.error(result.error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this notice?")) return;

    const result = await deleteNotice(id);
    if (result.success) {
      toast.success("Notice deleted");
      window.location.reload();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Create New Notice</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateNotice} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="content">Notice Content</Label>
              <Textarea
                id="content"
                placeholder="Enter the notice message here..."
                value={newNoticeContent}
                onChange={(e) => setNewNoticeContent(e.target.value)}
                rows={3}
              />
            </div>
            <Button type="submit" disabled={isSubmitting || !newNoticeContent.trim()}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Post Notice"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Existing Notices</h2>
        {notices.length === 0 ? (
          <p className="text-muted-foreground">No notices found.</p>
        ) : (
          notices.map((notice) => (
            <Card key={notice.id} className={notice.isActive ? "border-primary" : ""}>
              <CardContent className="pt-6 flex justify-between items-start gap-4">
                <div className="space-y-1 flex-1">
                  <p className="text-lg">{notice.content}</p>
                  <p className="text-xs text-muted-foreground">
                    Posted on {notice.createdAt ? new Date(notice.createdAt).toLocaleDateString() : "Unknown date"}
                  </p>
                  {notice.isActive && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleStatus(notice.id, notice.isActive)}
                  >
                    {notice.isActive ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDelete(notice.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
