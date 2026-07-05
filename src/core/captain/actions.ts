"use server";

import { apiGet, apiPatch, apiPost, fetchWithSession } from "@core/http";
import { createErrorResponse } from "@shared/response";
import type {
  CaptainCheckInRequest,
  CaptainCheckOutRequest,
  CaptainExecutionChecklistTemplateItem,
  CaptainJobExecution,
  CaptainJobExecutionCompleteRequest,
  CaptainJobExecutionSaveProgressRequest,
  CaptainJobExecutionStartRequest,
  CaptainJobFilters,
  CaptainLeaveBalance,
  CaptainLeaveDraftRequest,
  CaptainLeaveRequest,
  CaptainMaterial,
  CaptainTimesheet,
  CaptainTimesheetFilters,
  CaptainMaterialUnit,
  CaptainShiftLog,
  CaptainShiftMaterialSnapshot,
  CaptainShiftSummary,
  Job,
} from "@/types/captain";
import type { ServerActionResponse } from "@/types/generic";
import { ACCEPTED_IMAGE_MIMES } from "@/shared/utils/images";

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
  start_odometer_image: string | null;
  end_odometer_image: string | null;
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

type SelectedVariantApi = {
  id: number | null;
  name: string;
  price: number;
};

type SelectedAddonApi = {
  id: number | null;
  name: string;
  price: number;
  quantity: number;
};

