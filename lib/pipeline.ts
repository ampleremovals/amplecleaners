import type { BookingStatus } from "@/types";

/**
 * The 16 granular booking statuses grouped into the stages the team actually thinks in.
 * One definition shared by the bookings board and the dashboard pipeline summary, so the two can never disagree.
 */
export interface PipelineStage {
  key: "new" | "quoted" | "confirmed" | "in_progress" | "completed" | "lost";
  title: string;
  statuses: BookingStatus[];
}

export const PIPELINE_STAGES: PipelineStage[] = [
  { key: "new", title: "New Leads", statuses: ["inquiry", "called", "not_called", "answered", "not_answered"] },
  { key: "quoted", title: "Quote Sent", statuses: ["quote_sent", "deposit_invoice_sent"] },
  { key: "confirmed", title: "Confirmed", statuses: ["booking_confirmed", "cleaner_assigned"] },
  { key: "in_progress", title: "In Progress", statuses: ["in_progress"] },
  { key: "completed", title: "Completed", statuses: ["job_completed", "invoice_sent", "paid"] },
  { key: "lost", title: "Lost", statuses: ["bad_lead", "not_a_good_fit", "cancelled"] },
];

export function stageOf(status: BookingStatus): PipelineStage["key"] {
  return PIPELINE_STAGES.find((s) => s.statuses.includes(status))?.key ?? "new";
}
