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
  CaptainBookingExecutionCompleteRequest,
  CaptainBookingExecutionDetail,
  Captain,
  CaptainCheckInRequest,
  CaptainCheckOutRequest,
  CaptainJobFilters,
  CaptainMaterial,
  CaptainShiftLog,
  CaptainShiftSummary,
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
  startJobExecution: (
    jobId: string,
    metadata?: Record<string, unknown>
  ) => Promise<ServerActionResponse<CaptainBookingExecutionDetail>>;
  completeJobExecution: (
    jobId: string,
    payload: CaptainBookingExecutionCompleteRequest
  ) => Promise<ServerActionResponse<CaptainBookingExecutionDetail>>;
  getJobExecution: (
    jobId: string
  ) => Promise<ServerActionResponse<CaptainBookingExecutionDetail>>;
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
  setActiveJob: (job: Job | null) => void;
  updateJob: (jobId: string, updates: Partial<Job>) => void;
  completeJob: (jobId: string, afterImages: string[], notes?: string) => void;
  startJobExecution: (
    jobId: string,
    metadata?: Record<string, unknown>
  ) => Promise<ServerActionResponse<CaptainBookingExecutionDetail>>;
  completeJobExecution: (
    jobId: string,
    payload: CaptainBookingExecutionCompleteRequest
  ) => Promise<ServerActionResponse<CaptainBookingExecutionDetail>>;
  getJobExecution: (
    jobId: string
  ) => Promise<ServerActionResponse<CaptainBookingExecutionDetail>>;
}

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

  const startJobExecutionMutation = useMutation({
    mutationFn: ({
      jobId,
      metadata,
    }: {
      jobId: string;
      metadata?: Record<string, unknown>;
    }) => actions.startJobExecution(jobId, metadata),
  });

  const completeJobExecutionMutation = useMutation({
    mutationFn: ({
      jobId,
      payload,
    }: {
      jobId: string;
      payload: CaptainBookingExecutionCompleteRequest;
    }) => actions.completeJobExecution(jobId, payload),
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

  const startJobExecution = useCallback(
    async (jobId: string, metadata?: Record<string, unknown>) => {
      const result = await startJobExecutionMutation.mutateAsync({
        jobId,
        metadata,
      });

      if (result.success && result.data) {
        updateJob(jobId, {
          status: "ongoing",
          startedAt: result.data.started_at || new Date().toISOString(),
        });
        await queryClient.invalidateQueries({ queryKey: jobsQueryKey });
      }

      return result;
    },
    [
      startJobExecutionMutation,
      updateJob,
      queryClient,
      jobsQueryKey,
    ]
  );

  const completeJobExecution = useCallback(
    async (jobId: string, payload: CaptainBookingExecutionCompleteRequest) => {
      const result = await completeJobExecutionMutation.mutateAsync({
        jobId,
        payload,
      });

      if (result.success && result.data) {
        updateJob(jobId, {
          status: "completed",
          beforeImages: payload.beforeImages,
          afterImages: payload.afterImages,
          completedSteps: payload.checklist
            .filter((item) => item.completed)
            .map((item) => item.id),
          completedAt: result.data.completed_at || new Date().toISOString(),
          notes: payload.captainNotes,
        });
        setActiveJob(null);
        await queryClient.invalidateQueries({ queryKey: jobsQueryKey });
      }

      return result;
    },
    [
      completeJobExecutionMutation,
      updateJob,
      queryClient,
      jobsQueryKey,
    ]
  );

  const getJobExecution = useCallback(
    async (jobId: string) => actions.getJobExecution(jobId),
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
      isShiftLoading: shiftQuery.isPending || shiftQuery.isFetching,
      isCheckInInFlight: checkInMutation.isPending,
      isCheckOutInFlight: checkOutMutation.isPending,
      jobs,
      activeJob,
      earnings,
      checkIn,
      checkOut,
      refreshShift,
      setActiveJob,
      updateJob,
      completeJob,
      startJobExecution,
      completeJobExecution,
      getJobExecution,
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
      updateJob,
      completeJob,
      startJobExecution,
      completeJobExecution,
      getJobExecution,
    ]
  );

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
