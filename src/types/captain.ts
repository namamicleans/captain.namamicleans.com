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

export interface CaptainExecutionChecklistItem {
  id: string;
  label: string;
  required: boolean;
  completed: boolean;
}

export interface CaptainExecutionChecklistTemplateItem {
  id: string;
  label: string;
  description?: string | null;
  required: boolean;
  order: number;
}

export interface CaptainBookingExecutionStartRequest {
  metadata?: Record<string, unknown>;
}

export interface CaptainBookingExecutionCompleteRequest {
  beforeImages: string[];
  afterImages: string[];
  checklist: CaptainExecutionChecklistItem[];
  captainRatingForCustomer: number;
  captainNotes?: string;
  summary?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface CaptainBookingExecutionGalleryImage {
  id: number;
  url: string | null;
  stage: "before" | "after";
  order: number;
  caption: string | null;
  alt_text: string | null;
}

export interface CaptainBookingExecutionFeedback {
  id: number;
  rated_by: string;
  rating: number;
  comments: string | null;
  created_at: string;
  updated_at: string;
}

export interface CaptainBookingExecutionDetail {
  booking_id: string;
  booking_status: string;
  scheduled_date: string;
  scheduled_time: string;
  started_at: string | null;
  completed_at: string | null;
  checklist_template: CaptainExecutionChecklistTemplateItem[];
  checklist_data: CaptainExecutionChecklistItem[];
  checklist_completed_count: number;
  checklist_total_count: number;
  captain_notes: string | null;
  captain_rating_for_customer: number | null;
  summary_snapshot: Record<string, unknown>;
  metadata: Record<string, unknown>;
  before_images: CaptainBookingExecutionGalleryImage[];
  after_images: CaptainBookingExecutionGalleryImage[];
  before_image_urls: string[];
  after_image_urls: string[];
  feedback: CaptainBookingExecutionFeedback | null;
  created_at: string;
  updated_at: string;
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

