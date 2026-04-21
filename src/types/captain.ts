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

export interface CaptainExecutionChecklistTemplateItem {
  id: string;
  label: string;
  description?: string | null;
  required: boolean;
  completed?: boolean;
  order?: number;
}

export interface CaptainExecutionImageItem {
  id: number;
  url: string | null;
  order: number;
}

export interface CaptainJobExecution {
  id: number;
  booking_id: string;
  started_at: string | null;
  completed_at: string | null;
  checklist_data: CaptainExecutionChecklistTemplateItem[];
  checklist_template: CaptainExecutionChecklistTemplateItem[];
  checklist_completed_count: number;
  checklist_total_count: number;
  captain_notes: string | null;
  captain_rating_for_customer: number | null;
  summary_snapshot: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  before_images: CaptainExecutionImageItem[];
  after_images: CaptainExecutionImageItem[];
  before_image_urls: string[];
  after_image_urls: string[];
}

export interface CaptainJobExecutionStartRequest {
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface CaptainJobExecutionChecklistItem {
  id: string;
  label?: string;
  required?: boolean;
  completed: boolean;
}

export interface CaptainJobExecutionCompleteRequest {
  beforeImages: string[];
  afterImages: string[];
  checklist: CaptainJobExecutionChecklistItem[];
  captainRatingForCustomer: number;
  captainNotes?: string;
  summary?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface Job {
  id: string;
  serviceType: string;
  serviceName: string;
  serviceIcon: string;
  quantityDisplay: string;
  quantity: number;
  quantityUnit?: string;
  isQuantityBased: boolean;
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

export interface CaptainLeaveRequest {
  id: number;
  request_code: string;
  captain?: number | null;
  captain_label?: string | null;
  created_by?: number | null;
  created_by_label?: string | null;
  application_mode?: string | null;
  status: string;
  emergency_lock_active: boolean;
  start_date: string;
  end_date: string;
  start_time?: string | null;
  end_time?: string | null;
  leave_units: number;
  reason?: string | null;
  manager_note?: string | null;
  submitted_at?: string | null;
  decision_at?: string | null;
  is_time_bound?: boolean;
  total_days?: number;
  created_at?: string;
  updated_at?: string;
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

export interface CaptainLeaveBalance {
  id: number;
  captain?: number | null;
  captain_label?: string | null;
  total_units: number;
  pending_units: number;
  used_units: number;
  available_units: number;
  created_at?: string;
  updated_at?: string;
}

export interface CaptainTimesheetFilters {
  startDate?: string;
  endDate?: string;
}

export interface CaptainTimesheet {
  start_date: string;
  end_date: string;
  shifts: CaptainShiftLog[];
  leave_requests: CaptainLeaveRequest[];
}

export interface FuelEntry {
  date: string;
  opening: number;
  closing: number;
  distanceTraveled: number;
}

