"use client";

import { useMemo, useState } from "react";
import { FileClock, Loader2, Send, Undo2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { useCaptain } from "@/context/CaptainContext";
import type { CaptainLeaveRequest } from "@/types/captain";
import { formatDateIST } from "@/shared/utils/datetime";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

type LeaveFormState = {
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  leave_units: string;
  reason: string;
  manager_note: string;
};

const EMPTY_FORM: LeaveFormState = {
  start_date: "",
  end_date: "",
  start_time: "",
  end_time: "",
  leave_units: "",
  reason: "",
  manager_note: "",
};

function toDateInputString(date: Date): string {
  return date.toISOString().split("T")[0];
}

function parseErrorMessage(rawError: string | null): string | null {
  if (!rawError) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawError) as Record<string, unknown>;
    const firstValue = Object.values(parsed)[0];
    if (Array.isArray(firstValue) && firstValue.length > 0) {
      return String(firstValue[0]);
    }
    if (typeof firstValue === "string") {
      return firstValue;
    }
    return rawError;
  } catch {
    return rawError;
  }
}

function leaveStatusClass(status: string): string {
  switch (status) {
    case "approved":
      return "bg-primary/10 text-primary border-primary/20";
    case "submitted":
      return "bg-accent text-accent-foreground border-accent/50";
    case "rejected":
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "withdrawn":
    case "cancelled":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-secondary text-secondary-foreground border-secondary/50";
  }
}

