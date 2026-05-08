"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { dashboardPathForRole, getSessionProfile } from "@/lib/auth/session";

type ReservationStatus =
  | "capacity"
  | "conflict"
  | "equipment"
  | "instructor-conflict"
  | "invalid-time"
  | "missing"
  | "save-error";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readNumber(formData: FormData, key: string) {
  return Number(readString(formData, key));
}

function parseEquipment(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function hasRequiredEquipment(roomEquipment: string[], requiredEquipment: string[]) {
  const available = new Set(roomEquipment.map((item) => item.toLowerCase()));
  return requiredEquipment.every((item) => available.has(item.toLowerCase()));
}

async function requireSchedulerSession() {
  const session = await getSessionProfile();

  if (session.role !== "admin" && session.role !== "staff") {
    redirect(dashboardPathForRole(session.role));
  }

  return session;
}

async function validateReservation(
  formData: FormData,
  existingReservationId?: string,
): Promise<
  | {
      courseId: string | null;
      endAt: string;
      expectedAttendance: number;
      instructorId: string;
      requiredEquipment: string[];
      roomId: string;
      sessionName: string;
      startAt: string;
    }
  | ReservationStatus
> {
  const { supabase } = await requireSchedulerSession();
  const roomId = readString(formData, "roomId");
  const courseId = readString(formData, "courseId") || null;
  const sessionName = readString(formData, "sessionName");
  const instructorId = readString(formData, "instructorId");
  const startAt = normalizeDateTime(readString(formData, "startAt"));
  const endAt = normalizeDateTime(readString(formData, "endAt"));
  const expectedAttendance = readNumber(formData, "expectedAttendance");
  const requiredEquipment = parseEquipment(readString(formData, "requiredEquipment"));

  if (
    !roomId ||
    !sessionName ||
    !instructorId ||
    !startAt ||
    !endAt ||
    !Number.isInteger(expectedAttendance) ||
    expectedAttendance < 1
  ) {
    return "missing";
  }

  if (new Date(startAt) >= new Date(endAt)) {
    return "invalid-time";
  }

  const { data: room } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .single();

  if (!room) {
    return "missing";
  }

  if (expectedAttendance > room.capacity) {
    return "capacity";
  }

  if (!hasRequiredEquipment(room.equipment, requiredEquipment)) {
    return "equipment";
  }

  let roomConflictQuery = supabase
    .from("room_reservations")
    .select("id")
    .eq("room_id", roomId)
    .eq("status", "scheduled")
    .lt("start_at", endAt)
    .gt("end_at", startAt);

  let instructorConflictQuery = supabase
    .from("room_reservations")
    .select("id")
    .eq("instructor_id", instructorId)
    .eq("status", "scheduled")
    .lt("start_at", endAt)
    .gt("end_at", startAt);

  if (existingReservationId) {
    roomConflictQuery = roomConflictQuery.neq("id", existingReservationId);
    instructorConflictQuery = instructorConflictQuery.neq("id", existingReservationId);
  }

  const [{ data: roomConflicts }, { data: instructorConflicts }] = await Promise.all([
    roomConflictQuery,
    instructorConflictQuery,
  ]);

  if (roomConflicts && roomConflicts.length > 0) {
    return "conflict";
  }

  if (instructorConflicts && instructorConflicts.length > 0) {
    return "instructor-conflict";
  }

  return {
    courseId,
    endAt,
    expectedAttendance,
    instructorId,
    requiredEquipment,
    roomId,
    sessionName,
    startAt,
  };
}

export async function createReservation(formData: FormData) {
  const { supabase, userId } = await requireSchedulerSession();
  const validation = await validateReservation(formData);

  if (typeof validation === "string") {
    redirect(`/reservations?status=${validation}`);
  }

  const { error } = await supabase.from("room_reservations").insert({
    room_id: validation.roomId,
    course_id: validation.courseId,
    session_name: validation.sessionName,
    instructor_id: validation.instructorId,
    start_at: validation.startAt,
    end_at: validation.endAt,
    expected_attendance: validation.expectedAttendance,
    required_equipment: validation.requiredEquipment,
    created_by: userId,
  });

  if (error) {
    redirect("/reservations?status=save-error");
  }

  revalidatePath("/rooms");
  revalidatePath("/reservations");
  redirect("/reservations?status=scheduled");
}

export async function updateReservation(formData: FormData) {
  const { supabase } = await requireSchedulerSession();
  const reservationId = readString(formData, "reservationId");

  if (!reservationId) {
    redirect("/reservations?status=missing");
  }

  const validation = await validateReservation(formData, reservationId);

  if (typeof validation === "string") {
    redirect(`/reservations/${reservationId}?status=${validation}`);
  }

  const { error } = await supabase
    .from("room_reservations")
    .update({
      room_id: validation.roomId,
      course_id: validation.courseId,
      session_name: validation.sessionName,
      instructor_id: validation.instructorId,
      start_at: validation.startAt,
      end_at: validation.endAt,
      expected_attendance: validation.expectedAttendance,
      required_equipment: validation.requiredEquipment,
    })
    .eq("id", reservationId);

  if (error) {
    redirect(`/reservations/${reservationId}?status=save-error`);
  }

  revalidatePath("/rooms");
  revalidatePath("/reservations");
  redirect("/reservations?status=updated");
}

export async function cancelReservation(formData: FormData) {
  const { supabase } = await requireSchedulerSession();
  const reservationId = readString(formData, "reservationId");

  if (!reservationId) {
    redirect("/reservations?status=missing");
  }

  const { error } = await supabase
    .from("room_reservations")
    .delete()
    .eq("id", reservationId);

  if (error) {
    redirect("/reservations?status=save-error");
  }

  revalidatePath("/rooms");
  revalidatePath("/reservations");
  redirect("/reservations?status=cancelled");
}
