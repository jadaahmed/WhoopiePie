import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { roomTypeLabels } from "@/lib/facilities/options";
import { dashboardPathForRole, getSessionProfile } from "@/lib/auth/session";

type SearchParams = Record<string, string | string[] | undefined>;

function getParam(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function defaultPeriod() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    end: `${today}T18:00`,
    start: `${today}T08:00`,
  };
}

function normalizeDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { displayName, profile, role, supabase } = await getSessionProfile();

  if (role !== "admin" && role !== "staff") {
    redirect(dashboardPathForRole(role));
  }

  const defaults = defaultPeriod();
  const params = await searchParams;
  const start = getParam(params, "start") ?? defaults.start;
  const end = getParam(params, "end") ?? defaults.end;
  const startAt = normalizeDateTime(start);
  const endAt = normalizeDateTime(end);

  const { data: rooms } = await supabase
    .from("rooms")
    .select("*")
    .order("type", { ascending: true })
    .order("name", { ascending: true });

  const { data: reservations } =
    startAt && endAt
      ? await supabase
          .from("room_reservations")
          .select("*")
          .eq("status", "scheduled")
          .lt("start_at", endAt)
          .gt("end_at", startAt)
      : { data: [] };

  const unavailableRoomIds = new Set(
    reservations?.map((reservation) => reservation.room_id) ?? [],
  );

  return (
    <AppShell
      active="rooms"
      department={profile?.department}
      displayName={displayName}
      role={role}
    >
      <div className="page-header">
        <div>
          <p className="eyebrow">Facilities module</p>
          <h1>Classrooms & labs</h1>
          <p>Check room and lab availability for a selected date and time period.</p>
        </div>
        <Link className="button" href="/reservations">
          Schedule session
        </Link>
      </div>

      <form className="filter-panel compact-filter" action="/rooms">
        <div className="field">
          <label htmlFor="start">Start</label>
          <input id="start" name="start" type="datetime-local" defaultValue={start} required />
        </div>
        <div className="field">
          <label htmlFor="end">End</label>
          <input id="end" name="end" type="datetime-local" defaultValue={end} required />
        </div>
        <div className="filter-actions">
          <button className="button" type="submit">
            Check availability
          </button>
        </div>
      </form>

      {rooms && rooms.length > 0 ? (
        <div className="catalog-grid">
          {rooms.map((room) => {
            const unavailable = unavailableRoomIds.has(room.id);

            return (
              <article className={`course-card ${unavailable ? "is-unavailable" : ""}`} key={room.id}>
                <header>
                  <span className="role-badge">{roomTypeLabels[room.type]}</span>
                  <span className={`status ${unavailable ? "danger-text" : ""}`}>
                    {unavailable ? "Unavailable" : "Available"}
                  </span>
                </header>
                <h2>{room.name}</h2>
                <dl className="detail-list">
                  <div>
                    <dt>Capacity</dt>
                    <dd>{room.capacity}</dd>
                  </div>
                  <div>
                    <dt>Location</dt>
                    <dd>{room.location}</dd>
                  </div>
                </dl>
                <p className="muted">
                  Equipment: {room.equipment.length > 0 ? room.equipment.join(", ") : "None listed"}
                </p>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No rooms or labs</h2>
          <p>Add room records in Supabase to begin checking availability.</p>
        </div>
      )}
    </AppShell>
  );
}
