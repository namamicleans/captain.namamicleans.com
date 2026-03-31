"use server";

import { apiGet, apiPost, fetchWithSession } from "@core/http";
import { createErrorResponse } from "@shared/response";
import type {
  CaptainBookingExecutionCompleteRequest,
  CaptainBookingExecutionDetail,
  CaptainBookingExecutionStartRequest,
  CaptainCheckInRequest,
  CaptainCheckOutRequest,
  CaptainExecutionChecklistItem,
  CaptainExecutionChecklistTemplateItem,
  CaptainJobFilters,
  CaptainMaterial,
  CaptainMaterialUnit,
  CaptainShiftLog,
  CaptainShiftMaterialSnapshot,
  CaptainShiftSummary,
  Job,
} from "@/types/captain";
import type { ServerActionResponse } from "@/types/generic";

type CaptainMaterialApi = {
  id: number;
  name: string;
  unit: string;
  is_required: boolean;
  minimum_quantity: number;
  description: string | null;
  is_active: boolean;
};

type CaptainShiftMaterialSnapshotApi = {
  id: number;
  material_id: number;
  material: CaptainMaterialApi;
  quantity_reported: number;
  unit: string;
  is_missing: boolean;
  recorded_at: string;
};

type CaptainShiftLogApi = {
  id: number;
  captain: number;
  captain_label: string | null;
  shift_date: string;
  selfie: string | null;
  checkin_time: string | null;
  checkout_time: string | null;
  start_odometer: number | null;
  end_odometer: number | null;
  notes: string | null;
  status: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  materials: CaptainShiftMaterialSnapshotApi[];
};

type CaptainShiftSummaryApi = {
  shift_date: string;
  captain_id: number;
  captain_label: string | null;
  shift: CaptainShiftLogApi | null;
  materials: CaptainMaterialApi[];
};

type BookingUserApi = {
  id: number;
  name: string | null;
  email?: string | null;
  phone_number: string | null;
  role?: string | null;
};

type BookingPackagePlanApi = {
  service_code: string;
  service: string;
};

type BookingUserPackageApi = {
  payment_status: string | null;
  payment_method?: string | null;
  package_plan: BookingPackagePlanApi;
};

type BookingApi = {
  booking_id: string;
  service: string;
  service_code?: string | null;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  total_amount: string | number | null;
  unit_price: string | number | null;
  address_line_1: string;
  address_line_2: string | null;
  city: string | null;
  pin_code: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  additional_info?: string | null;
  notes?: string | null;
  user: BookingUserApi;
  user_package: BookingUserPackageApi;
};

type CaptainBookingExecutionGalleryImageApi = {
  id: number;
  url: string | null;
  stage: "before" | "after";
  order: number;
  caption: string | null;
  alt_text: string | null;
};

type CaptainBookingExecutionFeedbackApi = {
  id: number;
  rated_by: string;
  rating: number;
  comments: string | null;
  created_at: string;
  updated_at: string;
};

type CaptainExecutionChecklistTemplateItemApi = {
  id: string;
  label: string;
  description?: string | null;
  required: boolean;
  order: number;
};

type CaptainBookingExecutionDetailApi = {
  booking_id: string;
  booking_status: string;
  scheduled_date: string;
  scheduled_time: string;
  started_at: string | null;
  completed_at: string | null;
  checklist_template: CaptainExecutionChecklistTemplateItemApi[] | null;
  checklist_data: CaptainExecutionChecklistItem[] | null;
  checklist_completed_count: number;
  checklist_total_count: number;
  captain_notes: string | null;
  captain_rating_for_customer: number | null;
  summary_snapshot: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  before_images: CaptainBookingExecutionGalleryImageApi[] | null;
  after_images: CaptainBookingExecutionGalleryImageApi[] | null;
  before_image_urls: string[] | null;
  after_image_urls: string[] | null;
  feedback: CaptainBookingExecutionFeedbackApi | null;
  created_at: string;
  updated_at: string;
};