type BookingUserPackageApi = {
  payment_status: string | null;
  payment_method?: string | null;
  package_plan: BookingPackagePlanApi;
  selected_variants?: SelectedVariantApi[];
  selected_addons?: SelectedAddonApi[];
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
  quantity?: string | number | null;
  quantity_unit?: string | null;
  quantity_display?: string | null;
  is_quantity_based?: boolean;
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

type PaginatedResponse<T> = {
  results: T[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
};

type ExecutionChecklistItemApi = {
  id: string;
  label: string;
  description?: string | null;
  required?: boolean;
  completed?: boolean;
  order?: number;
};

type ExecutionImageApi = {
  id: number;
  image?: string | null;
  url?: string | null;
  order: number;
};

type JobExecutionApi = {
  id: number;
  booking_id: string;
  started_at: string | null;
  completed_at: string | null;
  checklist?: ExecutionChecklistItemApi[];
  checklist_data?: ExecutionChecklistItemApi[];
  checklist_template?: ExecutionChecklistItemApi[];
  checklist_completed_count: number;
  checklist_total_count: number;
  captain_notes: string | null;
  captain_rating_for_customer: number | null;
  summary_snapshot: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  before_images?: ExecutionImageApi[];
  after_images?: ExecutionImageApi[];
  before_image_urls?: string[];
  after_image_urls?: string[];
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
    startOdometerImage: api.start_odometer_image ?? null,
    endOdometerImage: api.end_odometer_image ?? null,
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

function buildQuantityDisplay(api: BookingApi): string {
  const quantityDisplay = api.quantity_display?.toString().trim();
  if (quantityDisplay) {
    return quantityDisplay;
  }
  const quantity = parseAmount(api.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return '';
  }
  const quantityUnit = api.quantity_unit?.toString().trim();
  return quantityUnit ? `${quantity} ${quantityUnit}` : `${quantity}`;
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
    quantityDisplay: buildQuantityDisplay(api),
    quantity: parseAmount(api.quantity),
    quantityUnit: api.quantity_unit?.toString().trim() || undefined,
    isQuantityBased: Boolean(api.is_quantity_based),
    selectedVariants: api.user_package?.selected_variants,
    selectedAddons: api.user_package?.selected_addons,
  };
}

function transformExecutionChecklistItem(
  item: ExecutionChecklistItemApi
): CaptainExecutionChecklistTemplateItem {
  return {
    id: item.id,
    label: item.label,
    description: item.description ?? null,
    required: Boolean(item.required),
    completed: Boolean(item.completed),
    order: item.order,
  };
}

function transformExecutionImage(item: ExecutionImageApi) {
  return {
    id: item.id,
    url: item.url ?? item.image ?? null,
    order: item.order,
  };
}

function transformJobExecution(api: JobExecutionApi): CaptainJobExecution {
  const beforeImages = (api.before_images ?? []).map(transformExecutionImage);
  const afterImages = (api.after_images ?? []).map(transformExecutionImage);

  return {
    id: api.id,
    booking_id: api.booking_id,
    started_at: api.started_at ?? null,
    completed_at: api.completed_at ?? null,
    checklist_data: (api.checklist_data ?? api.checklist ?? []).map(
      transformExecutionChecklistItem
    ),
    checklist_template: (api.checklist_template ?? []).map(
      transformExecutionChecklistItem
    ),
    checklist_completed_count: api.checklist_completed_count ?? 0,
    checklist_total_count: api.checklist_total_count ?? 0,
    captain_notes: api.captain_notes ?? null,
    captain_rating_for_customer: api.captain_rating_for_customer ?? null,
    summary_snapshot: api.summary_snapshot ?? null,
    metadata: api.metadata ?? null,
    before_images: beforeImages,
    after_images: afterImages,
    before_image_urls:
      api.before_image_urls ??
      beforeImages
        .map((item) => item.url)
        .filter((item): item is string => Boolean(item)),
    after_image_urls:
      api.after_image_urls ??
      afterImages
        .map((item) => item.url)
        .filter((item): item is string => Boolean(item)),
  };
}



function decodeBase64Image(base64Data: string, filename = DEFAULT_SELFIE_FILENAME): File | null {
  if (!base64Data) {
    return null;
  }

  const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return null;
  }

  const mime = match[1];
  const payload = match[2];
  if (!mime || !payload || !ACCEPTED_IMAGE_MIMES.includes(mime)) {
    return null;
  }

  const byteArray = Uint8Array.from(Buffer.from(payload, "base64"));
  const extension = mime.split("/")[1] || "jpg";
  const filenameWithExtension = `${Date.now()}-${filename.replace(
    /\.\w+$/,
    `.${extension}`
  )}`;
  return new File([byteArray], filenameWithExtension, { type: mime });
}

function appendBase64Images(formData: FormData, fieldName: string, images: string[]) {
  images.forEach((image, index) => {
    const file = decodeBase64Image(image, `${fieldName}-${index + 1}.jpg`);
    if (file) {
      formData.append(fieldName, file);
    }
  });
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

  if (!payload.start_odometer_image) {
    return createErrorResponse<CaptainShiftLog>(
      "Odometer photo is required. Please capture an image of your odometer reading.",
      "CHECK_IN_ODOMETER_IMAGE_REQUIRED",
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

  const odometerImageFile = decodeBase64Image(
    payload.start_odometer_image,
    "odometer.jpg"
  );
  if (!odometerImageFile) {
    return createErrorResponse<CaptainShiftLog>(
      "Invalid odometer photo data. Please capture again.",
      "CHECK_IN_ODOMETER_IMAGE_INVALID",
      null
    );
  }

  const formData = new FormData();
  formData.append("selfie", selfieFile);
  formData.append("start_odometer_image", odometerImageFile);

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
  if (!payload.endOdometerImage) {
    return createErrorResponse<CaptainShiftLog>(
      "Odometer photo is required. Please capture an image of your closing odometer reading.",
      "CHECK_OUT_ODOMETER_IMAGE_REQUIRED",
      null
    );
  }

  if (!Number.isFinite(payload.endOdometer) || payload.endOdometer <= 0) {
    return createErrorResponse<CaptainShiftLog>(
      "Enter a valid odometer reading.",
      "CHECK_OUT_ODOMETER_INVALID",
      null
    );
  }

  const odometerImageFile = decodeBase64Image(
    payload.endOdometerImage,
    "odometer.jpg"
  );
  if (!odometerImageFile) {
    return createErrorResponse<CaptainShiftLog>(
      "Invalid odometer photo data. Please capture again.",
      "CHECK_OUT_ODOMETER_IMAGE_INVALID",
      null
    );
  }

  const formData = new FormData();
  formData.append("end_odometer", String(payload.endOdometer));
  formData.append("end_odometer_image", odometerImageFile);

  if (payload.notes) {
    formData.append("notes", payload.notes);
  }

  if (payload.metadata) {
    formData.append("metadata", JSON.stringify(payload.metadata));
  }

  if (payload.shiftDate) {
    formData.append("shift_date", payload.shiftDate);
  }

  const result = await fetchWithSession<FormData, CaptainShiftLogApi>(
    apiPost,
    "/api/service/captain/shifts/check-out/",
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

export async function startCaptainJobExecution(
  bookingId: string,
  payload: CaptainJobExecutionStartRequest = {}
): Promise<ServerActionResponse<CaptainJobExecution>> {
  const body = {
    metadata: {
      ...(payload.metadata || {}),
      ...(payload.source ? { source: payload.source } : {}),
    },
  };

  const result = await fetchWithSession<Record<string, unknown>, JobExecutionApi>(
    apiPost,
    `/api/service/captain/bookings/${bookingId}/start/`,
    body
  );

  if (!result.success || !result.data) {
    return {
      success: result.success,
      message: result.message,
      code: result.code,
      data: null,
      error: result.error,
    } as ServerActionResponse<CaptainJobExecution>;
  }

  return {
    ...result,
    data: transformJobExecution(result.data),
  } as ServerActionResponse<CaptainJobExecution>;
}

export async function completeCaptainJobExecution(
  bookingId: string,
  payload: CaptainJobExecutionCompleteRequest
): Promise<ServerActionResponse<CaptainJobExecution>> {
  const formData = new FormData();
  appendBase64Images(formData, 'before_images', payload.beforeImages);
  appendBase64Images(formData, 'after_images', payload.afterImages);

  // Tell the backend which already-uploaded gallery rows to keep so they are
  // not deleted and re-uploaded unnecessarily on resume.
  if (payload.existingBeforeImageIds && payload.existingBeforeImageIds.length > 0) {
    formData.append('existing_before_image_ids', JSON.stringify(payload.existingBeforeImageIds));
  }
  if (payload.existingAfterImageIds && payload.existingAfterImageIds.length > 0) {
    formData.append('existing_after_image_ids', JSON.stringify(payload.existingAfterImageIds));
  }

  formData.append('checklist', JSON.stringify(payload.checklist));
  formData.append(
    'captain_rating_for_customer',
    String(payload.captainRatingForCustomer)
  );

  if (payload.captainNotes) {
    formData.append('captain_notes', payload.captainNotes);
  }

  if (payload.summary) {
    formData.append('summary', JSON.stringify(payload.summary));
  }

  if (payload.metadata) {
    formData.append('metadata', JSON.stringify(payload.metadata));
  }

  const result = await fetchWithSession<FormData, JobExecutionApi>(
    apiPost,
    `/api/service/captain/bookings/${bookingId}/complete/`,
    formData
  );

  if (!result.success || !result.data) {
    return {
      success: result.success,
      message: result.message,
      code: result.code,
      data: null,
      error: result.error,
    } as ServerActionResponse<CaptainJobExecution>;
  }

  return {
    ...result,
    data: transformJobExecution(result.data),
  } as ServerActionResponse<CaptainJobExecution>;
}

export async function getCaptainJobExecution(
  bookingId: string
): Promise<ServerActionResponse<CaptainJobExecution>> {
  const result = await fetchWithSession<undefined, JobExecutionApi>(
    apiGet,
    `/api/service/captain/bookings/${bookingId}/execution/`
  );

  if (!result.success || !result.data) {
    return {
      success: result.success,
      message: result.message,
      code: result.code,
      data: null,
      error: result.error,
    } as ServerActionResponse<CaptainJobExecution>;
  }

  return {
    ...result,
    data: transformJobExecution(result.data),
  } as ServerActionResponse<CaptainJobExecution>;
}

export async function saveJobExecutionProgress(
  bookingId: string,
  payload: CaptainJobExecutionSaveProgressRequest
): Promise<ServerActionResponse<CaptainJobExecution>> {
  const formData = new FormData();

  if (payload.beforeImages && payload.beforeImages.length > 0) {
    appendBase64Images(formData, 'before_images', payload.beforeImages);
  }
  if (payload.afterImages && payload.afterImages.length > 0) {
    appendBase64Images(formData, 'after_images', payload.afterImages);
  }
  if (payload.existingBeforeImageIds && payload.existingBeforeImageIds.length > 0) {
    formData.append('existing_before_image_ids', JSON.stringify(payload.existingBeforeImageIds));
  }
  if (payload.existingAfterImageIds && payload.existingAfterImageIds.length > 0) {
    formData.append('existing_after_image_ids', JSON.stringify(payload.existingAfterImageIds));
  }
  if (payload.checklist) {
    formData.append('checklist', JSON.stringify(payload.checklist));
  }
  if (payload.captainNotes !== undefined) {
    formData.append('captain_notes', payload.captainNotes);
  }
  if (payload.captainRatingForCustomer !== undefined) {
    formData.append('captain_rating_for_customer', String(payload.captainRatingForCustomer));
  }
  if (payload.currentStep !== undefined) {
    formData.append('current_step', String(payload.currentStep));
  }

  const result = await fetchWithSession<FormData, JobExecutionApi>(
    apiPatch,
    `/api/service/captain/bookings/${bookingId}/execution/`,
    formData
  );

  if (!result.success || !result.data) {
    return {
      success: result.success,
      message: result.message,
      code: result.code,
      data: null,
      error: result.error,
    } as ServerActionResponse<CaptainJobExecution>;
  }

  return {
    ...result,
    data: transformJobExecution(result.data),
  } as ServerActionResponse<CaptainJobExecution>;
}

export async function getCaptainLeaveBalance(): Promise<
  ServerActionResponse<CaptainLeaveBalance>
> {
  const result = await fetchWithSession<undefined, CaptainLeaveBalance>(
    apiGet,
    "/api/service/captain/leave-balance/"
  );

  if (!result.success || !result.data) {
    return {
      success: result.success,
      message: result.message,
      code: result.code,
      data: null,
      error: result.error,
    } as ServerActionResponse<CaptainLeaveBalance>;
  }

  return result as ServerActionResponse<CaptainLeaveBalance>;
}

export async function getCaptainLeaves(): Promise<
  ServerActionResponse<CaptainLeaveRequest[]>
> {
  const result = await fetchWithSession<undefined, CaptainLeaveRequest[]>(
    apiGet,
    "/api/service/captain/leaves/"
  );

  if (!result.success || !result.data) {
    return {
      success: result.success,
      message: result.message,
      code: result.code,
      data: null,
      error: result.error,
    } as ServerActionResponse<CaptainLeaveRequest[]>;
  }

  return result as ServerActionResponse<CaptainLeaveRequest[]>;
}

export async function createCaptainLeaveDraft(
  payload: CaptainLeaveDraftRequest
): Promise<ServerActionResponse<CaptainLeaveRequest>> {
  const result = await fetchWithSession<CaptainLeaveDraftRequest, CaptainLeaveRequest>(
    apiPost,
    "/api/service/captain/leaves/",
    payload
  );

  if (!result.success || !result.data) {
    return {
      success: result.success,
      message: result.message,
      code: result.code,
      data: null,
      error: result.error,
    } as ServerActionResponse<CaptainLeaveRequest>;
  }

  return result as ServerActionResponse<CaptainLeaveRequest>;
}

export async function getCaptainLeaveDetail(
  leaveId: number
): Promise<ServerActionResponse<CaptainLeaveRequest>> {
  const result = await fetchWithSession<undefined, CaptainLeaveRequest>(
    apiGet,
    `/api/service/captain/leaves/${leaveId}/`
  );

  if (!result.success || !result.data) {
    return {
      success: result.success,
      message: result.message,
      code: result.code,
      data: null,
      error: result.error,
    } as ServerActionResponse<CaptainLeaveRequest>;
  }

  return result as ServerActionResponse<CaptainLeaveRequest>;
}

export async function submitCaptainLeave(
  leaveId: number
): Promise<ServerActionResponse<CaptainLeaveRequest>> {
  const result = await fetchWithSession<Record<string, never>, CaptainLeaveRequest>(
    apiPost,
    `/api/service/captain/leaves/${leaveId}/submit/`,
    {}
  );

  if (!result.success || !result.data) {
    return {
      success: result.success,
      message: result.message,
      code: result.code,
      data: null,
      error: result.error,
    } as ServerActionResponse<CaptainLeaveRequest>;
  }

  return result as ServerActionResponse<CaptainLeaveRequest>;
}

export async function withdrawCaptainLeave(
  leaveId: number
): Promise<ServerActionResponse<CaptainLeaveRequest>> {
  const result = await fetchWithSession<Record<string, never>, CaptainLeaveRequest>(
    apiPost,
    `/api/service/captain/leaves/${leaveId}/withdraw/`,
    {}
  );

  if (!result.success || !result.data) {
    return {
      success: result.success,
      message: result.message,
      code: result.code,
      data: null,
      error: result.error,
    } as ServerActionResponse<CaptainLeaveRequest>;
  }

  return result as ServerActionResponse<CaptainLeaveRequest>;
}

export async function getCaptainTimesheet(
  filters: CaptainTimesheetFilters = {}
): Promise<ServerActionResponse<CaptainTimesheet>> {
  const search = new URLSearchParams();
  if (filters.startDate) {
    search.set("start_date", filters.startDate);
  }
  if (filters.endDate) {
    search.set("end_date", filters.endDate);
  }

  const endpoint = `/api/service/captain/timesheet/${
    search.toString() ? `?${search.toString()}` : ""
  }`;
  const result = await fetchWithSession<undefined, CaptainTimesheet>(
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
    } as ServerActionResponse<CaptainTimesheet>;
  }

  return result as ServerActionResponse<CaptainTimesheet>;
}
