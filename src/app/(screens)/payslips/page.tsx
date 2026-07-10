"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { PayslipsPanel } from "@/components/captain/PayslipsPanel";

export default function PayslipsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="p-4 max-w-lg mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/profile")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Payslips</h1>
            <p className="text-sm text-muted-foreground">
              View and download your monthly payslips
            </p>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto">
        <PayslipsPanel />
      </main>
    </div>
  );
}
