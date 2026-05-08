import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { teachingAssignmentRoleLabels } from "@/lib/assignments/options";
import { dashboardPathForRole, getSessionProfile } from "@/lib/auth/session";
import type { Database } from "@/lib/types/database";

type Course = Database["public"]["Tables"]["courses"]["Row"];

export default async function AssignedCoursesPage() {
  const { displayName, profile, role, supabase, userId } = await getSessionProfile();

  if (role !== "staff" && role !== "admin") {
    redirect(dashboardPathForRole(role));
  }

  const { data: assignments } = await supabase
    .from("course_staff_assignments")
    .select("*")
    .eq("staff_id", userId)
    .order("created_at", { ascending: false });

  const courseIds = assignments?.map((assignment) => assignment.course_id) ?? [];
  const { data: courses } =
    courseIds.length > 0
      ? await supabase
          .from("courses")
          .select("*")
          .in("id", courseIds)
          .order("code", { ascending: true })
      : { data: [] as Course[] };

  const courseMap = new Map((courses ?? []).map((course) => [course.id, course]));

  return (
    <AppShell
      active="assigned-courses"
      department={profile?.department}
      displayName={displayName}
      role={role}
    >
      <div className="page-header">
        <div>
          <p className="eyebrow">Staff module</p>
          <h1>Assigned courses</h1>
          <p>Courses currently linked to your professor or TA responsibilities.</p>
        </div>
      </div>

      {assignments && assignments.length > 0 ? (
        <div className="table-list">
          {assignments.map((assignment) => {
            const course = courseMap.get(assignment.course_id);

            return (
              <article className="course-row" key={assignment.id}>
                <div>
                  <span className="role-badge">
                    {teachingAssignmentRoleLabels[assignment.assignment_role]}
                  </span>
                  <h2>{course?.name ?? "Course unavailable"}</h2>
                  <p className="muted">
                    {course
                      ? `${course.code} · ${course.department} · ${course.semester}`
                      : "This course may have been removed from the catalog."}
                  </p>
                </div>
                {course ? (
                  <a className="button secondary" href="/courses">
                    Catalog
                  </a>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No assigned courses</h2>
          <p>Your assigned professor and TA courses will appear here after admin allocation.</p>
        </div>
      )}
    </AppShell>
  );
}
