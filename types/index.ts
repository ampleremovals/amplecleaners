/**
 * Core types for Ample Cleaners. ALL TypeScript interfaces live here, same
 * convention as Ample Removals.
 */

export type ServiceType =
  | "regular_cleaning"
  | "deep_cleaning"
  | "end_of_tenancy"
  | "office_cleaning"
  | "after_builders";

export const SERVICE_LABELS: Record<ServiceType, string> = {
  regular_cleaning: "Regular Cleaning",
  deep_cleaning: "Deep Cleaning",
  end_of_tenancy: "End of Tenancy Cleaning",
  office_cleaning: "Office Cleaning",
  after_builders: "After Builders Cleaning",
};

/** Recurring frequency — only meaningful for `regular_cleaning`. */
export type CleaningFrequency = "one_off" | "weekly" | "fortnightly" | "monthly";

/**
 * Booking status pipeline (mirrors the lessons already learned on Ample
 * Removals — no "processing"/"pending" limbo statuses; every step is a real,
 * distinct, unambiguous state):
 *
 *   inquiry → called | not_called → answered | not_answered
 *   → quote_sent → deposit_invoice_sent → booking_confirmed
 *   → cleaner_assigned → in_progress → job_completed
 *   → invoice_sent → paid
 *
 *   Side exits: bad_lead | not_a_good_fit | cancelled
 *
 * `deposit_invoice_sent` is skipped entirely for jobs that don't require a
 * deposit (most regular/recurring cleans) — those go quote_sent →
 * booking_confirmed directly once the customer accepts.
 */
export type BookingStatus =
  | "inquiry"
  | "called"
  | "not_called"
  | "answered"
  | "not_answered"
  | "quote_sent"
  | "deposit_invoice_sent"
  | "booking_confirmed"
  | "cleaner_assigned"
  | "in_progress"
  | "job_completed"
  | "invoice_sent"
  | "paid"
  | "bad_lead"
  | "not_a_good_fit"
  | "cancelled";

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  inquiry: "Inquiry",
  called: "Called",
  not_called: "Not Called",
  answered: "Answered",
  not_answered: "Not Answered",
  quote_sent: "Quote Sent",
  deposit_invoice_sent: "Deposit Invoice Sent",
  booking_confirmed: "Booking Confirmed",
  cleaner_assigned: "Cleaner Assigned",
  in_progress: "In Progress",
  job_completed: "Job Completed",
  invoice_sent: "Invoice Sent",
  paid: "Paid",
  bad_lead: "Bad Lead",
  not_a_good_fit: "Not a Good Fit",
  cancelled: "Cancelled",
};

export type PropertyType = "flat" | "house" | "studio" | "office" | "other";

export interface AddressOption {
  line_1: string;
  line_2?: string;
  city?: string;
  postcode: string;
}

export interface PostcodeResult {
  postcode: string;
  addresses: AddressOption[];
}

export interface Customer {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  created_at: string;
}

export interface CleaningTask {
  key: string;
  label: string;
  /** Room/area this task belongs to, e.g. "Kitchen", "Bathroom". */
  area: string;
  done: boolean;
}

export interface QuoteLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Booking {
  id: string;
  reference: string;
  service_type: ServiceType;
  status: BookingStatus;
  customer_id: string;
  address_id: string | null;
  property_type: PropertyType | null;
  bedrooms: number | null;
  bathrooms: number | null;
  frequency: CleaningFrequency | null;
  clean_date: string | null;
  is_flexible_date: boolean;
  description: string | null;
  quote_line_items: QuoteLineItem[] | null;
  quote_total: number | null;
  deposit_amount: number | null;
  deposit_percentage: number;
  deposit_status: "unpaid" | "claimed" | "verified";
  assigned_cleaner_id: string | null;
  tasks: CleaningTask[] | null;
  before_photos: string[] | null;
  after_photos: string[] | null;
  created_at: string;
  source: string | null;
}

export interface Cleaner {
  id: string;
  auth_user_id: string | null;
  full_name: string;
  email: string;
  phone: string;
  is_active: boolean;
  dbs_check_url: string | null;
  dbs_verified: boolean;
  rating_avg: number | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  booking_id: string;
  customer_id: string;
  type: "deposit" | "full_balance" | "recurring";
  status: "draft" | "sent" | "paid" | "cancelled";
  line_items: QuoteLineItem[];
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
  due_date: string;
  pay_code: string | null;
  created_at: string;
}
