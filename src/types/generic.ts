import { JWTPayload } from "jose";

export interface StandardApiResponse<Data = unknown> {
  success: boolean;
  message: string;
  code: string;
  data: Data | null;
  error: string | null;
}

export interface PaginationMeta {
  count: number;
  next: string | null;
  previous: string | null;
  page?: number;
  page_size?: number;
  total_pages?: number;
}

export interface ServerActionResponse<Data = unknown> {
  success: boolean;
  message: string;
  code: string;
  data: Data | null;
  error: string | null;
  showToast?: boolean;
  toastType?: "success" | "error" | "warning" | "info";
}

export interface Session extends JWTPayload {
  user: {
    id: number;
    name: string | null;
    email: string | null;
    role: string;
    phone_number: string | null;
    is_active: boolean;
  };
  tokens: {
    access: string;
    refresh: string;
  };
  tokenExpiry?: number;
}
