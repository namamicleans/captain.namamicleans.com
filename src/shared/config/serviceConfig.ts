// Config-driven service definitions - easily extendable from backend
import { 
  Car, Sofa, Home, Droplets, Sparkles, SprayCan, 
  Brush, Wind, Gauge, ShieldCheck, Package, FlaskConical,
  Shirt, Waves, Lightbulb, Wrench
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';

export interface ServiceStep {
  id: string;
  title: string;
  instruction: string;
  icon?: string;
  iconName?: string;
  imageUrl?: string;
  videoUrl?: string;
  required: boolean;
}

export interface ServiceConfig {
  id: string;
  name: string;
  iconName: string;
  minBeforeImages: number;
  maxBeforeImages: number;
  minAfterImages: number;
  maxAfterImages: number;
  steps: ServiceStep[];
  estimatedDuration: number; // in minutes
}

export interface MaterialItem {
  id: string;
  name: string;
  iconName: string;
  required: boolean;
  hasQuantity?: boolean;
  unit?: string;
  minQuantity?: number;
  maxQuantity?: number;
}

// Icon mapping for dynamic icon rendering
export const iconMap: Record<string, LucideIcon> = {
  Car,
  Sofa,
  Home,
  Droplets,
  Sparkles,
  SprayCan,
  Brush,
  Wind,
  Gauge,
  ShieldCheck,
  Package,
  FlaskConical,
  Shirt,
  Waves,
  Lightbulb,
  Wrench,
};

// Configurable materials checklist
export const materialsChecklist: MaterialItem[] = [
  { id: "1", name: "Shampoo Machine", iconName: "SprayCan", required: true },
  { id: "2", name: "Vacuum Cleaner", iconName: "Wind", required: true },
  { id: "3", name: "Cleaning Liquid", iconName: "FlaskConical", required: true, hasQuantity: true, unit: "L", minQuantity: 0.5, maxQuantity: 10 },
  { id: "4", name: "Microfiber Cloth", iconName: "Shirt", required: true, hasQuantity: true, unit: "pcs", minQuantity: 1, maxQuantity: 20 },
  { id: "5", name: "Pressure Washer", iconName: "Waves", required: false },
  { id: "6", name: "Drying Towels", iconName: "Shirt", required: true, hasQuantity: true, unit: "pcs", minQuantity: 1, maxQuantity: 10 },
  { id: "7", name: "Gloves & Mask", iconName: "ShieldCheck", required: true },
  { id: "8", name: "Car Foam", iconName: "Sparkles", required: true, hasQuantity: true, unit: "L", minQuantity: 0.5, maxQuantity: 5 },
];

// Service configurations - can be fetched from backend
export const serviceConfigs: Record<string, ServiceConfig> = {
  car_wash: {
    id: "car_wash",
    name: "Car Wash & Detailing",
    iconName: "Car",
    minBeforeImages: 2,
    maxBeforeImages: 4,
    minAfterImages: 2,
    maxAfterImages: 4,
    estimatedDuration: 45,
    steps: [
      { 
        id: "1", 
        title: "Pre-rinse", 
        instruction: "Rinse the entire vehicle with water to remove loose dirt and debris. Start from the top and work your way down.", 
        iconName: "Droplets",
        imageUrl: "https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=400",
        required: true 
      },
      { 
        id: "2", 
        title: "Foam Application", 
        instruction: "Apply foam wash solution evenly across all surfaces. Use the snow foam cannon for best coverage.", 
        iconName: "Sparkles",
        imageUrl: "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=400",
        required: true 
      },
      { 
        id: "3", 
        title: "Scrubbing", 
        instruction: "Scrub all surfaces with appropriate brushes and mitts. Use gentle circular motions to avoid scratches.", 
        iconName: "Brush",
        required: true 
      },
      { 
        id: "4", 
        title: "Pressure Rinse", 
        instruction: "Rinse off all soap using pressure washer. Ensure no soap residue remains.", 
        iconName: "Waves",
        required: true 
      },
      { 
        id: "5", 
        title: "Interior Cleaning", 
        instruction: "Vacuum interior thoroughly, clean dashboard and all surfaces with appropriate cleaners.", 
        iconName: "Wind",
        required: true 
      },
      { 
        id: "6", 
        title: "Drying", 
        instruction: "Dry exterior completely using microfiber towels. Pay special attention to mirrors and door handles.", 
        iconName: "Shirt",
        required: true 
      },
      { 
        id: "7", 
        title: "Final Inspection", 
        instruction: "Inspect for missed spots and ensure quality. Check all windows, mirrors, and body panels.", 
        iconName: "ShieldCheck",
        required: true 
      },
    ],
  },
  sofa_cleaning: {
    id: "sofa_cleaning",
    name: "Sofa Deep Cleaning",
    iconName: "Sofa",
    minBeforeImages: 2,
    maxBeforeImages: 3,
    minAfterImages: 2,
    maxAfterImages: 3,
    estimatedDuration: 60,
    steps: [
      { 
        id: "1", 
        title: "Dust Removal", 
        instruction: "Vacuum all surfaces to remove loose dust and debris. Use upholstery attachment.", 
        iconName: "Wind",
        required: true 
      },
      { 
        id: "2", 
        title: "Stain Pre-treatment", 
        instruction: "Identify and pre-treat visible stains with appropriate stain remover.", 
        iconName: "SprayCan",
        required: true 
      },
      { 
        id: "3", 
        title: "Shampoo Application", 
        instruction: "Apply cleaning shampoo evenly across the fabric.", 
        iconName: "Sparkles",
        required: true 
      },
      { 
        id: "4", 
        title: "Deep Scrubbing", 
        instruction: "Scrub fabric with appropriate brush using gentle motions.", 
        iconName: "Brush",
        required: true 
      },
      { 
        id: "5", 
        title: "Extraction", 
        instruction: "Extract dirt and moisture using extraction machine.", 
        iconName: "Droplets",
        required: true 
      },
      { 
        id: "6", 
        title: "Sanitization", 
        instruction: "Apply sanitizer spray for hygiene and fresh smell.", 
        iconName: "ShieldCheck",
        required: true 
      },
      { 
        id: "7", 
        title: "Drying Setup", 
        instruction: "Set up drying equipment if needed. Inform customer about drying time.", 
        iconName: "Wind",
        required: false 
      },
    ],
  },
  home_cleaning: {
    id: "home_cleaning",
    name: "Home Deep Cleaning",
    iconName: "Home",
    minBeforeImages: 3,
    maxBeforeImages: 5,
    minAfterImages: 3,
    maxAfterImages: 5,
    estimatedDuration: 120,
    steps: [
      { 
        id: "1", 
        title: "Declutter", 
        instruction: "Help organize and declutter the space for effective cleaning.", 
        iconName: "Package",
        required: true 
      },
      { 
        id: "2", 
        title: "Dusting", 
        instruction: "Dust all surfaces including fans, light fixtures, and furniture.", 
        iconName: "Wind",
        required: true 
      },
      { 
        id: "3", 
        title: "Floor Cleaning", 
        instruction: "Sweep and mop all floor areas using appropriate cleaners.", 
        iconName: "Sparkles",
        required: true 
      },
      { 
        id: "4", 
        title: "Bathroom Cleaning", 
        instruction: "Deep clean bathroom fixtures, tiles, and sanitize surfaces.", 
        iconName: "Droplets",
        required: true 
      },
      { 
        id: "5", 
        title: "Kitchen Cleaning", 
        instruction: "Clean kitchen surfaces, appliances, and degrease stovetop.", 
        iconName: "Lightbulb",
        required: true 
      },
      { 
        id: "6", 
        title: "Window Cleaning", 
        instruction: "Clean windows and glass surfaces inside.", 
        iconName: "Sparkles",
        required: false 
      },
      { 
        id: "7", 
        title: "Final Walkthrough", 
        instruction: "Inspect all areas with customer and address any concerns.", 
        iconName: "ShieldCheck",
        required: true 
      },
    ],
  },
};

// App configuration
export const appConfig = {
  checkInRadius: 100, // meters - captain must be within this radius of office
  jobStartRadius: 500, // meters - captain must be within this radius to start job
  maxOdometerReading: 999999, // maximum odometer reading
  workHoursStart: 7, // 7 AM
  workHoursEnd: 21, // 9 PM
};
