"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState, LoadingBlock, PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useBusinessType } from "@/hooks/use-business-type";
import { useCustomers } from "@/hooks/use-customers";
import {
  useHotelRooms,
  useRoomBookingMutations,
  useRoomBookings,
} from "@/hooks/use-hotel";
import { BOOKING_STATUS_LABELS, bookingNights, isActiveBookingStatus } from "@/lib/hotel";
import type { RoomBooking, RoomBookingStatus } from "@/lib/types";
import { formatDate, formatINR } from "@/lib/utils";
import { addDays, eachDayOfInterval, format, parseISO, startOfDay } from "date-fns";
import { Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const emptyBooking = {
  room_id: "",
  customer_id: "",
  check_in_date: new Date().toISOString().slice(0, 10),
  check_out_date: addDays(new Date(), 1).toISOString().slice(0, 10),
  status: "booked" as RoomBookingStatus,
  guest_id_proof: "",
  notes: "",
};

export default function BookingsPage() {
  const { isHotel, isLoading: btLoading } = useBusinessType();
  const { data: bookings, isLoading } = useRoomBookings();
  const { data: rooms } = useHotelRooms();
  const { data: customers } = useCustomers();
  const { upsert } = useRoomBookingMutations();
  const { toast } = useToast();

  const [rangeStart, setRangeStart] = useState(() =>
    format(startOfDay(new Date()), "yyyy-MM-dd")
  );
  const [days, setDays] = useState("14");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RoomBooking | null>(null);
  const [form, setForm] = useState(emptyBooking);

  useEffect(() => {
    if (!btLoading && !isHotel) redirect("/dashboard");
  }, [btLoading, isHotel]);

  const calendarDays = useMemo(() => {
    const start = parseISO(rangeStart);
    const end = addDays(start, Math.max(1, Number(days) || 1) - 1);
    return eachDayOfInterval({ start, end });
  }, [rangeStart, days]);

  const activeRooms = useMemo(
    () => (rooms ?? []).filter((r) => r.status !== "out_of_service"),
    [rooms]
  );

  const cellBooked = (roomId: string, dayIso: string) => {
    const next = format(addDays(parseISO(dayIso), 1), "yyyy-MM-dd");
    return (bookings ?? []).find(
      (b) =>
        b.room_id === roomId &&
        isActiveBookingStatus(b.status) &&
        b.check_in_date <= dayIso &&
        b.check_out_date > dayIso
    );
  };

  if (btLoading || !isHotel) return <LoadingBlock />;

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyBooking,
      room_id: activeRooms[0]?.id ?? "",
      customer_id: customers?.[0]?.id ?? "",
    });
    setOpen(true);
  };

  const openEdit = (b: RoomBooking) => {
    setEditing(b);
    setForm({
      room_id: b.room_id,
      customer_id: b.customer_id,
      check_in_date: b.check_in_date,
      check_out_date: b.check_out_date,
      status: b.status,
      guest_id_proof: b.guest_id_proof ?? "",
      notes: b.notes ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.room_id || !form.customer_id) {
      toast("Room and guest are required", "error");
      return;
    }
    try {
      await upsert.mutateAsync({
        id: editing?.id,
        ...form,
        guest_id_proof: form.guest_id_proof || null,
        notes: form.notes || null,
      });
      toast(editing ? "Booking updated" : "Booking created");
      setOpen(false);
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Hotel"
        title="Bookings"
        description="Date-based room availability — not stock inventory"
        actions={
          <Button onClick={openCreate} disabled={!activeRooms.length || !customers?.length}>
            <Plus className="h-4 w-4" /> New booking
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Input
          label="From"
          type="date"
          value={rangeStart}
          onChange={(e) => setRangeStart(e.target.value)}
          className="w-auto"
        />
        <Input
          label="Days"
          type="number"
          min={7}
          max={31}
          value={days}
          onChange={(e) => setDays(e.target.value)}
          onBlur={() => {
            const parsed = Number(days);
            setDays(String(Math.min(31, Math.max(7, Number.isFinite(parsed) ? parsed : 14))));
          }}
          className="w-24"
        />
        {!customers?.length ? (
          <p className="text-xs text-slate">
            Add a <Link className="text-primary underline" href="/customers">guest/customer</Link>{" "}
            first.
          </p>
        ) : null}
        {!activeRooms.length ? (
          <p className="text-xs text-slate">
            Add rooms under{" "}
            <Link className="text-primary underline" href="/room-types">
              Room Types
            </Link>{" "}
            first.
          </p>
        ) : null}
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : !activeRooms.length ? (
        <EmptyState title="No rooms" description="Create a room type and add room numbers." />
      ) : (
        <div className="panel overflow-x-auto p-0">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-cloud">
                <th className="sticky left-0 z-10 bg-cloud px-3 py-2 text-left font-semibold text-ink">
                  Room
                </th>
                {calendarDays.map((d) => (
                  <th
                    key={d.toISOString()}
                    className="min-w-[44px] px-1 py-2 text-center font-medium text-slate"
                  >
                    <div>{format(d, "dd")}</div>
                    <div className="text-[10px] font-normal text-slate-dim">
                      {format(d, "EEE")}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeRooms.map((room) => (
                <tr key={room.id} className="border-b border-border/70">
                  <td className="sticky left-0 z-10 bg-surface px-3 py-2">
                    <p className="font-mono text-sm font-semibold text-ink">{room.room_number}</p>
                    <p className="text-[10px] text-slate">{room.room_type?.name ?? "—"}</p>
                  </td>
                  {calendarDays.map((d) => {
                    const dayIso = format(d, "yyyy-MM-dd");
                    const hit = cellBooked(room.id, dayIso);
                    return (
                      <td key={dayIso} className="px-0.5 py-1 text-center">
                        {hit ? (
                          <button
                            type="button"
                            title={`${hit.customer?.name ?? "Guest"} · ${BOOKING_STATUS_LABELS[hit.status]}`}
                            onClick={() => openEdit(hit)}
                            className={
                              hit.status === "checked_in"
                                ? "mx-auto block h-8 w-full rounded-[6px] bg-primary/80 text-[9px] font-semibold text-white"
                                : "mx-auto block h-8 w-full rounded-[6px] bg-primary/25 text-[9px] font-semibold text-primary"
                            }
                          >
                            {hit.customer?.name?.slice(0, 6) ?? "•"}
                          </button>
                        ) : room.status === "maintenance" ? (
                          <span className="mx-auto block h-8 w-full rounded-[6px] bg-amber/20" />
                        ) : (
                          <span className="mx-auto block h-8 w-full rounded-[6px] bg-emerald/10" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-wrap gap-3 border-t border-border px-3 py-2 text-[10px] text-slate">
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-5 rounded bg-emerald/10" /> Free
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-5 rounded bg-primary/25" /> Booked
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-5 rounded bg-primary/80" /> Checked in
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-5 rounded bg-amber/20" /> Maintenance
            </span>
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="mb-3 font-display text-sm font-semibold text-ink">Recent bookings</h2>
        {!(bookings ?? []).length ? (
          <p className="text-sm text-slate">No bookings yet.</p>
        ) : (
          <div className="panel overflow-x-auto p-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Guest</th>
                  <th>Room</th>
                  <th>Stay</th>
                  <th>Nights</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(bookings ?? []).slice(0, 40).map((b) => {
                  const rate = Number(b.room?.room_type?.base_price ?? 0);
                  const nights = bookingNights(b);
                  return (
                    <tr key={b.id}>
                      <td className="font-medium">{b.customer?.name ?? "—"}</td>
                      <td className="font-mono text-xs">
                        {b.room?.room_number}
                        <span className="ml-1 text-slate">{b.room?.room_type?.name}</span>
                      </td>
                      <td className="text-xs">
                        {formatDate(b.check_in_date)} → {formatDate(b.check_out_date)}
                      </td>
                      <td className="font-mono text-xs">
                        {nights}
                        {rate > 0 ? (
                          <span className="ml-1 text-slate">· {formatINR(rate * nights)}</span>
                        ) : null}
                      </td>
                      <td>
                        <Badge
                          variant={
                            b.status === "cancelled"
                              ? "danger"
                              : b.status === "checked_out"
                                ? "default"
                                : "info"
                          }
                        >
                          {BOOKING_STATUS_LABELS[b.status]}
                        </Badge>
                      </td>
                      <td>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(b)}>
                          Edit
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit booking" : "New booking"}
      >
        <div className="space-y-3">
          <Select
            label="Guest"
            value={form.customer_id}
            onChange={(e) => setForm((f) => ({ ...f, customer_id: e.target.value }))}
            options={(customers ?? []).map((c) => ({ value: c.id, label: c.name }))}
          />
          <Select
            label="Room"
            value={form.room_id}
            onChange={(e) => setForm((f) => ({ ...f, room_id: e.target.value }))}
            options={activeRooms.map((r) => ({
              value: r.id,
              label: `${r.room_number} · ${r.room_type?.name ?? "Type"}`,
            }))}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Check-in"
              type="date"
              value={form.check_in_date}
              onChange={(e) => setForm((f) => ({ ...f, check_in_date: e.target.value }))}
            />
            <Input
              label="Check-out"
              type="date"
              value={form.check_out_date}
              onChange={(e) => setForm((f) => ({ ...f, check_out_date: e.target.value }))}
            />
          </div>
          <Select
            label="Status"
            value={form.status}
            onChange={(e) =>
              setForm((f) => ({ ...f, status: e.target.value as RoomBookingStatus }))
            }
            options={(Object.keys(BOOKING_STATUS_LABELS) as RoomBookingStatus[]).map((k) => ({
              value: k,
              label: BOOKING_STATUS_LABELS[k],
            }))}
          />
          <Input
            label="Guest ID proof (optional)"
            value={form.guest_id_proof}
            onChange={(e) => setForm((f) => ({ ...f, guest_id_proof: e.target.value }))}
          />
          <Input
            label="Notes (optional)"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button loading={upsert.isPending} onClick={() => void save()}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
