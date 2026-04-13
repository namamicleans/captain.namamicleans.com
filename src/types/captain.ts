export type CaptainMaterialUnit =
  | "pieces"
  | "liters"
  | "milliliters"
  | "kilograms"
  | "grams";

export interface CaptainMaterial {
  id: number;
  name: string;
  unit: CaptainMaterialUnit;
  isRequired: boolean;
  minimumQuantity: number;
  description: string | null;
  isActive: boolean;
}

export interface CaptainShiftMaterialSnapshot {
  id: number;
  materialId: number;
  material: CaptainMaterial;
  quantityReported: number;
  unit: CaptainMaterialUnit;
  isMissing: boolean;
  recordedAt: string;
}

export type CaptainShiftStatus = "pending" | "checked_in" | "checked_out";

export interface CaptainShiftLog {
  id: number;
  captainId: number;
  captainLabel: string | null;
  shiftDate: string;
  selfieUrl: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  startOdometer: number | null;
  endOdometer: number | null;
  notes: string | null;
  status: CaptainShiftStatus;
  metadata: Record<string, unknown> | null;
  materials: CaptainShiftMaterialSnapshot[];
  createdAt: string;
  updatedAt: string;
}

export interface CaptainShiftSummary {
  shiftDate: string;
  captainId: number;
  captainLabel: string | null;
  shift: CaptainShiftLog | null;
  materials: CaptainMaterial[];
}

export interface CaptainCheckInMaterialInput {
  material_id: number;
  quantity_reported: number;
  is_missing?: boolean;
}

export interface CaptainCheckInRequest {
  selfie: string;
  start_odometer?: number | null;
  materials: CaptainCheckInMaterialInput[];
  metadata: Record<string, unknown>;
  shiftDate?: string;
}

export interface CaptainCheckOutRequest {
  endOdometer: number;
  notes?: string;
  metadata?: Record<string, unknown>;
  shiftDate?: string;
}

export interface CaptainExecutionChecklistTemplateItem {
  id: string;
  label: string;
  description: string | null;
  required: boolean;
}

export interface CaptainJobExecutionChecklistItem {
  id: string;
  label: string;
  required: boolean;
  completed: boolean;
}

export interface CaptainJobExecutionImage {
  id: string;
  url: string | null;
}

export interface CaptainJobExecution {
  checklist_template: CaptainExecutionChecklistTemplateItem[];
  checklist_data: CaptainJobExecutionChecklistItem[];
  before_images: CaptainJobExecutionImage[];
  after_images: CaptainJobExecutionImage[];
  before_image_urls: string[];
  after_image_urls: string[];
  captain_notes: string | null;
  captain_rating_for_customer: number | null;
  started_at: string | null;
}

export interface CaptainCompleteJobExecutionRequest {
  beforeImages: string[];
  afterImages: string[];
  checklist: CaptainJobExecutionChecklistItem[];
  captainRatingForCustomer?: number;
  captainNotes?: string;
  summary?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export type CaptainLeaveStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "withdrawn"
  | "cancelled";

export interface CaptainLeaveRequest {
  id: number;
  request_code: string;
  start_date: string;
  end_date: string;
  status: CaptainLeaveStatus;
  leave_units: number;
  reason: string | null;
}

export interface CaptainLeaveBalance {
  available_units: number;
  pending_units: number;
  used_units: number;
}

export interface CaptainLeaveDraftRequest {
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  leave_units?: string;
  reason?: string;
  manager_note?: string;
}

export interface CaptainTimesheet {
  shifts: Array<{
    shiftDate: string;
    checkInTime: string | null;
    checkOutTime: string | null;
  }>;
  leave_requests: Array<{
    id: number;
    start_date: string;
    end_date: string;
    status: CaptainLeaveStatus;
  }>;
}

export interface Captain {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
  rating: number;
  totalJobs: number;
  joinedDate: string;
}

export interface CaptainJobFilters {
  startDate?: string;
  endDate?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface Job {
  id: string;
  serviceType: string;
  serviceName: string;
  serviceIcon: string;
  customerName: string;
  customerPhone: string;
  address: string;
  location: { lat: number; lng: number };
  scheduledTime: string;
  estimatedDuration: number;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'cod';
  paymentAmount: number;
  distance?: number; // km from current location
  beforeImages: string[];
  afterImages: string[];
  completedSteps: string[];
  startedAt?: string;
  completedAt?: string;
  notes?: string;
}

export interface Earnings {
  today: number;
  thisWeek: number;
  thisMonth: number;
  totalJobs: number;
  incentives: number;
  deductions: number;
}

export interface FuelEntry {
  date: string;
  opening: number;
  closing: number;
  distanceTraveled: number;
}

