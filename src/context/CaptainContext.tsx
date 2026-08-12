"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Captain,
  CaptainCheckInRequest,
  CaptainCheckOutRequest,
  CaptainJobExecution,
  CaptainJobExecutionSaveProgressRequest,
  CaptainJobExecutionCompleteRequest,
  CaptainJobExecutionStartRequest,
  CaptainJobFilters,
  CaptainLeaveBalance,
  CaptainLeaveDraftRequest,
  CaptainLeaveRequest,
  CaptainMaterial,
  CaptainPayslip,
  CaptainShiftLog,
  CaptainTimesheet,
  CaptainTimesheetFilters,
  CaptainShiftSummary,
  Job,
} from "@/types/captain";
import type { ServerActionResponse } from "@/types/generic";
import type { UserResponse } from "@/types/auth";
import type { UploadUrlPayload } from "@/lib/directUpload";

export interface CaptainActions {
  fetchShiftSummary: (params?: {
    shiftDate?: string;
  }) => Promise<ServerActionResponse<CaptainShiftSummary>>;
  checkIn: (
    payload: CaptainCheckInRequest
  ) => Promise<ServerActionResponse<CaptainShiftLog>>;
  checkOut: (
    payload: CaptainCheckOutRequest
  ) => Promise<ServerActionResponse<CaptainShiftLog>>;
  getCheckInUploadUrl: (
    purpose: "selfie" | "start_odometer_image",
    contentType: string
  ) => Promise<ServerActionResponse<UploadUrlPayload>>;
  getCheckOutUploadUrl: (
    contentType: string
  ) => Promise<ServerActionResponse<UploadUrlPayload>>;
  getExecutionUploadUrl: (
    bookingId: string,
    purpose: "before" | "after",
    contentType: string
  ) => Promise<ServerActionResponse<UploadUrlPayload>>;
  fetchJobs: (
    params?: CaptainJobFilters
  ) => Promise<ServerActionResponse<Job[]>>;
  startJobExecution: (
    jobId: string,
    payload?: CaptainJobExecutionStartRequest
  ) => Promise<ServerActionResponse<CaptainJobExecution>>;
  completeJobExecution: (
    jobId: string,
    payload: CaptainJobExecutionCompleteRequest
  ) => Promise<ServerActionResponse<CaptainJobExecution>>;
  getJobExecution: (
    jobId: string
  ) => Promise<ServerActionResponse<CaptainJobExecution>>;
  saveJobExecutionProgress: (
    jobId: string,
    payload: CaptainJobExecutionSaveProgressRequest
  ) => Promise<ServerActionResponse<CaptainJobExecution>>;
  fetchLeaveBalance: () => Promise<ServerActionResponse<CaptainLeaveBalance>>;
  fetchLeaves: () => Promise<ServerActionResponse<CaptainLeaveRequest[]>>;
  createLeaveDraft: (
    payload: CaptainLeaveDraftRequest
  ) => Promise<ServerActionResponse<CaptainLeaveRequest>>;
  getLeaveDetail: (
    leaveId: number
  ) => Promise<ServerActionResponse<CaptainLeaveRequest>>;
  submitLeave: (
    leaveId: number
  ) => Promise<ServerActionResponse<CaptainLeaveRequest>>;
  withdrawLeave: (
    leaveId: number
  ) => Promise<ServerActionResponse<CaptainLeaveRequest>>;
  fetchTimesheet: (
    params?: CaptainTimesheetFilters
  ) => Promise<ServerActionResponse<CaptainTimesheet>>;
  fetchPayslips: () => Promise<ServerActionResponse<CaptainPayslip[]>>;
}

