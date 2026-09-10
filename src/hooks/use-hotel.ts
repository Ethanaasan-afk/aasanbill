"use client";

import { useAuth } from "@/components/auth-provider";
import { useOrgAccess } from "@/hooks/use-org-access";
import { roomHasConflict } from "@/lib/hotel";
import { requireOrganizationId } from "@/lib/org";
import { createClient } from "@/lib/supabase/client";
import type {
  HotelRoom,
  RoomBooking,
  RoomBookingStatus,
  RoomStatus,
  RoomType,
} from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const ROOM_TYPE_SELECT = "*";
const ROOM_SELECT = "*, room_type:room_types(*)";
const BOOKING_SELECT =
  "*, customer:customers(*), room:rooms(*, room_type:room_types(*))";

export function useRoomTypes(activeOnly = false) {
  const { user, loading: authLoading } = useAuth();
  return useQuery({
    queryKey: ["room_types"],
    enabled: !authLoading && !!user,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("room_types")
        .select(ROOM_TYPE_SELECT)
        .order("name");
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        base_price: Number(r.base_price),
        gst_rate: Number(r.gst_rate),
        max_occupancy: Number(r.max_occupancy),
      })) as RoomType[];
    },
    select: (rows) => (activeOnly ? rows.filter((r) => r.is_active) : rows),
  });
}

export function useRoomTypeMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { assertCanCreate } = useOrgAccess();

  const upsert = useMutation({
    mutationFn: async (
      payload: Partial<RoomType> & {
        name: string;
        base_price: number;
        gst_rate: number;
        max_occupancy: number;
      }
    ) => {
      if (!payload.id) assertCanCreate();
      const orgId = requireOrganizationId(user);
      const supabase = createClient();
      const row = {
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
        sac_code: payload.sac_code?.trim() || null,
        base_price: payload.base_price,
        gst_rate: payload.gst_rate,
        max_occupancy: payload.max_occupancy,
        is_active: payload.is_active ?? true,
      };
      if (payload.id) {
        const { data, error } = await supabase
          .from("room_types")
          .update(row)
          .eq("id", payload.id)
          .select()
          .single();
        if (error) throw error;
        return data as RoomType;
      }
      const { data, error } = await supabase
        .from("room_types")
        .insert({ ...row, organization_id: orgId })
        .select()
        .single();
      if (error) throw error;
      return data as RoomType;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["room_types"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("room_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["room_types"] });
      void qc.invalidateQueries({ queryKey: ["rooms"] });
    },
  });

  return { upsert, remove };
}

export function useHotelRooms() {
  const { user, loading: authLoading } = useAuth();
  return useQuery({
    queryKey: ["rooms"],
    enabled: !authLoading && !!user,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("rooms")
        .select(ROOM_SELECT)
        .order("room_number");
      if (error) throw error;
      return (data ?? []) as HotelRoom[];
    },
  });
}

export function useHotelRoomMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { assertCanCreate } = useOrgAccess();

  const upsert = useMutation({
    mutationFn: async (
      payload: Partial<HotelRoom> & {
        room_number: string;
        room_type_id: string;
        status: RoomStatus;
      }
    ) => {
      if (!payload.id) assertCanCreate();
      const orgId = requireOrganizationId(user);
      const supabase = createClient();
      const row = {
        room_number: payload.room_number.trim(),
        room_type_id: payload.room_type_id,
        status: payload.status,
      };
      if (payload.id) {
        const { data, error } = await supabase
          .from("rooms")
          .update(row)
          .eq("id", payload.id)
          .select(ROOM_SELECT)
          .single();
        if (error) throw error;
        return data as HotelRoom;
      }
      const { data, error } = await supabase
        .from("rooms")
        .insert({ ...row, organization_id: orgId })
        .select(ROOM_SELECT)
        .single();
      if (error) throw error;
      return data as HotelRoom;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rooms"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("rooms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["rooms"] });
      void qc.invalidateQueries({ queryKey: ["room_bookings"] });
    },
  });

  return { upsert, remove };
}

export function useRoomBookings() {
  const { user, loading: authLoading } = useAuth();
  return useQuery({
    queryKey: ["room_bookings"],
    enabled: !authLoading && !!user,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("room_bookings")
        .select(BOOKING_SELECT)
        .order("check_in_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RoomBooking[];
    },
  });
}

export function useRoomBookingMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { assertCanCreate } = useOrgAccess();

  const upsert = useMutation({
    mutationFn: async (
      payload: Partial<RoomBooking> & {
        room_id: string;
        customer_id: string;
        check_in_date: string;
        check_out_date: string;
        status: RoomBookingStatus;
      }
    ) => {
      if (!payload.id) assertCanCreate();
      if (payload.check_out_date <= payload.check_in_date) {
        throw new Error("Check-out must be after check-in.");
      }

      const orgId = requireOrganizationId(user);
      const supabase = createClient();

      const { data: existing, error: listErr } = await supabase
        .from("room_bookings")
        .select("*")
        .eq("room_id", payload.room_id);
      if (listErr) throw listErr;

      if (
        roomHasConflict(
          (existing ?? []) as RoomBooking[],
          payload.room_id,
          payload.check_in_date,
          payload.check_out_date,
          payload.id
        )
      ) {
        throw new Error(
          "This room already has a booking overlapping those dates."
        );
      }

      const row = {
        room_id: payload.room_id,
        customer_id: payload.customer_id,
        check_in_date: payload.check_in_date,
        check_out_date: payload.check_out_date,
        status: payload.status,
        guest_id_proof: payload.guest_id_proof?.trim() || null,
        notes: payload.notes?.trim() || null,
      };

      if (payload.id) {
        const { data, error } = await supabase
          .from("room_bookings")
          .update(row)
          .eq("id", payload.id)
          .select(BOOKING_SELECT)
          .single();
        if (error) throw error;
        return data as RoomBooking;
      }

      const { data, error } = await supabase
        .from("room_bookings")
        .insert({ ...row, organization_id: orgId })
        .select(BOOKING_SELECT)
        .single();
      if (error) throw error;
      return data as RoomBooking;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["room_bookings"] }),
  });

  return { upsert };
}
