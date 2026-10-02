import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ServiceType } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Per-service reference prefixes. */
const SERVICE_PREFIX: Record<ServiceType, string> = {
  regular_cleaning: "REG",
  deep_cleaning: "DEE",
  end_of_tenancy: "EOT",
  office_cleaning: "OFC",
  after_builders: "ABU",
};

const ALPHANUMERIC = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars

function randomSuffix(length = 5): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHANUMERIC[Math.floor(Math.random() * ALPHANUMERIC.length)];
  }
  return out;
}

/** Short, URL-safe code for the customer "pay" link (/pay/<code>). */
export function generatePayCode(length = 8): string {
  return randomSuffix(length);
}

/** Human-friendly booking reference, e.g. `REG-2026-7F4QK`. */
export function generateBookingReference(serviceType: ServiceType): string {
  const prefix = SERVICE_PREFIX[serviceType] ?? "BKG";
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${randomSuffix(5)}`;
}

/** Invoice number, e.g. `INV-2026-7F4QK`. */
export function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  return `INV-${year}-${randomSuffix(5)}`;
}

/**
 * Format a numeric amount as GBP currency, e.g. `£1,250.00`.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

/** Normalise a UK phone number to E.164 format (+44XXXXXXXXXX). */
export function normaliseUKPhone(phone: string): string {
  const stripped = phone.replace(/[\s\-().]/g, "");
  if (stripped.startsWith("+44")) return stripped;
  if (stripped.startsWith("0")) return "+44" + stripped.slice(1);
  return stripped;
}

/** Format a date as `DD/MM/YYYY` (UK style). */
export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Serialise a picked Date to a plain calendar date `YYYY-MM-DD` using its
 * LOCAL components — never `toISOString()`, which shifts BST dates back a day.
 */
export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
