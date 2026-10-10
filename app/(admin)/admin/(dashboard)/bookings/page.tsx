"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { toast } from "sonner";
import { AlertTriangle, Plus, Repeat } from "lucide-react";
import { TableSkeleton, ErrorState } from "@/components/admin/DataState";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { LOST_REASONS } from "@/lib/lost-reasons";
import { AdminHero, AdminPage, HERO_BTN } from "@/components/admin/kit";
import { Avatar } from "@/components/admin/ui";
import { formatCurrency } from "@/lib/utils";
import { SERVICE_LABELS, type ServiceType, type BookingStatus } from "@/types";
import { PIPELINE_STAGES, type PipelineStage } from "@/lib/pipeline";

interface BoardBooking {
  id: string;
  reference: string;
  service_type: ServiceType;
  status: BookingStatus;
  clean_date: string | null;
  is_flexible_date: boolean;
  quote_total: number | null;
  is_flagged: boolean;
  parent_booking_id: string | null;
  customer: { full_name: string } | { full_name: string }[] | null;
  cleaner: { full_name: string } | { full_name: string }[] | null;
}

/** Pipeline columns — groups the 16 granular statuses into usable lanes.
 *  Dropping a card into a column sets its status to that column's
 *  `dropStatus` (the first/representative status for that stage). */
const DROP_STATUS: Record<PipelineStage["key"], BookingStatus> = {
  new: "answered", quoted: "quote_sent", confirmed: "booking_confirmed", in_progress: "in_progress", completed: "job_completed", lost: "cancelled",
};
const COLUMNS = PIPELINE_STAGES.map((s) => ({ ...s, dropStatus: DROP_STATUS[s.key] }));

function oneOf<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function Card({ booking }: { booking: BoardBooking }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: booking.id });
  const customer = oneOf(booking.customer);
  const cleaner = oneOf(booking.cleaner);
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={`mb-2.5 cursor-grab rounded-xl border border-slate-200 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-shadow hover:shadow-md active:cursor-grabbing ${isDragging ? "opacity-40" : ""}`}
    >
      <Link href={`/admin/bookings/${booking.id}`} className="block" onClick={(e) => isDragging && e.preventDefault()}>
        <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
          <span className="truncate">{customer?.full_name ?? "Unknown"}</span>
          {booking.is_flagged && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-label="Needs attention" />}
          {booking.parent_booking_id && <Repeat className="h-3.5 w-3.5 shrink-0 text-sky-600" aria-label="Recurring visit" />}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-500">
          {SERVICE_LABELS[booking.service_type]}
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">{booking.reference}</span>
        </p>
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-slate-600">
            {cleaner ? <><Avatar name={cleaner.full_name} size={20} /><span className="truncate">{cleaner.full_name}</span></> : <span className="text-slate-400">No cleaner</span>}
          </span>
          <span className="shrink-0 text-right text-xs">
            <span className="block text-slate-500">{booking.is_flexible_date ? "Flexible" : booking.clean_date ? new Date(booking.clean_date).toLocaleDateString("en-GB") : "No date"}</span>
            {booking.quote_total != null && <span className="block font-semibold tabular-nums text-slate-900">{formatCurrency(booking.quote_total)}</span>}
          </span>
        </div>
      </Link>
    </div>
  );
}

const STAGE_ACCENT: Record<PipelineStage["key"], string> = {
  new: "bg-slate-400", quoted: "bg-sky-500", confirmed: "bg-emerald-500", in_progress: "bg-amber-500", completed: "bg-slate-800", lost: "bg-red-400",
};

