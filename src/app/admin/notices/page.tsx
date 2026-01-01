import { getAllNotices } from "@/app/actions/notices";
import NoticeManager from "@/components/admin/NoticeManager";

export default async function NoticesPage() {
  const notices = await getAllNotices();

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Manage Notices</h1>
      <NoticeManager initialNotices={notices} />
    </div>
  );
}