export function LeaveManagementPanel() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const {
    fetchLeaveBalance,
    fetchLeaves,
    createLeaveDraft,
    getLeaveDetail,
    submitLeave,
    withdrawLeave,
  } = useCaptain();

  const today = useMemo(() => new Date(), []);

  const [form, setForm] = useState<LeaveFormState>(() => ({
    ...EMPTY_FORM,
    start_date: toDateInputString(today),
    end_date: toDateInputString(today),
  }));
  const [selectedLeaveId, setSelectedLeaveId] = useState<number | null>(null);

  const leaveBalanceQuery = useQuery({
    queryKey: ["captain-leave-balance"],
    queryFn: fetchLeaveBalance,
  });

  const leavesQuery = useQuery({
    queryKey: ["captain-leaves"],
    queryFn: fetchLeaves,
  });

  const leaveDetailQuery = useQuery({
    queryKey: ["captain-leave-detail", selectedLeaveId],
    queryFn: () => {
      if (selectedLeaveId === null) {
        throw new Error("Leave id is required");
      }
      return getLeaveDetail(selectedLeaveId);
    },
    enabled: selectedLeaveId !== null,
  });

  const createDraftMutation = useMutation({
    mutationFn: createLeaveDraft,
    onSuccess: (result) => {
      if (!result.success) {
        const parsedMessage = parseErrorMessage(result.error);
        toast.error(parsedMessage || result.message || t("leaves.actions.createFailed"));
        return;
      }

      toast.success(result.message || t("leaves.actions.created"));
      setForm((prev) => ({
        ...EMPTY_FORM,
        start_date: prev.start_date,
        end_date: prev.start_date,
      }));
      queryClient.invalidateQueries({ queryKey: ["captain-leaves"] });
      queryClient.invalidateQueries({ queryKey: ["captain-leave-balance"] });
      queryClient.invalidateQueries({ queryKey: ["captain-timesheet"] });
    },
  });

  const submitLeaveMutation = useMutation({
    mutationFn: (leaveId: number) => submitLeave(leaveId),
    onSuccess: (result) => {
      if (!result.success) {
        const parsedMessage = parseErrorMessage(result.error);
        toast.error(parsedMessage || result.message || t("leaves.actions.submitFailed"));
        return;
      }
      toast.success(result.message || t("leaves.actions.submitted"));
      queryClient.invalidateQueries({ queryKey: ["captain-leaves"] });
      queryClient.invalidateQueries({ queryKey: ["captain-leave-balance"] });
      queryClient.invalidateQueries({ queryKey: ["captain-leave-detail"] });
      queryClient.invalidateQueries({ queryKey: ["captain-timesheet"] });
    },
  });

  const withdrawLeaveMutation = useMutation({
    mutationFn: (leaveId: number) => withdrawLeave(leaveId),
    onSuccess: (result) => {
      if (!result.success) {
        const parsedMessage = parseErrorMessage(result.error);
        toast.error(parsedMessage || result.message || t("leaves.actions.withdrawFailed"));
        return;
      }
      toast.success(result.message || t("leaves.actions.withdrawn"));
      queryClient.invalidateQueries({ queryKey: ["captain-leaves"] });
      queryClient.invalidateQueries({ queryKey: ["captain-leave-balance"] });
      queryClient.invalidateQueries({ queryKey: ["captain-leave-detail"] });
      queryClient.invalidateQueries({ queryKey: ["captain-timesheet"] });
    },
  });

  const leaves: CaptainLeaveRequest[] = leavesQuery.data?.data ?? [];
  const balance = leaveBalanceQuery.data?.data;
  const leaveDetail = leaveDetailQuery.data?.data;

  const isInitialLoading = leaveBalanceQuery.isPending || leavesQuery.isPending;

  const handleCreateDraft = () => {
    if (!form.start_date || !form.end_date) {
      toast.error(t("leaves.form.dateRequired"));
      return;
    }

    if (form.start_date > form.end_date) {
      toast.error("Start date must be before or equal to end date");
      return;
    }

    if (form.start_date === form.end_date && form.start_time && form.end_time && form.start_time >= form.end_time) {
      toast.error("Start time must be before end time");
      return;
    }

    if ((form.start_time && !form.end_time) || (!form.start_time && form.end_time)) {
      toast.error(t("leaves.form.timeWindowRequired"));
      return;
    }

    createDraftMutation.mutate({
      start_date: form.start_date,
      end_date: form.end_date,
      start_time: form.start_time || undefined,
      end_time: form.end_time || undefined,
      leave_units: form.leave_units || undefined,
      reason: form.reason || undefined,
      manager_note: form.manager_note || undefined,
    });
  };

  return (
    <div className="space-y-4">
      {isInitialLoading ? (
        <Card>
          <CardContent className="p-6 flex items-center justify-center gap-2 text-muted-foreground">
            <Spinner size="sm" />
            <span>{t("common.loading")}</span>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gradient-to-br from-primary to-primary/80 border-0">
          <CardContent className="p-5 text-primary-foreground">
            <p className="text-primary-foreground/80 text-sm">{t("leaves.balance.available")}</p>
            <p className="text-3xl font-bold mt-1">
              {balance?.available_units?.toFixed(2) ?? "0.00"} {t("leaves.balance.units")}
            </p>
            <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
              <div className="rounded-lg bg-background/10 p-3">
                <p className="text-primary-foreground/70">{t("leaves.balance.pending")}</p>
                <p className="font-semibold">{balance?.pending_units?.toFixed(2) ?? "0.00"}</p>
              </div>
              <div className="rounded-lg bg-background/10 p-3">
                <p className="text-primary-foreground/70">{t("leaves.balance.used")}</p>
                <p className="font-semibold">{balance?.used_units?.toFixed(2) ?? "0.00"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4 mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("leaves.form.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="leave-start-date">{t("leaves.form.startDate")}</Label>
                <Input
                  id="leave-start-date"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leave-end-date">{t("leaves.form.endDate")}</Label>
                <Input
                  id="leave-end-date"
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, end_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="leave-start-time">{t("leaves.form.startTime")}</Label>
                <Input
                  id="leave-start-time"
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setForm((prev) => ({ ...prev, start_time: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leave-end-time">{t("leaves.form.endTime")}</Label>
                <Input
                  id="leave-end-time"
                  type="time"
                  value={form.end_time}
                  onChange={(e) => setForm((prev) => ({ ...prev, end_time: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="leave-units">{t("leaves.form.leaveUnits")}</Label>
              <Input
                id="leave-units"
                type="number"
                step="0.25"
                min="0.25"
                value={form.leave_units}
                onChange={(e) => setForm((prev) => ({ ...prev, leave_units: e.target.value }))}
                placeholder={t("leaves.form.leaveUnitsPlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="leave-reason">{t("leaves.form.reason")}</Label>
              <Textarea
                id="leave-reason"
                rows={3}
                value={form.reason}
                onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder={t("leaves.form.reasonPlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="leave-manager-note">{t("leaves.form.managerNote")}</Label>
              <Input
                id="leave-manager-note"
                value={form.manager_note}
                onChange={(e) => setForm((prev) => ({ ...prev, manager_note: e.target.value }))}
                placeholder={t("leaves.form.managerNotePlaceholder")}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleCreateDraft}
              disabled={createDraftMutation.isPending}
            >
              {createDraftMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("common.processing")}
                </span>
              ) : (
                t("leaves.form.createDraft")
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("leaves.list.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {leavesQuery.isPending && (
              <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                <Spinner size="sm" />
                <span>{t("common.loading")}</span>
              </div>
            )}

            {leavesQuery.isError && (
              <div className="text-sm text-destructive py-2">{t("leaves.list.loadError")}</div>
            )}

            {!leavesQuery.isPending && !leavesQuery.isError && leaves.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <FileClock className="h-8 w-8 mx-auto mb-2" />
                <p>{t("leaves.list.empty")}</p>
              </div>
            )}

            {leaves.map((leave) => (
              <button
                type="button"
                key={leave.id}
                onClick={() => setSelectedLeaveId(leave.id)}
                className="w-full text-left border border-border rounded-xl p-3 hover:bg-accent/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">{leave.request_code}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateIST(leave.start_date)} - {formatDateIST(leave.end_date)}
                    </p>
                  </div>
                  <Badge variant="outline" className={leaveStatusClass(leave.status)}>
                    {t(`leaves.status.${leave.status}`)}
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {leave.reason || t("leaves.list.noReason")}
                </p>

                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-muted-foreground">
                    {leave.leave_units.toFixed(2)} {t("leaves.balance.units")}
                  </span>
                  <div className="flex items-center gap-2">
                    {leave.status === "draft" && (
                      <Button
                        type="button"
                        size="sm"
                        disabled={submitLeaveMutation.isPending}
                        onClick={(event) => {
                          event.stopPropagation();
                          submitLeaveMutation.mutate(leave.id);
                        }}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        {t("leaves.actions.submit")}
                      </Button>
                    )}
                    {leave.status === "submitted" && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={withdrawLeaveMutation.isPending}
                        onClick={(event) => {
                          event.stopPropagation();
                          withdrawLeaveMutation.mutate(leave.id);
                        }}
                      >
                        <Undo2 className="h-4 w-4 mr-1" />
                        {t("leaves.actions.withdraw")}
                      </Button>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {selectedLeaveId !== null && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("leaves.detail.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              {leaveDetailQuery.isPending && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Spinner size="sm" />
                  <span>{t("common.loading")}</span>
                </div>
              )}

              {!leaveDetailQuery.isPending && leaveDetail && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">{t("leaves.detail.code")}</span>
                    <span className="font-medium text-foreground">
                      {leaveDetail.request_code}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">{t("leaves.detail.window")}</span>
                    <span className="font-medium text-foreground">
                      {formatDateIST(leaveDetail.start_date)} - {formatDateIST(leaveDetail.end_date)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">{t("leaves.detail.status")}</span>
                    <Badge variant="outline" className={leaveStatusClass(leaveDetail.status)}>
                      {t(`leaves.status.${leaveDetail.status}`)}
                    </Badge>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">{t("leaves.detail.units")}</span>
                    <span className="font-medium text-foreground">
                      {leaveDetail.leave_units.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {!leaveDetailQuery.isPending && !leaveDetail && (
                <p className="text-sm text-muted-foreground">{t("leaves.detail.unavailable")}</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
