import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { dashboardPathForRole, getSessionProfile } from "@/lib/auth/session";

export default async function StudentDashboardPage() {
  const { displayName, profile, role, supabase, userId } = await getSessionProfile();

  if (role !== "student") {
    redirect(dashboardPathForRole(role));
  }

  const [{ count: catalogCount }, { count: planCount }, { count: postCount }] =
    await Promise.all([
    supabase.from("courses").select("id", { count: "exact", head: true }),
    supabase
      .from("study_plan_courses")
      .select("id", { count: "exact", head: true })
      .eq("student_id", userId),
    supabase.from("community_posts").select("id", { count: "exact", head: true }),
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
          <p className="eyebrow">Student workspace</p>
          <h1>Welcome, {displayName}</h1>
          <p>
            Find available courses, build your study plan, and track the academic
            choices saved to your account.
          </p>
        </div>
        <a className="button secondary" href="/courses">
          Browse catalog
        </a>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <span>Catalog courses</span>
          <strong>{catalogCount ?? 0}</strong>
        </div>
        <div className="metric-card">
          <span>Planned courses</span>
          <strong>{planCount ?? 0}</strong>
        </div>
        <div className="metric-card">
          <span>Announcements & events</span>
          <strong>{postCount ?? 0}</strong>
        </div>
      </div>

      <div className="module-grid">
        <article className="module-card">
          <header>
            <h3>Course Catalog</h3>
            <span className="role-badge">Curriculum</span>
          </header>
          <p className="muted">
            Search and filter courses by name, code, department, semester, and type.
          </p>
          <a className="button" href="/courses">
            View courses
          </a>
        </article>

        <article className="module-card">
          <header>
            <h3>Study Plan</h3>
            <span className="role-badge">Student</span>
          </header>
          <p className="muted">
            Review saved courses and remove anything you no longer want in your plan.
          </p>
          <a className="button" href="/study-plan">
            Open study plan
          </a>
        </article>

        <article className="module-card">
          <header>
            <h3>Course Materials</h3>
            <span className="role-badge">Learning</span>
          </header>
          <p className="muted">
            Access files uploaded for courses in your study plan.
          </p>
          <a className="button" href="/course-materials">
            View materials
          </a>
        </article>

        <article className="module-card">
          <header>
            <h3>Announcements & Events</h3>
            <span className="role-badge">Community</span>
          </header>
          <p className="muted">
            Read university-wide announcements and event details.
          </p>
          <Link className="button" href="/announcements">
            Open hub
          </Link>
        </article>
      </div>
    </AppShell>
  );
}