interface CaptainContextType {
  captain: Captain;
  todayAttendance: CaptainShiftLog | null;
  materials: CaptainMaterial[];
  isCheckedIn: boolean;
  isCurrentlyCheckedIn: boolean;
  isCheckedOut: boolean;
  isShiftLoading: boolean;
  isCheckInInFlight: boolean;
  isCheckOutInFlight: boolean;
  jobs: Job[];
  activeJob: Job | null;
  fetchJobs: (
    params?: CaptainJobFilters
  ) => Promise<ServerActionResponse<Job[]>>;
  checkIn: (
    payload: CaptainCheckInRequest
  ) => Promise<ServerActionResponse<CaptainShiftLog>>;
  checkOut: (
    payload: CaptainCheckOutRequest
  ) => Promise<ServerActionResponse<CaptainShiftLog>>;
  getCheckInUploadUrl: (
    purpose: "selfie" | "start_odometer_image",
    contentType: string
  ) => Promise<ServerActionResponse<UploadUrlPayload>>;
  getCheckOutUploadUrl: (
    contentType: string
  ) => Promise<ServerActionResponse<UploadUrlPayload>>;
  getExecutionUploadUrl: (
    bookingId: string,
    purpose: "before" | "after",
    contentType: string
  ) => Promise<ServerActionResponse<UploadUrlPayload>>;
  refreshShift: () => Promise<void>;
  setActiveJob: (job: Job | null) => void;
  updateJob: (jobId: string, updates: Partial<Job>) => void;
  completeJob: (jobId: string, afterImages: string[], notes?: string) => void;
  startJobExecution: (
    jobId: string,
    payload?: CaptainJobExecutionStartRequest
  ) => Promise<ServerActionResponse<CaptainJobExecution>>;
  completeJobExecution: (
    jobId: string,
    payload: CaptainJobExecutionCompleteRequest
  ) => Promise<ServerActionResponse<CaptainJobExecution>>;
  getJobExecution: (
    jobId: string
  ) => Promise<ServerActionResponse<CaptainJobExecution>>;
  saveJobExecutionProgress: (
    jobId: string,
    payload: CaptainJobExecutionSaveProgressRequest
  ) => Promise<ServerActionResponse<CaptainJobExecution>>;
  fetchLeaveBalance: () => Promise<ServerActionResponse<CaptainLeaveBalance>>;
  fetchLeaves: () => Promise<ServerActionResponse<CaptainLeaveRequest[]>>;
  createLeaveDraft: (
    payload: CaptainLeaveDraftRequest
  ) => Promise<ServerActionResponse<CaptainLeaveRequest>>;
  getLeaveDetail: (
    leaveId: number
  ) => Promise<ServerActionResponse<CaptainLeaveRequest>>;
  submitLeave: (
    leaveId: number
  ) => Promise<ServerActionResponse<CaptainLeaveRequest>>;
  withdrawLeave: (
    leaveId: number
  ) => Promise<ServerActionResponse<CaptainLeaveRequest>>;
  fetchTimesheet: (
    params?: CaptainTimesheetFilters
  ) => Promise<ServerActionResponse<CaptainTimesheet>>;
  fetchPayslips: () => Promise<ServerActionResponse<CaptainPayslip[]>>;
}

const buildCaptainProfile = (user: UserResponse["user"]): Captain => ({
  id: String(user.id),
  name: user.name?.trim() || "Captain",
  phone: user.phone_number || "",
  rating: 0,
  totalJobs: 0,
  joinedDate: "",
});

const CaptainContext = createContext<CaptainContextType | undefined>(undefined);

