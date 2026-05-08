import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { dashboardPathForRole, getSessionProfile } from "@/lib/auth/session";

export default async function StaffDashboardPage() {
  const { displayName, profile, role, supabase, userId } = await getSessionProfile();

  if (role !== "staff") {
    redirect(dashboardPathForRole(role));
  }

  const [
    { count: totalCourses },
    { count: myCourses },
    { count: assignedCourses },
    { count: communityPosts },
    { count: scheduledSessions },
  ] = await Promise.all([
    supabase.from("courses").select("id", { count: "exact", head: true }),
    supabase
      .from("courses")
      .select("id", { count: "exact", head: true })
      .eq("created_by", userId),
    supabase
      .from("course_staff_assignments")
      .select("id", { count: "exact", head: true })
      .eq("staff_id", userId),
    supabase.from("community_posts").select("id", { count: "exact", head: true }),
    supabase
      .from("room_reservations")
      .select("id", { count: "exact", head: true })
      .eq("instructor_id", userId)
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
          <p className="eyebrow">Faculty workspace</p>
          <h1>Welcome, {displayName}</h1>
          <p>
            Create courses, review assigned teaching duties, and publish community
            updates for university users.
          </p>
        </div>
        <a className="button secondary" href="/courses/create">
          Create course
        </a>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <span>Total catalog courses</span>
          <strong>{totalCourses ?? 0}</strong>
        </div>
        <div className="metric-card">
          <span>Courses created by you</span>
          <strong>{myCourses ?? 0}</strong>
        </div>
        <div className="metric-card">
          <span>Assigned courses</span>
          <strong>{assignedCourses ?? 0}</strong>
        </div>
      </div>

      <div className="module-grid">
        <article className="module-card">
          <header>
            <h3>Create Course</h3>
            <span className="role-badge">Faculty</span>
          </header>
          <p className="muted">
            Add a course name, code, department, semester, and type to publish it.
          </p>
          <a className="button" href="/courses/create">
            New course
          </a>
        </article>

        <article className="module-card">
          <header>
            <h3>Assigned Courses</h3>
            <span className="role-badge">Teaching</span>
          </header>
          <p className="muted">
            View courses where you are assigned as professor or TA.
          </p>
          <a className="button" href="/assigned-courses">
            View assigned
          </a>
        </article>

        <article className="module-card">
          <header>
            <h3>Course Catalog</h3>
            <span className="role-badge">Curriculum</span>
          </header>
          <p className="muted">
            Confirm newly created courses appear in the student-facing catalog.
          </p>
          <a className="button" href="/courses">
            View catalog
          </a>
        </article>

        <article className="module-card">
          <header>
            <h3>Rooms & Labs</h3>
            <span className="role-badge">{scheduledSessions ?? 0} sessions</span>
          </header>
          <p className="muted">
            Check availability and schedule class or lab sessions.
          </p>
          <a className="button" href="/rooms">
            View rooms
          </a>
        </article>

        <article className="module-card">
          <header>
            <h3>Course Materials</h3>
            <span className="role-badge">Learning</span>
          </header>
          <p className="muted">
            Upload and manage files for courses you teach or support.
          </p>
          <a className="button" href="/course-materials">
            Manage materials
          </a>
        </article>

        <article className="module-card">
          <header>
            <h3>Announcements & Events</h3>
            <span className="role-badge">{communityPosts ?? 0} live</span>
          </header>
          <p className="muted">
            Publish or review university-wide updates in the community hub.
          </p>
          <Link className="button" href="/announcements">
            Open hub
          </Link>
        </article>
      </div>
    </AppShell>
  );
}
