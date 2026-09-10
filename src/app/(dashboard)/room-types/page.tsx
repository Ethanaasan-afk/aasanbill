"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState, LoadingBlock, PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useBusinessType } from "@/hooks/use-business-type";
import {
  useHotelRoomMutations,
  useHotelRooms,
  useRoomTypeMutations,
  useRoomTypes,
} from "@/hooks/use-hotel";
import { ROOM_STATUS_LABELS } from "@/lib/hotel";
import type { HotelRoom, RoomStatus, RoomType } from "@/lib/types";
import { formatINR } from "@/lib/utils";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";

const emptyType = {
  name: "",
  description: "",
  sac_code: "",
  base_price: "0",
  gst_rate: "12",
  max_occupancy: "2",
  is_active: true,
};

const emptyRoom = {
  room_number: "",
  room_type_id: "",
  status: "available" as RoomStatus,
};

export default function RoomTypesPage() {
  const { isHotel, isLoading: btLoading } = useBusinessType();
  const { data: types, isLoading } = useRoomTypes();
  const { data: rooms } = useHotelRooms();
  const { upsert: upsertType, remove: removeType } = useRoomTypeMutations();
  const { upsert: upsertRoom, remove: removeRoom } = useHotelRoomMutations();
  const { toast } = useToast();

  const [typeOpen, setTypeOpen] = useState(false);
  const [editingType, setEditingType] = useState<RoomType | null>(null);
  const [typeForm, setTypeForm] = useState(emptyType);
  const [deleteTypeId, setDeleteTypeId] = useState<string | null>(null);

  const [roomOpen, setRoomOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<HotelRoom | null>(null);
  const [roomForm, setRoomForm] = useState(emptyRoom);
  const [deleteRoomId, setDeleteRoomId] = useState<string | null>(null);

  useEffect(() => {
    if (!btLoading && !isHotel) redirect("/products");
  }, [btLoading, isHotel]);

  if (btLoading || !isHotel) return <LoadingBlock />;

  const openCreateType = () => {
    setEditingType(null);
    setTypeForm(emptyType);
    setTypeOpen(true);
  };

  const openEditType = (t: RoomType) => {
    setEditingType(t);
    setTypeForm({
      name: t.name,
      description: t.description ?? "",
      sac_code: t.sac_code ?? "",
      base_price: String(t.base_price),
      gst_rate: String(t.gst_rate),
      max_occupancy: String(t.max_occupancy),
      is_active: t.is_active,
    });
    setTypeOpen(true);
  };

  const saveType = async () => {
    if (!typeForm.name.trim()) {
      toast("Name is required", "error");
      return;
    }
    try {
      await upsertType.mutateAsync({
        id: editingType?.id,
        ...typeForm,
        base_price: Number(typeForm.base_price) || 0,
        gst_rate: Number(typeForm.gst_rate) || 0,
        max_occupancy: Math.max(1, Number(typeForm.max_occupancy) || 1),
        name: typeForm.name.trim(),
      });
      toast(editingType ? "Room type updated" : "Room type added");
      setTypeOpen(false);
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const openCreateRoom = () => {
    setEditingRoom(null);
    setRoomForm({
      ...emptyRoom,
      room_type_id: types?.[0]?.id ?? "",
    });
    setRoomOpen(true);
  };

  const openEditRoom = (r: HotelRoom) => {
    setEditingRoom(r);
    setRoomForm({
      room_number: r.room_number,
      room_type_id: r.room_type_id,
      status: r.status,
    });
    setRoomOpen(true);
  };

  const saveRoom = async () => {
    if (!roomForm.room_number.trim() || !roomForm.room_type_id) {
      toast("Room number and type are required", "error");
      return;
    }
    try {
      await upsertRoom.mutateAsync({
        id: editingRoom?.id,
        ...roomForm,
        room_number: roomForm.room_number.trim(),
      });
      toast(editingRoom ? "Room updated" : "Room added");
      setRoomOpen(false);
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Hotel"
        title="Room Types"
        description="Categories you bill per night, plus the physical rooms under each type"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={openCreateRoom} disabled={!types?.length}>
              <Plus className="h-4 w-4" /> Add room
            </Button>
            <Button onClick={openCreateType}>
              <Plus className="h-4 w-4" /> Add room type
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <LoadingBlock />
      ) : !(types ?? []).length ? (
        <EmptyState
          title="No room types yet"
          description="Add a type like Deluxe AC Room, then add room numbers under it."
        />
      ) : (
        <div className="space-y-4">
          {(types ?? []).map((t) => {
            const typeRooms = (rooms ?? []).filter((r) => r.room_type_id === t.id);
            return (
              <div key={t.id} className="panel p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-base font-semibold text-ink">{t.name}</h3>
                      <Badge variant={t.is_active ? "success" : "default"}>
                        {t.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {t.description ? (
                      <p className="mt-1 text-sm text-slate">{t.description}</p>
                    ) : null}
                    <p className="mt-2 font-mono text-xs text-slate">
                      {formatINR(Number(t.base_price))}/night · GST {Number(t.gst_rate)}% · Max{" "}
                      {t.max_occupancy} · SAC {t.sac_code || "—"}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEditType(t)}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTypeId(t.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 border-t border-border pt-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate">
                    Rooms ({typeRooms.length})
                  </p>
                  {!typeRooms.length ? (
                    <p className="text-sm text-slate-dim">No rooms under this type yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {typeRooms.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => openEditRoom(r)}
                          className="inline-flex items-center gap-2 rounded-[10px] border border-border bg-cloud px-2.5 py-1.5 text-sm hover:bg-surface-hover"
                        >
                          <span className="font-mono font-semibold text-ink">{r.room_number}</span>
                          <span className="text-[10px] text-slate">
                            {ROOM_STATUS_LABELS[r.status] ?? r.status}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={typeOpen}
        onClose={() => setTypeOpen(false)}
        title={editingType ? "Edit room type" : "Add room type"}
      >
        <div className="space-y-3">
          <Input
            label="Name"
            value={typeForm.name}
            onChange={(e) => setTypeForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Deluxe AC Room"
          />
          <Input
            label="Description (optional)"
            value={typeForm.description}
            onChange={(e) => setTypeForm((f) => ({ ...f, description: e.target.value }))}
          />
          <div>
            <Input
              label="SAC Code"
              value={typeForm.sac_code}
              onChange={(e) => setTypeForm((f) => ({ ...f, sac_code: e.target.value }))}
              placeholder="e.g. 996311"
            />
            <p className="mt-1 text-[11px] leading-relaxed text-slate">
              Services Accounting Code — accommodation services generally fall under SAC group
              9963; confirm the exact code for your tariff category.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              label="Rate / night (excl. GST)"
              type="number"
              min={0}
              step="0.01"
              value={typeForm.base_price}
              onChange={(e) => setTypeForm((f) => ({ ...f, base_price: e.target.value }))}
            />
            <Input
              label="GST %"
              type="number"
              min={0}
              step="0.01"
              value={typeForm.gst_rate}
              onChange={(e) => setTypeForm((f) => ({ ...f, gst_rate: e.target.value }))}
            />
            <Input
              label="Max occupancy"
              type="number"
              min={1}
              value={typeForm.max_occupancy}
              onChange={(e) => setTypeForm((f) => ({ ...f, max_occupancy: e.target.value }))}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={typeForm.is_active}
              onChange={(e) => setTypeForm((f) => ({ ...f, is_active: e.target.checked }))}
            />
            Active
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setTypeOpen(false)}>
              Cancel
            </Button>
            <Button loading={upsertType.isPending} onClick={() => void saveType()}>
              Save
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={roomOpen}
        onClose={() => setRoomOpen(false)}
        title={editingRoom ? "Edit room" : "Add room"}
      >
        <div className="space-y-3">
          <Input
            label="Room number"
            value={roomForm.room_number}
            onChange={(e) => setRoomForm((f) => ({ ...f, room_number: e.target.value }))}
            placeholder="101"
          />
          <Select
            label="Room type"
            value={roomForm.room_type_id}
            onChange={(e) => setRoomForm((f) => ({ ...f, room_type_id: e.target.value }))}
            options={(types ?? []).map((t) => ({ value: t.id, label: t.name }))}
          />
          <Select
            label="Status"
            value={roomForm.status}
            onChange={(e) =>
              setRoomForm((f) => ({ ...f, status: e.target.value as RoomStatus }))
            }
            options={Object.entries(ROOM_STATUS_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setRoomOpen(false)}>
              Cancel
            </Button>
            {editingRoom ? (
              <Button
                variant="danger"
                onClick={() => {
                  setRoomOpen(false);
                  setDeleteRoomId(editingRoom.id);
                }}
              >
                Delete
              </Button>
            ) : null}
            <Button loading={upsertRoom.isPending} onClick={() => void saveRoom()}>
              Save
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteTypeId}
        onClose={() => setDeleteTypeId(null)}
        title="Delete room type?"
        message="Only works if no rooms are linked to this type."
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (!deleteTypeId) return;
          void removeType
            .mutateAsync(deleteTypeId)
            .then(() => toast("Room type deleted"))
            .catch((e) => toast((e as Error).message, "error"))
            .finally(() => setDeleteTypeId(null));
        }}
      />

      <ConfirmModal
        open={!!deleteRoomId}
        onClose={() => setDeleteRoomId(null)}
        title="Delete room?"
        message="Only works if the room has no bookings."
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (!deleteRoomId) return;
          void removeRoom
            .mutateAsync(deleteRoomId)
            .then(() => toast("Room deleted"))
            .catch((e) => toast((e as Error).message, "error"))
            .finally(() => setDeleteRoomId(null));
        }}
      />
    </div>
  );
}
