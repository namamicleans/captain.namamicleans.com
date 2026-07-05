import { LeaveManagementPanel } from "@/components/captain/LeaveManagementPanel";

export default function LeavesPage() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="p-4 max-w-lg mx-auto">
        <LeaveManagementPanel />
      </main>
    </div>
  );
}
