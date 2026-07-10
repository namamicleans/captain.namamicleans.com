"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useCaptain } from "@/context/CaptainContext";
import type { CaptainPayslip } from "@/types/captain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatCurrency(amount: string): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(Number(amount));
}

async function downloadPayslip(payslip: CaptainPayslip): Promise<void> {
  const response = await fetch(`/api/payslips/${payslip.id}/download`);

  if (!response.ok) {
    const message = response.headers.get("content-type")?.includes("application/json")
      ? (await response.json()).message
      : "Failed to download payslip.";
    throw new Error(message || "Failed to download payslip.");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `payslip-${String(payslip.month).padStart(2, "0")}-${payslip.year}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function PayslipsPanel() {
  const { t } = useTranslation();
  const { fetchPayslips } = useCaptain();
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const payslipsQuery = useQuery({
    queryKey: ["captain-payslips"],
    queryFn: fetchPayslips,
  });

  const handleDownload = async (payslip: CaptainPayslip) => {
    setDownloadingId(payslip.id);
    try {
      await downloadPayslip(payslip);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to download payslip.");
    } finally {
      setDownloadingId(null);
    }
  };

  const payslips = payslipsQuery.data?.success ? payslipsQuery.data.data ?? [] : [];

  return (
    <div className="space-y-4">
      {payslipsQuery.isPending && (
        <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
          <Spinner size="sm" />
          <span>{t("common.loading")}</span>
        </div>
      )}

      {!payslipsQuery.isPending && payslipsQuery.data && !payslipsQuery.data.success && (
        <p className="text-sm text-destructive text-center py-8">
          {payslipsQuery.data.message || "Failed to load payslips."}
        </p>
      )}

      {!payslipsQuery.isPending && payslipsQuery.data?.success && payslips.length === 0 && (
        <Card className="bg-muted/50">
          <CardContent className="p-6 text-center">
            <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="font-medium text-foreground">No payslips yet</p>
            <p className="text-sm text-muted-foreground">
              Your payslips will appear here once they&apos;re marked as paid.
            </p>
          </CardContent>
        </Card>
      )}

      {payslips.map((payslip) => (
        <Card key={payslip.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-foreground">
                  {MONTH_NAMES[payslip.month - 1]} {payslip.year}
                </p>
                <p className="text-sm text-muted-foreground">
                  {payslip.payable_days} payable day{payslip.payable_days === 1 ? "" : "s"}
                </p>
              </div>
              <Badge variant="secondary" className="capitalize">
                {payslip.status}
              </Badge>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-y-1 text-sm">
              <span className="text-muted-foreground">Base Pay</span>
              <span className="text-right text-foreground">{formatCurrency(payslip.base_pay)}</span>
              <span className="text-muted-foreground">Incentive</span>
              <span className="text-right text-foreground">{formatCurrency(payslip.incentive)}</span>
              <span className="text-muted-foreground">Petrol Allowance</span>
              <span className="text-right text-foreground">{formatCurrency(payslip.petrol_allowance)}</span>
              {Number(payslip.misc_total) !== 0 && (
                <>
                  <span className="text-muted-foreground">Misc</span>
                  <span className="text-right text-foreground">{formatCurrency(payslip.misc_total)}</span>
                </>
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Gross Pay</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(payslip.gross_pay)}</p>
              </div>
              <Button
                size="sm"
                onClick={() => handleDownload(payslip)}
                disabled={downloadingId === payslip.id}
              >
                {downloadingId === payslip.id ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
