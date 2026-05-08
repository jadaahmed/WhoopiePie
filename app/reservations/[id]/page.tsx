import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { updateReservation } from "../actions";
import { dashboardPathForRole, getSessionProfile } from "@/lib/auth/session";
import type { Database } from "@/lib/types/database";

type Course = Database["public"]["Tables"]["courses"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Room = Database["public"]["Tables"]["rooms"]["Row"];
type SearchParams = Record<string, string | string[] | undefined>;

const statusMessages: Record<string, string> = {
  capacity: "The selected room capacity is not sufficient.",
  conflict: "The selected room is already booked in that period.",
  equipment: "The selected room does not include the required equipment.",
  "instructor-conflict": "The selected instructor already has a session during that period.",
  "invalid-time": "End time must be after start time.",
  missing: "Complete all required reservation fields.",
  "save-error": "The reservation could not be saved. Try again.",
};

function getParam(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function toDatetimeLocal(value: string) {
  return new Date(value).toISOString().slice(0, 16);
}

export default async function ReservationDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { displayName, profile, role, supabase } = await getSessionProfile();

  if (role !== "admin" && role !== "staff") {
    redirect(dashboardPathForRole(role));
  }

  const [{ id }, queryParams] = await Promise.all([params, searchParams]);
  const status = getParam(queryParams, "status");

  const [
    { data: reservation },
    { data: rooms },
    { data: courses },
    { data: staffProfiles },
  ] = await Promise.all([
    supabase.from("room_reservations").select("*").eq("id", id).single(),
    supabase.from("rooms").select("*").order("name", { ascending: true }),
    supabase.from("courses").select("*").order("code", { ascending: true }),
    supabase
      .from("profiles")
      .select("*")
      .eq("role", "staff")
      .order("full_name", { ascending: true }),
  ]);

  if (!reservation) {
    notFound();
  }

  return (
    <AppShell
      active="reservations"
      department={profile?.department}
      displayName={displayName}
      role={role}
    >
      <div className="page-header">
        <div>
          <p className="eyebrow">Facilities module</p>
          <h1>Modify reservation</h1>
          <p>Update the room, instructor, time, or session details.</p>
        </div>
        <Link className="button secondary" href="/reservations">
          Back to reservations
        </Link>
      </div>

      {status ? (
        <div className="message-banner error">
          {statusMessages[status] ?? statusMessages["save-error"]}
        </div>
      ) : null}

      <form className="dashboard-card form-card" action={updateReservation}>
        <input type="hidden" name="reservationId" value={reservation.id} />
        <div className="two-column-form">
          <div className="field">
            <label htmlFor="sessionName">Course/session name</label>
            <input
              id="sessionName"
              name="sessionName"
              defaultValue={reservation.session_name}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="courseId">Course</label>
            <select id="courseId" name="courseId" defaultValue={reservation.course_id ?? ""}>
              <option value="">No linked course</option>
              {(courses ?? []).map((course: Course) => (
                <option key={course.id} value={course.id}>
                  {course.code} · {course.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="instructorId">Instructor</label>
            <select id="instructorId" name="instructorId" defaultValue={reservation.instructor_id} required>
              <option value="">Select instructor</option>
              {(staffProfiles ?? []).map((staff: Profile) => (
                <option key={staff.id} value={staff.id}>
                  {staff.full_name ?? staff.university_id ?? staff.id}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="roomId">Room</label>
            <select id="roomId" name="roomId" defaultValue={reservation.room_id} required>
              <option value="">Select room</option>
              {(rooms ?? []).map((room: Room) => (
                <option key={room.id} value={room.id}>
                  {room.name} · {room.capacity} seats
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="startAt">Start</label>
            <input
              id="startAt"
              name="startAt"
              type="datetime-local"
              defaultValue={toDatetimeLocal(reservation.start_at)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="endAt">End</label>
            <input
              id="endAt"
              name="endAt"
              type="datetime-local"
              defaultValue={toDatetimeLocal(reservation.end_at)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="expectedAttendance">Expected attendance</label>
            <input
              id="expectedAttendance"
              name="expectedAttendance"
              type="number"
              min="1"
              defaultValue={reservation.expected_attendance}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="requiredEquipment">Required equipment</label>
            <input
              id="requiredEquipment"
              name="requiredEquipment"
              defaultValue={reservation.required_equipment.join(", ")}
            />
          </div>
        </div>

        <div className="form-actions">
          <Link className="button secondary" href="/reservations">
            Cancel
          </Link>
          <button className="button" type="submit">
            Save changes
          </button>
        </div>
      </form>
    </AppShell>
  );
}
