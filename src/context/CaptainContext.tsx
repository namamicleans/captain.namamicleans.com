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
  CaptainCompleteJobExecutionRequest,
  CaptainCheckOutRequest,
  CaptainLeaveBalance,
  CaptainLeaveDraftRequest,
  CaptainLeaveRequest,
  CaptainJobFilters,
  CaptainJobExecution,
  CaptainMaterial,
  CaptainShiftLog,
  CaptainShiftSummary,
  CaptainTimesheet,
  Earnings,
  Job,
} from "@/types/captain";
import type { ServerActionResponse } from "@/types/generic";
import type { UserResponse } from "@/types/auth";

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
  fetchJobs: (
    params?: CaptainJobFilters
  ) => Promise<ServerActionResponse<Job[]>>;
  fetchTimesheet?: (params: {
    startDate: string;
    endDate: string;
  }) => Promise<ServerActionResponse<CaptainTimesheet>>;
  fetchLeaveBalance?: () => Promise<ServerActionResponse<CaptainLeaveBalance>>;
  fetchLeaves?: () => Promise<ServerActionResponse<CaptainLeaveRequest[]>>;
  createLeaveDraft?: (
    payload: CaptainLeaveDraftRequest
  ) => Promise<ServerActionResponse<CaptainLeaveRequest>>;
  getLeaveDetail?: (
    leaveId: number
  ) => Promise<ServerActionResponse<CaptainLeaveRequest>>;
  submitLeave?: (
    leaveId: number
  ) => Promise<ServerActionResponse<CaptainLeaveRequest>>;
  withdrawLeave?: (
    leaveId: number
  ) => Promise<ServerActionResponse<CaptainLeaveRequest>>;
  startJobExecution?: (
    jobId: string,
    metadata?: Record<string, unknown>
  ) => Promise<ServerActionResponse<CaptainJobExecution>>;
  completeJobExecution?: (
    jobId: string,
    payload: CaptainCompleteJobExecutionRequest
  ) => Promise<ServerActionResponse<CaptainJobExecution>>;
  getJobExecution?: (
    jobId: string
  ) => Promise<ServerActionResponse<CaptainJobExecution>>;
}

interface CaptainContextType {
  captain: Captain;
  todayAttendance: CaptainShiftLog | null;
  materials: CaptainMaterial[];
  isCheckedIn: boolean;
  isShiftLoading: boolean;
  isCheckInInFlight: boolean;
  isCheckOutInFlight: boolean;
  jobs: Job[];
  activeJob: Job | null;
  earnings: Earnings;
  checkIn: (
    payload: CaptainCheckInRequest
  ) => Promise<ServerActionResponse<CaptainShiftLog>>;
  checkOut: (
    payload: CaptainCheckOutRequest
  ) => Promise<ServerActionResponse<CaptainShiftLog>>;
  refreshShift: () => Promise<void>;
  startJobExecution: (
    jobId: string,
    metadata?: Record<string, unknown>
  ) => Promise<ServerActionResponse<CaptainJobExecution>>;
  completeJobExecution: (
    jobId: string,
    payload: CaptainCompleteJobExecutionRequest
  ) => Promise<ServerActionResponse<CaptainJobExecution>>;
  getJobExecution: (
    jobId: string
  ) => Promise<ServerActionResponse<CaptainJobExecution>>;
  fetchTimesheet: (params: {
    startDate: string;
    endDate: string;
  }) => Promise<ServerActionResponse<CaptainTimesheet>>;
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
  setActiveJob: (job: Job | null) => void;
  updateJob: (jobId: string, updates: Partial<Job>) => void;
  completeJob: (jobId: string, afterImages: string[], notes?: string) => void;
}

const notConfiguredResponse = <T,>(message: string): ServerActionResponse<T> => ({
  success: false,
  message,
  code: "NOT_IMPLEMENTED",
  data: null,
  error: message,
});

const buildCaptainProfile = (user: UserResponse["user"]): Captain => ({
  id: String(user.id),
  name: user.name?.trim() || "Captain",
  phone: user.phone_number || "",
  rating: 0,
  totalJobs: 0,
  joinedDate: "",
});