type PaginatedResponse<T> = {
  results: T[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
};

const MATERIAL_UNITS: readonly CaptainMaterialUnit[] = [
  "pieces",
  "liters",
  "milliliters",
  "kilograms",
  "grams",
];

const MATERIAL_UNIT_SET = new Set<string>(MATERIAL_UNITS);
const SHIFT_STATUSES = new Set(["pending", "checked_in", "checked_out"]);

const DEFAULT_SELFIE_FILENAME = "captain-selfie.jpg";
const DEFAULT_EXECUTION_IMAGE_FILENAME_PREFIX = "booking-execution";
const DEFAULT_JOB_PAGE_SIZE = 100;
const DEFAULT_ESTIMATED_DURATION = 60;
const DEFAULT_SERVICE_ICON = "";
const DEFAULT_JOB_STATUSES = [
  "scheduled",
  "rescheduled",
  "ongoing",
  "completed",
];

const SERVICE_TYPE_MATCHERS: Array<{
  key: Job["serviceType"];
  matchers: string[];
}> = [
  { key: "car_wash", matchers: ["car", "auto", "vehicle"] },
  { key: "sofa_cleaning", matchers: ["sofa", "couch", "upholstery"] },
  { key: "home_cleaning", matchers: ["home", "house", "villa"] },
];

function parseUnit(unit?: string | null): CaptainMaterialUnit {
  if (typeof unit === "string" && MATERIAL_UNIT_SET.has(unit)) {
    return unit as CaptainMaterialUnit;
  }
  return "pieces";
}

function transformMaterial(api: CaptainMaterialApi): CaptainMaterial {
  return {
    id: api.id,
    name: api.name,
    unit: parseUnit(api.unit),
    isRequired: api.is_required,
    minimumQuantity: api.minimum_quantity,
    description: api.description,
    isActive: api.is_active,
  };
}

function transformMaterialSnapshot(
  api: CaptainShiftMaterialSnapshotApi
): CaptainShiftMaterialSnapshot {
  return {
    id: api.id,
    materialId: api.material_id,
    material: transformMaterial(api.material),
    quantityReported: api.quantity_reported,
    unit: parseUnit(api.unit),
    isMissing: api.is_missing,
    recordedAt: api.recorded_at,
  };
}

function transformShiftLog(api: CaptainShiftLogApi): CaptainShiftLog {
  const normalizedStatus =
    typeof api.status === "string" && SHIFT_STATUSES.has(api.status)
      ? (api.status as CaptainShiftLog["status"])
      : "pending";

  return {
    id: api.id,
    captainId: api.captain,
    captainLabel: api.captain_label,
    shiftDate: api.shift_date,
    selfieUrl: api.selfie,
    checkInTime: api.checkin_time,
    checkOutTime: api.checkout_time,
    startOdometer: api.start_odometer,
    endOdometer: api.end_odometer,
    notes: api.notes,
    status: normalizedStatus,
    metadata: api.metadata,
    materials: api.materials.map(transformMaterialSnapshot),
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

function transformSummary(api: CaptainShiftSummaryApi): CaptainShiftSummary {
  return {
    shiftDate: api.shift_date,
    captainId: api.captain_id,
    captainLabel: api.captain_label,
    shift: api.shift ? transformShiftLog(api.shift) : null,
    materials: api.materials.map(transformMaterial),
  };
}

function normalizeJobStatus(status?: string | null): Job["status"] {
  if (!status) {
    return "scheduled";
  }
  const normalized = status.toLowerCase();
  switch (normalized) {
    case "ongoing":
      return "ongoing";
    case "completed":
      return "completed";
    case "cancelled":
    case "canceled":
      return "cancelled";
    default:
      return "scheduled";
  }
}

function normalizePaymentStatus(status?: string | null): Job["paymentStatus"] {
  if (!status) {
    return "pending";
  }
  const normalized = status.toLowerCase();
  if (["paid", "completed", "success", "settled"].includes(normalized)) {
    return "paid";
  }
  if (["cod", "cash", "cash_on_delivery"].includes(normalized)) {
    return "cod";
  }
  return "pending";
}

function formatScheduledTime(time?: string | null): string {
  if (!time) {
    return "TBD";
  }
  const [hourRaw = "0", minuteRaw = "0"] = time.split(":");
  const hour = Number.parseInt(hourRaw, 10);
  const minute = Number.parseInt(minuteRaw, 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return time;
  }
  const period = hour >= 12 ? "PM" : "AM";
  const normalizedHour = hour % 12 || 12;
  const paddedHour = normalizedHour.toString().padStart(2, "0");
  const paddedMinute = minute.toString().padStart(2, "0");
  return `${paddedHour}:${paddedMinute} ${period}`;
}

function parseCoordinate(value?: string | number | null): number {
  if (value === undefined || value === null) {
    return 0;
  }
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseAmount(value?: string | number | null): number {
  if (value === undefined || value === null) {
    return 0;
  }
  if (typeof value === "number") {
    return value;
  }
  const sanitized = value.replace(/[^0-9.-]/g, "");
  const parsed = Number.parseFloat(sanitized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatAddress(booking: BookingApi): string {
  const parts = [
    booking.address_line_1,
    booking.address_line_2,
    booking.city,
    booking.pin_code,
  ]
    .filter(Boolean)
    .map((segment) => segment?.toString().trim())
    .filter((segment): segment is string =>
      Boolean(segment && segment.length > 0)
    );
  return parts.join(", ") || "Address not available";
}

function inferServiceType(
  code?: string | null,
  name?: string | null
): Job["serviceType"] {
  const normalizedCode = (code || "").toLowerCase();
  const normalizedName = (name || "").toLowerCase();
  for (const matcher of SERVICE_TYPE_MATCHERS) {
    if (
      matcher.matchers.some(
        (token) =>
          normalizedCode.includes(token) || normalizedName.includes(token)
      )
    ) {
      return matcher.key;
    }
  }
  return SERVICE_TYPE_MATCHERS[0]?.key || "car_wash";
}

function buildScheduleTimestamp(
  date?: string | null,
  time?: string | null
): number {
  if (!date) {
    return 0;
  }
  const sanitizedTime = time && time.length > 0 ? time : "00:00";
  const normalizedTime =
    sanitizedTime.length === 5 ? `${sanitizedTime}:00` : sanitizedTime;
  const parsed = Date.parse(`${date}T${normalizedTime}`);
  return Number.isFinite(parsed) ? parsed : 0;
}

function transformBookingToJob(api: BookingApi): Job {
  const serviceType = inferServiceType(api.service_code, api.service);
  return {
    id: api.booking_id,
    serviceType,
    serviceName:
      api.service ||
      api.user_package?.package_plan?.service ||
      "Cleaning Service",
    serviceIcon: DEFAULT_SERVICE_ICON,
    customerName: api.user?.name || "Customer",
    customerPhone: api.user?.phone_number || "",
    address: formatAddress(api),
    location: {
      lat: parseCoordinate(api.latitude),
      lng: parseCoordinate(api.longitude),
    },
    scheduledTime: formatScheduledTime(api.scheduled_time),
    estimatedDuration: DEFAULT_ESTIMATED_DURATION,
    status: normalizeJobStatus(api.status),
    paymentStatus: normalizePaymentStatus(api.user_package?.payment_status),
    paymentAmount: parseAmount(api.total_amount ?? api.unit_price),
    distance: undefined,
    beforeImages: [],
    afterImages: [],
    completedSteps: [],
    notes: api.notes || api.additional_info || undefined,
  };
}

function transformExecutionDetail(
  api: CaptainBookingExecutionDetailApi
): CaptainBookingExecutionDetail {
  const checklistTemplate: CaptainExecutionChecklistTemplateItem[] = (
    api.checklist_template ?? []
  )
    .map((item, index) => ({
      id: item.id,
      label: item.label,
      description: item.description ?? null,
      required: Boolean(item.required),
      order:
        typeof item.order === "number" && Number.isFinite(item.order)
          ? item.order
          : index + 1,
    }))
    .sort((a, b) => a.order - b.order);

  return {
    booking_id: api.booking_id,
    booking_status: api.booking_status,
    scheduled_date: api.scheduled_date,
    scheduled_time: api.scheduled_time,
    started_at: api.started_at,
    completed_at: api.completed_at,
    checklist_template: checklistTemplate,
    checklist_data: api.checklist_data ?? [],
    checklist_completed_count: api.checklist_completed_count || 0,
    checklist_total_count: api.checklist_total_count || 0,
    captain_notes: api.captain_notes,
    captain_rating_for_customer: api.captain_rating_for_customer,
    summary_snapshot: api.summary_snapshot ?? {},
    metadata: api.metadata ?? {},
    before_images: api.before_images ?? [],
    after_images: api.after_images ?? [],
    before_image_urls: api.before_image_urls ?? [],
    after_image_urls: api.after_image_urls ?? [],
    feedback: api.feedback,
    created_at: api.created_at,
    updated_at: api.updated_at,
  };
}

function createStandardizedFailureResponse<T>(
  response: ServerActionResponse<unknown>
): ServerActionResponse<T> {
  return {
    success: response.success,
    message: response.message,
    code: response.code,
    data: null,
    error: response.error,
  } as ServerActionResponse<T>;
}

function convertDataUrlToFile(
  dataUrl: string,
  filenamePrefix: string
): File | null {
  if (!dataUrl) {
    return null;
  }

  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return null;
  }

  const mime = match[1];
  const payload = match[2];
  if (!mime || !payload) {
    return null;
  }

  const byteArray = Uint8Array.from(Buffer.from(payload, "base64"));
  const extension = mime.split("/")[1] || "jpg";
  const filename = `${filenamePrefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${extension}`;

  return new File([byteArray], filename, { type: mime });
}

function decodeBase64Image(base64Data: string): File | null {
  const selfiePrefix = DEFAULT_SELFIE_FILENAME.replace(/\.\w+$/, "");
  return convertDataUrlToFile(base64Data, selfiePrefix);
}

function convertDataUrlsToFiles(
  images: string[],
  filenamePrefix: string,
  errorCode: string,
  errorMessage: string
): ServerActionResponse<File[]> {
  const files: File[] = [];
  for (const image of images) {
    const file = convertDataUrlToFile(image, filenamePrefix);
    if (!file) {
      return createErrorResponse<File[]>(errorMessage, errorCode, null);
    }
    files.push(file);
  }

  return {
    success: true,
    message: "Files prepared",
    code: "SUCCESS",
    data: files,
    error: null,
    showToast: false,
  } as ServerActionResponse<File[]>;
}

export async function startCaptainBookingExecution(
  bookingId: string,
  metadata: Record<string, unknown> = {}
): Promise<ServerActionResponse<CaptainBookingExecutionDetail>> {
  const body: CaptainBookingExecutionStartRequest = {
    metadata,
  };

  const response = await fetchWithSession<
    CaptainBookingExecutionStartRequest,
    CaptainBookingExecutionDetailApi
  >(
    apiPost,
    `/api/service/captain/bookings/${bookingId}/start/`,
    body
  );

  if (!response.success || !response.data) {
    return createStandardizedFailureResponse<CaptainBookingExecutionDetail>(
      response
    );
  }

  return {
    ...response,
    data: transformExecutionDetail(response.data),
  } as ServerActionResponse<CaptainBookingExecutionDetail>;
}

export async function completeCaptainBookingExecution(
  bookingId: string,
  payload: CaptainBookingExecutionCompleteRequest
): Promise<ServerActionResponse<CaptainBookingExecutionDetail>> {
  const beforeFilesResult = convertDataUrlsToFiles(
    payload.beforeImages,
    `${DEFAULT_EXECUTION_IMAGE_FILENAME_PREFIX}-before`,
    "BOOKING_EXECUTION_BEFORE_IMAGE_INVALID",
    "Invalid before image data. Please recapture before images."
  );
  if (!beforeFilesResult.success || !beforeFilesResult.data) {
    return createStandardizedFailureResponse<CaptainBookingExecutionDetail>(
      beforeFilesResult
    );
  }

  const afterFilesResult = convertDataUrlsToFiles(
    payload.afterImages,
    `${DEFAULT_EXECUTION_IMAGE_FILENAME_PREFIX}-after`,
    "BOOKING_EXECUTION_AFTER_IMAGE_INVALID",
    "Invalid after image data. Please recapture after images."
  );
  if (!afterFilesResult.success || !afterFilesResult.data) {
    return createStandardizedFailureResponse<CaptainBookingExecutionDetail>(
      afterFilesResult
    );
  }

  const formData = new FormData();
  beforeFilesResult.data.forEach((file) => {
    formData.append("before_images", file);
  });
  afterFilesResult.data.forEach((file) => {
    formData.append("after_images", file);
  });

  formData.append("checklist", JSON.stringify(payload.checklist));
  formData.append(
    "captain_rating_for_customer",
    String(payload.captainRatingForCustomer)
  );

  if (payload.captainNotes) {
    formData.append("captain_notes", payload.captainNotes);
  }

  if (payload.summary) {
    formData.append("summary", JSON.stringify(payload.summary));
  }

  if (payload.metadata) {
    formData.append("metadata", JSON.stringify(payload.metadata));
  }

  const response = await fetchWithSession<FormData, CaptainBookingExecutionDetailApi>(
    apiPost,
    `/api/service/captain/bookings/${bookingId}/complete/`,
    formData
  );

  if (!response.success || !response.data) {
    return createStandardizedFailureResponse<CaptainBookingExecutionDetail>(
      response
    );
  }

  return {
    ...response,
    data: transformExecutionDetail(response.data),
  } as ServerActionResponse<CaptainBookingExecutionDetail>;
}

export async function getCaptainBookingExecution(
  bookingId: string
): Promise<ServerActionResponse<CaptainBookingExecutionDetail>> {
  const response = await fetchWithSession<undefined, CaptainBookingExecutionDetailApi>(
    apiGet,
    `/api/service/captain/bookings/${bookingId}/execution/`
  );

  if (!response.success || !response.data) {
    return createStandardizedFailureResponse<CaptainBookingExecutionDetail>(
      response
    );
  }

  return {
    ...response,
    data: transformExecutionDetail(response.data),
  } as ServerActionResponse<CaptainBookingExecutionDetail>;
}

export async function getCaptainMaterials(
  params: Record<string, string | number | boolean> = { is_active: true }
): Promise<ServerActionResponse<CaptainMaterial[]>> {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    search.set(key, String(value));
  });

  const query = search.toString();
  const endpoint = `/api/service/captain/materials/${query ? `?${query}` : ""}`;
  const result = await fetchWithSession<undefined, CaptainMaterialApi[]>(
    apiGet,
    endpoint
  );

  if (!result.success || !result.data) {
    return {
      success: result.success,
      message: result.message,
      code: result.code,
      data: null,
      error: result.error,
    } as ServerActionResponse<CaptainMaterial[]>;
  }

  return {
    ...result,
    data: result.data.map(transformMaterial),
  } as ServerActionResponse<CaptainMaterial[]>;
}

export async function getCaptainShiftSummary(params?: {
  shiftDate?: string;
}): Promise<ServerActionResponse<CaptainShiftSummary>> {
  const search = new URLSearchParams();
  if (params?.shiftDate) {
    search.set("shift_date", params.shiftDate);
  }

  const endpoint = `/api/service/captain/shifts/current/${
    search.toString() ? `?${search.toString()}` : ""
  }`;
  const result = await fetchWithSession<undefined, CaptainShiftSummaryApi>(
    apiGet,
    endpoint
  );

  if (!result.success || !result.data) {
    return {
      success: result.success,
      message: result.message,
      code: result.code,
      data: null,
      error: result.error,
    } as ServerActionResponse<CaptainShiftSummary>;
  }

  return {
    ...result,
    data: transformSummary(result.data),
  } as ServerActionResponse<CaptainShiftSummary>;
}

export async function submitCaptainCheckIn(
  payload: CaptainCheckInRequest
): Promise<ServerActionResponse<CaptainShiftLog>> {
  console.log("Submitting check-in with payload:", payload);
  if (!payload.selfie) {
    return createErrorResponse<CaptainShiftLog>(
      "Selfie capture is required",
      "CHECK_IN_SELFIE_REQUIRED",
      null
    );
  }

  if (!payload.materials || payload.materials.length === 0) {
    return createErrorResponse<CaptainShiftLog>(
      "Select at least one material before proceeding.",
      "CHECK_IN_MATERIALS_REQUIRED",
      null
    );
  }

  if (!payload.metadata || Object.keys(payload.metadata).length === 0) {
    return createErrorResponse<CaptainShiftLog>(
      "Selfie metadata missing. Retake the selfie to capture location.",
      "CHECK_IN_METADATA_REQUIRED",
      null
    );
  }

  const selfieFile = decodeBase64Image(payload.selfie);
  if (!selfieFile) {
    return createErrorResponse<CaptainShiftLog>(
      "Invalid selfie data. Please capture again.",
      "CHECK_IN_SELFIE_INVALID",
      null
    );
  }

  const formData = new FormData();
  formData.append("selfie", selfieFile);

  if (payload.start_odometer !== undefined && payload.start_odometer !== null) {
    formData.append("start_odometer", String(payload.start_odometer));
  }

  // Send materials as JSON string for multipart/form-data compatibility
  formData.append("materials", JSON.stringify(payload.materials));

  if (payload.metadata && Object.keys(payload.metadata).length > 0) {
    formData.append("metadata", JSON.stringify(payload.metadata));
  }

  if (payload.shiftDate) {
    formData.append("shift_date", payload.shiftDate);
  }

  const result = await fetchWithSession<FormData, CaptainShiftLogApi>(
    apiPost,
    "/api/service/captain/shifts/check-in/",
    formData
  );

  if (!result.success || !result.data) {
    return {
      success: result.success,
      message: result.message,
      code: result.code,
      data: null,
      error: result.error,
    } as ServerActionResponse<CaptainShiftLog>;
  }

  return {
    ...result,
    data: transformShiftLog(result.data),
  } as ServerActionResponse<CaptainShiftLog>;
}

export async function submitCaptainCheckOut(
  payload: CaptainCheckOutRequest
): Promise<ServerActionResponse<CaptainShiftLog>> {
  const body: Record<string, unknown> = {
    end_odometer: payload.endOdometer,
  };

  if (payload.shiftDate) {
    body.shift_date = payload.shiftDate;
  }

  if (payload.notes) {
    body.notes = payload.notes;
  }

  if (payload.metadata) {
    body.metadata = payload.metadata;
  }

  const result = await fetchWithSession<
    Record<string, unknown>,
    CaptainShiftLogApi
  >(apiPost, "/api/service/captain/shifts/check-out/", body);

  if (!result.success || !result.data) {
    return {
      success: result.success,
      message: result.message,
      code: result.code,
      data: null,
      error: result.error,
    } as ServerActionResponse<CaptainShiftLog>;
  }

  return {
    ...result,
    data: transformShiftLog(result.data),
  } as ServerActionResponse<CaptainShiftLog>;
}

export async function getCaptainJobs(
  filters: CaptainJobFilters = {}
): Promise<ServerActionResponse<Job[]>> {
  const params = new URLSearchParams();
  const hasCustomDateRange = Boolean(filters.startDate || filters.endDate);
  if (filters.startDate) {
    params.set("start_date", filters.startDate);
  }
  if (filters.endDate) {
    params.set("end_date", filters.endDate);
  }
  if (!hasCustomDateRange) {
    const today = new Date();
    const todayString = today.toISOString().split("T")[0];
    params.set("start_date", todayString);
    params.set("end_date", todayString);
  }

  if (filters.status) {
    params.set("status", filters.status);
  } else {
    params.set("status", DEFAULT_JOB_STATUSES.join(","));
  }

  params.set("page", filters.page ? String(filters.page) : "1");
  params.set(
    "page_size",
    filters.pageSize ? String(filters.pageSize) : String(DEFAULT_JOB_PAGE_SIZE)
  );

  const query = params.toString();
  const endpoint = `/api/service/bookings?${query}`;
  const response = await fetchWithSession<
    undefined,
    PaginatedResponse<BookingApi>
  >(apiGet, endpoint);

  if (!response.success || !response.data) {
    return {
      success: response.success,
      message: response.message,
      code: response.code,
      data: null,
      error: response.error,
      showToast: false,
    } as ServerActionResponse<Job[]>;
  }

  const sortedResults = [...response.data.results].sort(
    (a, b) =>
      buildScheduleTimestamp(a.scheduled_date, a.scheduled_time) -
      buildScheduleTimestamp(b.scheduled_date, b.scheduled_time)
  );
  const jobs = sortedResults.map(transformBookingToJob);

  return {
    ...response,
    data: jobs,
    showToast: false,
  } as ServerActionResponse<Job[]>;
}
