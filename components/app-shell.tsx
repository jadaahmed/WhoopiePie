import type { ReactNode } from "react";
import { signOut } from "@/app/dashboard/actions";
import { roleLabels, type UserRole } from "@/lib/auth/roles";

type AppShellProps = {
  active:
    | "dashboard"
    | "courses"
    | "create-course"
    | "study-plan"
    | "assigned-courses"
    | "course-assignments"
    | "course-materials"
    | "announcements"
    | "post-announcement"
    | "reservations"
    | "rooms"
    | "student-records";
  children: ReactNode;
  department?: string | null;
  displayName: string;
  role: UserRole;
};

const studentNavigation = [
  ["Dashboard", "/dashboard/student", "dashboard"],
  ["Course Catalog", "/courses", "courses"],
  ["Study Plan", "/study-plan", "study-plan"],
  ["Course Materials", "/course-materials", "course-materials"],
  ["Announcements", "/announcements", "announcements"],
] as const;

const staffNavigation = [
  ["Dashboard", "/dashboard/staff", "dashboard"],
  ["Course Catalog", "/courses", "courses"],
  ["Create Course", "/courses/create", "create-course"],
  ["Assigned Courses", "/assigned-courses", "assigned-courses"],
  ["Course Materials", "/course-materials", "course-materials"],
  ["Rooms & Labs", "/rooms", "rooms"],
  ["Reservations", "/reservations", "reservations"],
  ["Announcements", "/announcements", "announcements"],
  ["Post Update", "/announcements/create", "post-announcement"],
] as const;

const adminNavigation = [
  ["Dashboard", "/dashboard/admin", "dashboard"],
  ["Course Catalog", "/courses", "courses"],
  ["Student Records", "/admin/student-records", "student-records"],
  ["Course Assignments", "/admin/course-assignments", "course-assignments"],
  ["Course Materials", "/course-materials", "course-materials"],
  ["Rooms & Labs", "/rooms", "rooms"],
  ["Reservations", "/reservations", "reservations"],
  ["Announcements", "/announcements", "announcements"],
  ["Post Update", "/announcements/create", "post-announcement"],
] as const;

export function AppShell({
  active,
  children,
  department,
  displayName,
  role,
}: AppShellProps) {
  const navigation =
    role === "admin"
      ? adminNavigation
      : role === "staff"
        ? staffNavigation
        : studentNavigation;

  return (
    <main className="dashboard-layout">
      <aside className="sidebar">
        <a className="auth-brand" href="/dashboard">
          <span className="brand-mark">WPU</span>
          <span>Whoopie Pie University</span>
        </a>

        <nav className="nav-list" aria-label="Primary navigation">
          {navigation.map(([label, href, key]) => (
            <a
              className={`nav-item ${active === key ? "active" : ""}`}
              href={href}
              key={href}
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="profile-block">
          <span className="role-badge">{roleLabels[role]}</span>
          <p>{displayName}</p>
          {department ? <p>{department}</p> : null}
          <form action={signOut}>
            <button className="button secondary full-width" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <section className="dashboard-main">{children}</section>
    </main>
  );
}
