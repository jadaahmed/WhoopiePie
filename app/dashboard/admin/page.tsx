import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { dashboardPathForRole, getSessionProfile } from "@/lib/auth/session";

export default async function AdminDashboardPage() {
  const { displayName, profile, role, supabase } = await getSessionProfile();

  if (role !== "admin") {
    redirect(dashboardPathForRole(role));
  }

  const [
    { count: courseCount },
    { count: staffCount },
    { count: assignmentCount },
    { count: postCount },
    { count: studentRecordCount },
    { count: reservationCount },
  ] = await Promise.all([
    supabase.from("courses").select("id", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "staff"),
    supabase
      .from("course_staff_assignments")
      .select("id", { count: "exact", head: true }),
    supabase.from("community_posts").select("id", { count: "exact", head: true }),
    supabase.from("student_records").select("id", { count: "exact", head: true }),
    supabase
      .from("room_reservations")
      .select("id", { count: "exact", head: true })
      .eq("status", "scheduled"),
  ]);

  return (
    <AppShell
      active="dashboard"
      department={profile?.department}
      displayName={displayName}
      role={role}
    >
      <div className="dashboard-hero">
        <div>
          <p className="eyebrow">Administrator workspace</p>
          <h1>Welcome, {displayName}</h1>
          <p>
            Assign academic staff to courses and publish university-wide updates for
            the campus community.
          </p>
        </div>
        <a className="button secondary" href="/admin/course-assignments">
          Assign staff
        </a>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <span>Courses</span>
          <strong>{courseCount ?? 0}</strong>
        </div>
        <div className="metric-card">
          <span>Staff profiles</span>
          <strong>{staffCount ?? 0}</strong>
        </div>
        <div className="metric-card">
          <span>Course assignments</span>
          <strong>{assignmentCount ?? 0}</strong>
        </div>
      </div>

      <div className="module-grid">
        <article className="module-card">
          <header>
            <h3>Course Assignments</h3>
            <span className="role-badge">Admin</span>
          </header>
          <p className="muted">
            Link professors and TAs to courses so responsibilities are clear.
          </p>
          <a className="button" href="/admin/course-assignments">
            Manage assignments
          </a>
        </article>

        <article className="module-card">
          <header>
            <h3>Student Records</h3>
            <span className="role-badge">{studentRecordCount ?? 0} records</span>
          </header>
          <p className="muted">
            Create and search centralized student academic and personal records.
          </p>
          <Link className="button" href="/admin/student-records">
            Manage records
          </Link>
        </article>

        <article className="module-card">
          <header>
            <h3>Room Reservations</h3>
            <span className="role-badge">{reservationCount ?? 0} scheduled</span>
          </header>
          <p className="muted">
            Schedule, modify, or cancel class and lab room bookings.
          </p>
          <Link className="button" href="/reservations">
            Open schedule
          </Link>
        </article>

        <article className="module-card">
          <header>
            <h3>Announcements & Events</h3>
            <span className="role-badge">{postCount ?? 0} live</span>
          </header>
          <p className="muted">
            Publish university-wide announcements and events for every user.
          </p>
          <Link className="button" href="/announcements/create">
            Post update
          </Link>
        </article>
      </div>
    </AppShell>
  );
}
