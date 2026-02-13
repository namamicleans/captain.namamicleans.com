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