const mockEarnings: Earnings = {
  today: 1898,
  thisWeek: 12450,
  thisMonth: 48750,
  totalJobs: 28,
  incentives: 2500,
  deductions: 350,
};

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
  const [earnings] = useState<Earnings>(mockEarnings);

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
  const materials = shiftQuery.data?.materials ?? [];

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

  const fetchTimesheet = useCallback(
    async (params: { startDate: string; endDate: string }) => {
      if (!actions.fetchTimesheet) {
        return notConfiguredResponse<CaptainTimesheet>(
          "Timesheet action is not configured."
        );
      }

      return actions.fetchTimesheet(params);
    },
    [actions]
  );

  const fetchLeaveBalance = useCallback(async () => {
    if (!actions.fetchLeaveBalance) {
      return notConfiguredResponse<CaptainLeaveBalance>(
        "Leave balance action is not configured."
      );
    }

    return actions.fetchLeaveBalance();
  }, [actions]);

  const fetchLeaves = useCallback(async () => {
    if (!actions.fetchLeaves) {
      return notConfiguredResponse<CaptainLeaveRequest[]>(
        "Leave list action is not configured."
      );
    }

    return actions.fetchLeaves();
  }, [actions]);

  const createLeaveDraft = useCallback(
    async (payload: CaptainLeaveDraftRequest) => {
      if (!actions.createLeaveDraft) {
        return notConfiguredResponse<CaptainLeaveRequest>(
          "Leave create action is not configured."
        );
      }

      return actions.createLeaveDraft(payload);
    },
    [actions]
  );

  const getLeaveDetail = useCallback(
    async (leaveId: number) => {
      if (!actions.getLeaveDetail) {
        return notConfiguredResponse<CaptainLeaveRequest>(
          "Leave detail action is not configured."
        );
      }

      return actions.getLeaveDetail(leaveId);
    },
    [actions]
  );

  const submitLeave = useCallback(
    async (leaveId: number) => {
      if (!actions.submitLeave) {
        return notConfiguredResponse<CaptainLeaveRequest>(
          "Leave submit action is not configured."
        );
      }

      return actions.submitLeave(leaveId);
    },
    [actions]
  );

  const withdrawLeave = useCallback(
    async (leaveId: number) => {
      if (!actions.withdrawLeave) {
        return notConfiguredResponse<CaptainLeaveRequest>(
          "Leave withdraw action is not configured."
        );
      }

      return actions.withdrawLeave(leaveId);
    },
    [actions]
  );

  const startJobExecution = useCallback(
    async (jobId: string, metadata?: Record<string, unknown>) => {
      if (!actions.startJobExecution) {
        return notConfiguredResponse<CaptainJobExecution>(
          "Job start action is not configured."
        );
      }

      return actions.startJobExecution(jobId, metadata);
    },
    [actions]
  );

  const completeJobExecution = useCallback(
    async (jobId: string, payload: CaptainCompleteJobExecutionRequest) => {
      if (!actions.completeJobExecution) {
        return notConfiguredResponse<CaptainJobExecution>(
          "Job completion action is not configured."
        );
      }

      return actions.completeJobExecution(jobId, payload);
    },
    [actions]
  );

  const getJobExecution = useCallback(
    async (jobId: string) => {
      if (!actions.getJobExecution) {
        return notConfiguredResponse<CaptainJobExecution>(
          "Job execution fetch action is not configured."
        );
      }

      return actions.getJobExecution(jobId);
    },
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

  // Compute context value - always called, regardless of auth state
  const contextValue = useMemo(
    () => ({
      captain: captain || ({} as Captain),
      todayAttendance,
      materials,
      isCheckedIn: Boolean(
        todayAttendance && todayAttendance.status !== "pending"
      ),
      isShiftLoading: shiftQuery.isPending || shiftQuery.isFetching,
      isCheckInInFlight: checkInMutation.isPending,
      isCheckOutInFlight: checkOutMutation.isPending,
      jobs,
      activeJob,
      earnings,
      checkIn,
      checkOut,
      refreshShift,
      fetchTimesheet,
      fetchLeaveBalance,
      fetchLeaves,
      createLeaveDraft,
      getLeaveDetail,
      submitLeave,
      withdrawLeave,
      startJobExecution,
      completeJobExecution,
      getJobExecution,
      setActiveJob,
      updateJob,
      completeJob,
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
      earnings,
      checkIn,
      checkOut,
      refreshShift,
      fetchTimesheet,
      fetchLeaveBalance,
      fetchLeaves,
      createLeaveDraft,
      getLeaveDetail,
      submitLeave,
      withdrawLeave,
      startJobExecution,
      completeJobExecution,
      getJobExecution,
      updateJob,
      completeJob,
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
