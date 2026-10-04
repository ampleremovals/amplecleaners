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
import { formatCurrency } from "@/lib/utils";
import { SERVICE_LABELS, type ServiceType, type BookingStatus } from "@/types";

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
const COLUMNS: { key: string; title: string; statuses: BookingStatus[]; dropStatus: BookingStatus }[] = [
  { key: "new", title: "New Leads", statuses: ["inquiry", "called", "not_called", "answered", "not_answered"], dropStatus: "answered" },
  { key: "quoted", title: "Quote Sent", statuses: ["quote_sent", "deposit_invoice_sent"], dropStatus: "quote_sent" },
  { key: "confirmed", title: "Confirmed", statuses: ["booking_confirmed", "cleaner_assigned"], dropStatus: "booking_confirmed" },
  { key: "in_progress", title: "In Progress", statuses: ["in_progress"], dropStatus: "in_progress" },
  { key: "completed", title: "Completed", statuses: ["job_completed", "invoice_sent", "paid"], dropStatus: "job_completed" },
  { key: "lost", title: "Lost", statuses: ["bad_lead", "not_a_good_fit", "cancelled"], dropStatus: "cancelled" },
];

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
      className={`mb-2 cursor-grab rounded-xl border border-slate-200 bg-white p-3 shadow-sm active:cursor-grabbing ${isDragging ? "opacity-40" : ""}`}
    >
      <Link href={`/admin/bookings/${booking.id}`} className="block" onClick={(e) => isDragging && e.preventDefault()}>
        <p className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
          {customer?.full_name ?? "Unknown"}
          {booking.is_flagged && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-label="Needs attention" />}
          {booking.parent_booking_id && <Repeat className="h-3.5 w-3.5 shrink-0 text-brand-sky-600" aria-label="Recurring visit" />}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">{SERVICE_LABELS[booking.service_type]} · {booking.reference}</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {booking.is_flexible_date ? "Flexible" : booking.clean_date ? new Date(booking.clean_date).toLocaleDateString("en-GB") : "No date"}
          </span>
          {booking.quote_total != null && <span className="text-xs font-bold text-brand-green-700">{formatCurrency(booking.quote_total)}</span>}
        </div>
        {cleaner && <p className="mt-1 text-xs text-brand-sky-700">👤 {cleaner.full_name}</p>}
      </Link>
    </div>
  );
}

function Column({ col, bookings }: { col: (typeof COLUMNS)[number]; bookings: BoardBooking[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-2xl border ${isOver ? "border-brand-green-400 bg-brand-green-50/50" : "border-slate-200 bg-slate-50"} p-3`}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="text-sm font-bold text-slate-700">{col.title}</h3>
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">{bookings.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {bookings.map((b) => <Card key={b.id} booking={b} />)}
        {bookings.length === 0 && <p className="px-1 py-6 text-center text-xs text-slate-400">No bookings</p>}
      </div>
    </div>
  );
}

export default function BookingsBoardPage() {
  const [bookings, setBookings] = useState<BoardBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<{ booking: BoardBooking; target: (typeof COLUMNS)[number] } | null>(null);
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

  async function moveBooking(booking: BoardBooking, targetCol: (typeof COLUMNS)[number]) {
    const prevStatus = booking.status;
    setBookings((prev) => prev.map((b) => (b.id === booking.id ? { ...b, status: targetCol.dropStatus } : b)));

    const res = await fetch(`/api/admin/bookings/${booking.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: targetCol.dropStatus }),
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

  return (
    <div className="flex h-screen flex-col p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900">Bookings</h1>
          <p className="mt-1 text-sm text-slate-500">Drag a card to move it through the pipeline.</p>
        </div>
        <Link href="/admin/bookings/new" className="flex shrink-0 items-center gap-2 rounded-xl bg-brand-green-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-green-800"><Plus className="h-4 w-4" /> New booking</Link>
      </div>

      {loading ? (
        <div className="mt-6"><TableSkeleton rows={5} cols={4} /></div>
      ) : loadError ? (
        <div className="mt-6"><ErrorState message={loadError} onRetry={() => { setLoading(true); load(); }} /></div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="mt-6 flex flex-1 gap-4 overflow-x-auto pb-4">
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
        onConfirm={async () => { if (!pendingMove) return; setMoving(true); await moveBooking(pendingMove.booking, pendingMove.target); setMoving(false); setPendingMove(null); }}
      />
    </div>
  );
}
