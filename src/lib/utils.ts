import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a sequential patient code for the clinic.
 * Format: PT-00001
 * Uses the current count of patients to generate the next code.
 */
export function generatePatientCode(count: number): string {
  return `PT-${String(count + 1).padStart(5, "0")}`;
}

export function formatCurrency(amount: number | string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(amount));
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function getBadgeVariantForVisitStatus(status: string) {
  switch (status) {
    case "CHECKED_IN":
      return "default";
    case "WITH_DOCTOR":
      return "secondary";
    case "DISCHARGED":
      return "outline";
    case "CANCELLED":
      return "destructive";
    default:
      return "default";
  }
}
