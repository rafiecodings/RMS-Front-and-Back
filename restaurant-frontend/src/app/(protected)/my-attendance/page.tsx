import { PageHeader } from "@/components/shared";
import { SelfAttendance } from "@/features/staff/components/SelfAttendance";

export default function MyAttendancePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="My Attendance" description="View your clock status and clock in or out" />
      <SelfAttendance />
    </div>
  );
}
