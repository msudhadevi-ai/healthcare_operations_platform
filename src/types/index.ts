export type Role = "ADMIN" | "DOCTOR" | "RECEPTIONIST" | "PHARMACIST";

export type VisitStatus = "CHECKED_IN" | "WITH_DOCTOR" | "DISCHARGED" | "CANCELLED";

export type PaymentStatus = "PENDING" | "PARTIAL" | "PAID";

export type BillingCategory = "CONSULTATION" | "MEDICINE" | "PROCEDURE" | "TEST" | "OTHER";

export type AuditAction =
  | "CREATE"
  | "READ"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "EXPORT"
  | "UPLOAD";

export interface JwtPayload {
  userId: string;
  clinicId: string;
  role: Role;
  email: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
