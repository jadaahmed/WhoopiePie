import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createReservation } from "./actions";
import { ConfirmButton } from "./confirm-button";
import { cancelReservation } from "./actions";
import { dashboardPathForRole, getSessionProfile } from "@/lib/auth/session";
import type { Database } from "@/lib/types/database";

type Course = Database["public"]["Tables"]["courses"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Room = Database["public"]["Tables"]["rooms"]["Row"];
type SearchParams = Record<string, string | string[] | undefined>;

const statusMessages: Record<string, { kind: "success" | "error"; text: string }> = {
  cancelled: { kind: "success", text: "Reservation cancelled and room availability updated." },
  capacity: { kind: "error", text: "The selected room capacity is not sufficient." },
  conflict: { kind: "error", text: "The selected room is already booked in that period." },
  equipment: { kind: "error", text: "The selected room does not include the required equipment." },
  "instructor-conflict": {
    kind: "error",
    text: "The selected instructor already has a session during that period.",
  },
  "invalid-time": { kind: "error", text: "End time must be after start time." },
  missing: { kind: "error", text: "Complete all required reservation fields." },
  scheduled: { kind: "success", text: "Session scheduled successfully." },
  "save-error": { kind: "error", text: "The reservation could not be saved. Try again." },
  updated: { kind: "success", text: "Reservation updated successfully." },
};

function getParam(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function defaultStart() {
  const today = new Date().toISOString().slice(0, 10);
  return `${today}T09:00`;
}

function defaultEnd() {
  const today = new Date().toISOString().slice(0, 10);
  return `${today}T10:00`;
}

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { displayName, profile, role, supabase } = await getSessionProfile();

  if (role !== "admin" && role !== "staff") {
    redirect(dashboardPathForRole(role));
  }

  const params = await searchParams;
  const status = getParam(params, "status");
  const statusMessage = status ? statusMessages[status] : null;

  const [
    { data: rooms },
    { data: courses },
    { data: staffProfiles },
    { data: reservations },
  ] = await Promise.all([
    supabase.from("rooms").select("*").order("name", { ascending: true }),
    supabase.from("courses").select("*").order("code", { ascending: true }),
    supabase
      .from("profiles")
      .select("*")
      .eq("role", "staff")
      .order("full_name", { ascending: true }),
    supabase
      .from("room_reservations")
      .select("*")
      .eq("status", "scheduled")
      .order("start_at", { ascending: true }),
  ]);

  const roomMap = new Map((rooms ?? []).map((room: Room) => [room.id, room]));
  const courseMap = new Map((courses ?? []).map((course: Course) => [course.id, course]));
  const staffMap = new Map((staffProfiles ?? []).map((staff: Profile) => [staff.id, staff]));

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
          <h1>Room reservations</h1>
          <p>Schedule class and lab sessions while checking capacity, equipment, and conflicts.</p>
        </div>
        <Link className="button secondary" href="/rooms">
          View availability
        </Link>
      </div>

      {statusMessage ? (
        <div className={`message-banner ${statusMessage.kind}`}>
          {statusMessage.text}
        </div>
      ) : null}

      <form className="dashboard-card form-card" action={createReservation}>
        <div className="two-column-form">
          <div className="field">
            <label htmlFor="sessionName">Course/session name</label>
            <input id="sessionName" name="sessionName" required />
          </div>
          <div className="field">
            <label htmlFor="courseId">Course</label>
            <select id="courseId" name="courseId">
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
            <select id="instructorId" name="instructorId" required>
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
            <select id="roomId" name="roomId" required>
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
            <input id="startAt" name="startAt" type="datetime-local" defaultValue={defaultStart()} required />
          </div>
          <div className="field">
            <label htmlFor="endAt">End</label>
            <input id="endAt" name="endAt" type="datetime-local" defaultValue={defaultEnd()} required />
          </div>
          <div className="field">
            <label htmlFor="expectedAttendance">Expected attendance</label>
            <input id="expectedAttendance" name="expectedAttendance" type="number" min="1" required />
          </div>
          <div className="field">
            <label htmlFor="requiredEquipment">Required equipment</label>
            <input id="requiredEquipment" name="requiredEquipment" placeholder="Projector, Lab benches" />
          </div>
        </div>
        <div className="form-actions">
          <button className="button" type="submit">
            Schedule session
          </button>
        </div>
      </form>

      <div className="section-title">
        <div>
          <h2>Existing reservations</h2>
          <p>Modify or cancel scheduled room bookings.</p>
        </div>
      </div>

      {reservations && reservations.length > 0 ? (
        <div className="table-list">
          {reservations.map((reservation) => {
            const room = roomMap.get(reservation.room_id);
            const course = reservation.course_id
              ? courseMap.get(reservation.course_id)
              : null;
            const instructor = staffMap.get(reservation.instructor_id);

            return (
              <article className="course-row" key={reservation.id}>
                <div>
                  <span className="role-badge">{room?.name ?? "Room unavailable"}</span>
                  <h2>{reservation.session_name}</h2>
                  <p className="muted">
                    {formatDateTime(reservation.start_at)} - {formatDateTime(reservation.end_at)}
                  </p>
                  <p className="muted">
                    {instructor?.full_name ?? "Instructor unavailable"}
                    {course ? ` · ${course.code}` : ""}
                  </p>
                </div>
                <div className="row-actions">
                  <Link className="button secondary" href={`/reservations/${reservation.id}`}>
                    Modify
                  </Link>
                  <form action={cancelReservation}>
                    <input type="hidden" name="reservationId" value={reservation.id} />
                    <ConfirmButton
                      className="button danger"
                      message="Cancel this reservation? This frees the room for future bookings."
                    >
                      Cancel
                    </ConfirmButton>
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No reservations</h2>
          <p>Scheduled class and lab sessions will appear here.</p>
        </div>
      )}
    </AppShell>
  );
}