export function CaptainProvider({
  children,
  actions,
  initialUser,
}: Readonly<{
  children: ReactNode;
  actions: CaptainActions;
  initialUser: UserResponse["user"] | null;
}>) {
  const router = useRouter();
  const captain = useMemo(() => {
    if (!initialUser) return null;
    return buildCaptainProfile(initialUser);
  }, [initialUser]);
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJob, setActiveJob] = useState<Job | null>(null);

  const queryClient = useQueryClient();

  const shiftQueryKey = useMemo(() => ["captain-shift-summary"], []);
  const jobsQueryKey = useMemo(() => ["captain-jobs"], []);

  const shiftQuery = useQuery({
    queryKey: shiftQueryKey,
    queryFn: async () => {
      const result = await actions.fetchShiftSummary();
      if (!result.success || !result.data) {
        const error = new Error(
          result.message || "Failed to load shift summary"
        );
        (error as Error & { code?: string }).code = result.code;
        throw error;
      }
      return result.data;
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!initialUser, // Don't fetch if not logged in
  });

  const checkInMutation = useMutation({
    mutationFn: actions.checkIn,
  });

  const checkOutMutation = useMutation({
    mutationFn: actions.checkOut,
  });

  const jobsQuery = useQuery({
    queryKey: jobsQueryKey,
    queryFn: async () => {
      const result = await actions.fetchJobs();
      if (!result.success || !result.data) {
        const error = new Error(result.message || "Failed to load jobs");
        (error as Error & { code?: string }).code = result.code;
        throw error;
      }
      return result.data;
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!initialUser, // Don't fetch if not logged in
  });

  // Redirect to login if no authenticated user
  useEffect(() => {
    if (!initialUser) {
      router.replace("/login");
    }
  }, [initialUser, router]);

  useEffect(() => {
    if (jobsQuery.data) {
      setJobs(jobsQuery.data);
    }
  }, [jobsQuery.data]);

  const todayAttendance = shiftQuery.data?.shift ?? null;
  const materials = useMemo(
    () => shiftQuery.data?.materials ?? [],
    [shiftQuery.data?.materials]
  );

  const refreshShift = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: shiftQueryKey });
  }, [queryClient, shiftQueryKey]);

  const checkIn = useCallback(
    async (payload: CaptainCheckInRequest) => {
      const result = await checkInMutation.mutateAsync(payload);
      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: shiftQueryKey });
      }
      return result;
    },
    [checkInMutation, queryClient, shiftQueryKey]
  );

  const checkOut = useCallback(
    async (payload: CaptainCheckOutRequest) => {
      const result = await checkOutMutation.mutateAsync(payload);
      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: shiftQueryKey });
      }
      return result;
    },
    [checkOutMutation, queryClient, shiftQueryKey]
  );

  const getCheckInUploadUrl = useCallback(
    async (purpose: "selfie" | "start_odometer_image", contentType: string) =>
      actions.getCheckInUploadUrl(purpose, contentType),
    [actions]
  );

  const getCheckOutUploadUrl = useCallback(
    async (contentType: string) => actions.getCheckOutUploadUrl(contentType),
    [actions]
  );

  const getExecutionUploadUrl = useCallback(
    async (bookingId: string, purpose: "before" | "after", contentType: string) =>
      actions.getExecutionUploadUrl(bookingId, purpose, contentType),
    [actions]
  );

  const updateJob = useCallback((jobId: string, updates: Partial<Job>) => {
    setJobs((prev) =>
      prev.map((job) => (job.id === jobId ? { ...job, ...updates } : job))
    );
    setActiveJob((prev) =>
      prev?.id === jobId && prev ? { ...prev, ...updates } : prev
    );
  }, []);

  const startJobExecution = useCallback(
    async (jobId: string, payload?: CaptainJobExecutionStartRequest) => {
      const result = await actions.startJobExecution(jobId, payload);
      if (result.success) {
        updateJob(jobId, {
          status: "ongoing",
          startedAt: result.data?.started_at ?? new Date().toISOString(),
        });
      }
      return result;
    },
    [actions, updateJob]
  );

  const completeJobExecution = useCallback(
    async (jobId: string, payload: CaptainJobExecutionCompleteRequest) => {
      const result = await actions.completeJobExecution(jobId, payload);
      if (result.success) {
        updateJob(jobId, {
          status: "completed",
          completedSteps: payload.checklist
            .filter((item) => item.completed)
            .map((item) => item.id),
          completedAt: result.data?.completed_at ?? new Date().toISOString(),
          notes: payload.captainNotes,
        });
      }
      return result;
    },
    [actions, updateJob]
  );

  const getJobExecution = useCallback(
    async (jobId: string) => actions.getJobExecution(jobId),
    [actions]
  );

  const saveJobExecutionProgress = useCallback(
    async (jobId: string, payload: CaptainJobExecutionSaveProgressRequest) =>
      actions.saveJobExecutionProgress(jobId, payload),
    [actions]
  );

  const completeJob = useCallback((
    jobId: string,
    afterImages: string[],
    notes?: string
  ) => {
    updateJob(jobId, {
      status: "completed",
      afterImages,
      completedAt: new Date().toISOString(),
      notes,
    });
    setActiveJob(null);
  }, [updateJob]);

  const fetchJobs = useCallback(
    async (params?: CaptainJobFilters) => actions.fetchJobs(params),
    [actions]
  );

  const fetchLeaveBalance = useCallback(
    async () => actions.fetchLeaveBalance(),
    [actions]
  );

  const fetchLeaves = useCallback(
    async () => actions.fetchLeaves(),
    [actions]
  );

  const createLeaveDraft = useCallback(
    async (payload: CaptainLeaveDraftRequest) => actions.createLeaveDraft(payload),
    [actions]
  );

  const getLeaveDetail = useCallback(
    async (leaveId: number) => actions.getLeaveDetail(leaveId),
    [actions]
  );

  const submitLeave = useCallback(
    async (leaveId: number) => actions.submitLeave(leaveId),
    [actions]
  );

  const withdrawLeave = useCallback(
    async (leaveId: number) => actions.withdrawLeave(leaveId),
    [actions]
  );

  const fetchTimesheet = useCallback(
    async (params?: CaptainTimesheetFilters) => actions.fetchTimesheet(params),
    [actions]
  );

  const fetchPayslips = useCallback(
    async () => actions.fetchPayslips(),
    [actions]
  );

  // Compute context value - always called, regardless of auth state
  const contextValue = useMemo(
    () => ({
      captain: captain || ({} as Captain),
      todayAttendance,
      materials,
      isCheckedIn: Boolean(
        todayAttendance && todayAttendance.status !== "pending"
      ),
      isCurrentlyCheckedIn: todayAttendance?.status === "checked_in",
      isCheckedOut: todayAttendance?.status === "checked_out",
      isShiftLoading: shiftQuery.isPending || shiftQuery.isFetching,
      isCheckInInFlight: checkInMutation.isPending,
      isCheckOutInFlight: checkOutMutation.isPending,
      jobs,
      activeJob,
      fetchJobs,
      checkIn,
      checkOut,
      getCheckInUploadUrl,
      getCheckOutUploadUrl,
      getExecutionUploadUrl,
      refreshShift,
      setActiveJob,
      updateJob,
      completeJob,
      startJobExecution,
      completeJobExecution,
      getJobExecution,
      saveJobExecutionProgress,
      fetchLeaveBalance,
      fetchLeaves,
      createLeaveDraft,
      getLeaveDetail,
      submitLeave,
      withdrawLeave,
      fetchTimesheet,
      fetchPayslips,
    }),
    [
      captain,
      todayAttendance,
      materials,
      shiftQuery.isPending,
      shiftQuery.isFetching,
      checkInMutation.isPending,
      checkOutMutation.isPending,
      jobs,
      activeJob,
      fetchJobs,
      checkIn,
      checkOut,
      getCheckInUploadUrl,
      getCheckOutUploadUrl,
      getExecutionUploadUrl,
      refreshShift,
      updateJob,
      completeJob,
      startJobExecution,
      completeJobExecution,
      getJobExecution,
      saveJobExecutionProgress,
      fetchLeaveBalance,
      fetchLeaves,
      createLeaveDraft,
      getLeaveDetail,
      submitLeave,
      withdrawLeave,
      fetchTimesheet,
      fetchPayslips,
    ]
  );

  // If no user, just render children without context (e.g., on /login page)
  if (!initialUser || !captain) {
    return <>{children}</>;
  }

  return (
    <CaptainContext.Provider value={contextValue}>
      {children}
    </CaptainContext.Provider>
  );
}

export function useCaptain() {
  const context = useContext(CaptainContext);
  if (context === undefined) {
    throw new Error("useCaptain must be used within a CaptainProvider");
  }
  return context;
}
