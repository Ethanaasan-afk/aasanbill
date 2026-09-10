import { nightsFromStayDates } from "@/lib/business-types";
import type { RoomBooking, RoomBookingStatus } from "@/lib/types";

const ACTIVE_BOOKING: RoomBookingStatus[] = ["booked", "checked_in"];

/** True if two half-open date ranges [aStart, aEnd) and [bStart, bEnd) overlap. */
export function dateRangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function bookingNights(booking: Pick<RoomBooking, "check_in_date" | "check_out_date">): number {
  return nightsFromStayDates(booking.check_in_date, booking.check_out_date) ?? 1;
}

export function isActiveBookingStatus(status: RoomBookingStatus): boolean {
  return ACTIVE_BOOKING.includes(status);
}

/**
 * Whether a room already has an active booking overlapping the proposed stay.
 * Excludes cancelled/checked_out and optionally a booking being edited.
 */
export function roomHasConflict(
  bookings: RoomBooking[],
  roomId: string,
  checkIn: string,
  checkOut: string,
  excludeBookingId?: string | null
): boolean {
  return bookings.some(
    (b) =>
      b.room_id === roomId &&
      b.id !== excludeBookingId &&
      isActiveBookingStatus(b.status) &&
      dateRangesOverlap(b.check_in_date, b.check_out_date, checkIn, checkOut)
  );
}

export const ROOM_STATUS_LABELS: Record<string, string> = {
  available: "Available",
  maintenance: "Maintenance",
  out_of_service: "Out of service",
};

export const BOOKING_STATUS_LABELS: Record<RoomBookingStatus, string> = {
  booked: "Booked",
  checked_in: "Checked in",
  checked_out: "Checked out",
  cancelled: "Cancelled",
};
