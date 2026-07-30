import { PageHeader } from "@/components/shared";

export default function ProfilePage() {
  return (
    <div>
      <PageHeader title="Profile" description="Your profile settings" />
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <p className="text-muted-foreground">Profile page will be displayed here.</p>
      </div>
    </div>
  );
}