function Column({ col, bookings }: { col: (typeof COLUMNS)[number]; bookings: BoardBooking[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  return (
    <div
      ref={setNodeRef}
      className={`flex max-h-[68vh] w-72 shrink-0 flex-col overflow-hidden rounded-2xl border transition-colors ${isOver ? "border-brand-green-400 bg-brand-green-50/60" : "border-slate-200 bg-slate-100/60"}`}
    >
      <div className={`h-1 shrink-0 ${STAGE_ACCENT[col.key]}`} aria-hidden />
      <div className="flex shrink-0 items-center justify-between px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-800">{col.title}</h3>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600 shadow-sm ring-1 ring-slate-200">{bookings.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {bookings.map((b) => <Card key={b.id} booking={b} />)}
        {bookings.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 px-2 py-8 text-center text-xs text-slate-400">Drop a booking here</p>}
      </div>
    </div>
  );
}

export default function BookingsBoardPage() {
  const [bookings, setBookings] = useState<BoardBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<{ booking: BoardBooking; target: (typeof COLUMNS)[number] } | null>(null);
  const [lostReason, setLostReason] = useState<string>("");
  const [moving, setMoving] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const d = await fetch("/api/admin/bookings").then((r) => r.json());
      if (d.success) setBookings(d.bookings); else setLoadError(d.error ?? "Couldn't load bookings.");
    } catch {
      setLoadError("Network error — check your connection.");
    }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const byColumn = useMemo(() => {
    const map = new Map<string, BoardBooking[]>();
    for (const col of COLUMNS) map.set(col.key, []);
    for (const b of bookings) {
      const col = COLUMNS.find((c) => c.statuses.includes(b.status));
      if (col) map.get(col.key)!.push(b);
    }
    return map;
  }, [bookings]);

  const activeBooking = bookings.find((b) => b.id === activeId) ?? null;

  function handleDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as string);
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const booking = bookings.find((b) => b.id === active.id);
    const targetCol = COLUMNS.find((c) => c.key === over.id);
    if (!booking || !targetCol || targetCol.statuses.includes(booking.status)) return;

    // Completing a job bills the customer and cancelling stops a series, so ask first.
    if (targetCol.key === "completed" || targetCol.key === "lost") {
      setPendingMove({ booking, target: targetCol });
      return;
    }
    await moveBooking(booking, targetCol);
  }

  async function moveBooking(booking: BoardBooking, targetCol: (typeof COLUMNS)[number], reason?: string) {
    const prevStatus = booking.status;
    setBookings((prev) => prev.map((b) => (b.id === booking.id ? { ...b, status: targetCol.dropStatus } : b)));

    const res = await fetch(`/api/admin/bookings/${booking.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: targetCol.dropStatus, ...(reason ? { reason } : {}) }),
    });
    if (!res.ok) {
      setBookings((prev) => prev.map((b) => (b.id === booking.id ? { ...b, status: prevStatus } : b)));
      toast.error("Couldn't move booking — try again");
      return;
    }
    const json = await res.json().catch(() => ({}));
    if (json.invoiced) toast.success("Moved — the customer has been invoiced automatically");
    if (json.cancelledVisits > 0) toast.success(`${json.cancelledVisits} future recurring visit${json.cancelledVisits === 1 ? "" : "s"} cancelled`);
    if (targetCol.key === "confirmed") load();
  }

  const count = (key: PipelineStage["key"]) => (byColumn.get(key) ?? []).length;
  const flagged = bookings.filter((b) => b.is_flagged).length;

  return (
    <AdminPage>
      <AdminHero
        eyebrow="Operations"
        title="Bookings"
        description="Drag a card to move it through the pipeline. Completing a job invoices the customer automatically."
        actions={<Link href="/admin/bookings/new" className={HERO_BTN.primary}><Plus className="h-4 w-4" /> New booking</Link>}
        stats={loading || loadError ? undefined : [
          { label: "New leads", value: count("new"), hint: count("new") ? "Waiting for a quote" : "None waiting" },
          { label: "Quote sent", value: count("quoted"), hint: "Waiting for the deposit" },
          { label: "Confirmed", value: count("confirmed"), hint: "Dated and paid for" },
          { label: "Needs attention", value: flagged, hint: flagged ? "Flagged by automation" : "All clear", tone: flagged ? "warning" : "positive" },
        ]}
      />

      {loading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={() => { setLoading(true); load(); }} />
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 sm:-mx-8 sm:px-8">
            {COLUMNS.map((col) => (
              <Column key={col.key} col={col} bookings={byColumn.get(col.key) ?? []} />
            ))}
          </div>
          <DragOverlay>{activeBooking ? <Card booking={activeBooking} /> : null}</DragOverlay>
        </DndContext>
      )}

      <ConfirmDialog
        open={!!pendingMove}
        onOpenChange={(o) => !o && setPendingMove(null)}
        title={pendingMove?.target.key === "completed" ? "Mark this job as completed?" : "Move this booking to Lost?"}
        description={pendingMove?.target.key === "completed" ? "The customer is invoiced and messaged automatically (email, SMS and WhatsApp). Cleaners normally trigger this by clocking out." : "The booking is cancelled. If it's a recurring series, its future visits are cancelled too."}
        confirmLabel={pendingMove?.target.key === "completed" ? "Complete & invoice" : "Move to Lost"}
        busy={moving}
        onConfirm={async () => { if (!pendingMove) return; setMoving(true); await moveBooking(pendingMove.booking, pendingMove.target, pendingMove.target.key === "lost" ? lostReason || undefined : undefined); setMoving(false); setPendingMove(null); setLostReason(""); }}
      >
        {pendingMove?.target.key === "lost" && (
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-medium text-slate-700">Why was it lost? <span className="font-normal text-slate-500">(optional, but it shows in Automations → Results)</span></legend>
            <div className="flex flex-wrap gap-2">
              {LOST_REASONS.map((r) => (
                <button key={r} type="button" aria-pressed={lostReason === r} onClick={() => setLostReason(lostReason === r ? "" : r)} className={`rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors ${lostReason === r ? "border-brand-green-700 bg-brand-green-50 text-brand-green-900" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}>{r}</button>
              ))}
            </div>
          </fieldset>
        )}
      </ConfirmDialog>
    </AdminPage>
  );
}
