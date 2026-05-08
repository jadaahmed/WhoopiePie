import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { assignCourseStaff } from "./actions";
import {
  teachingAssignmentRoleLabels,
  teachingAssignmentRoles,
} from "@/lib/assignments/options";
import { dashboardPathForRole, getSessionProfile } from "@/lib/auth/session";
import type { Database } from "@/lib/types/database";

type Course = Database["public"]["Tables"]["courses"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Assignment = Database["public"]["Tables"]["course_staff_assignments"]["Row"];
type SearchParams = Record<string, string | string[] | undefined>;

const statusMessages: Record<string, { kind: "success" | "error"; text: string }> = {
  saved: {
    kind: "success",
    text: "Course staff assignments saved.",
  },
  missing: {
    kind: "error",
    text: "Select a course and at least one staff member.",
  },
  "missing-role": {
    kind: "error",
    text: "Choose Professor or TA for each selected staff member.",
  },
  "save-error": {
    kind: "error",
    text: "The assignments could not be saved. Try again.",
  },
};

function getParam(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function CourseAssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { displayName, profile, role, supabase } = await getSessionProfile();

  if (role !== "admin") {
    redirect(dashboardPathForRole(role));
  }

  const params = await searchParams;
  const status = getParam(params, "status");
  const statusMessage = status ? statusMessages[status] : null;

  const [{ data: courses }, { data: staffProfiles }, { data: assignments }] =
    await Promise.all([
      supabase
        .from("courses")
        .select("*")
        .order("department", { ascending: true })
        .order("code", { ascending: true }),
      supabase
        .from("profiles")
        .select("*")
        .eq("role", "staff")
        .order("full_name", { ascending: true }),
      supabase
        .from("course_staff_assignments")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

  const courseList = courses ?? [];
  const staffList = staffProfiles ?? [];
  const assignmentList = assignments ?? [];
  const courseMap = new Map(courseList.map((course) => [course.id, course]));
  const staffMap = new Map(staffList.map((staff) => [staff.id, staff]));

  return (
    <AppShell
      active="course-assignments"
      department={profile?.department}
      displayName={displayName}
      role={role}
    >
      <div className="page-header">
        <div>
          <p className="eyebrow">Staff module</p>
          <h1>Course assignments</h1>
          <p>Select a course and assign one or more professors or TAs.</p>
        </div>
      </div>

      {statusMessage ? (
        <div className={`message-banner ${statusMessage.kind}`}>
          {statusMessage.text}
        </div>
      ) : null}

      <form className="dashboard-card form-card" action={assignCourseStaff}>
        <div className="field">
          <label htmlFor="courseId">Course</label>
          <select id="courseId" name="courseId" required>
            <option value="">Select course</option>
            {courseList.map((course: Course) => (
              <option key={course.id} value={course.id}>
                {course.code} · {course.name}
              </option>
            ))}
          </select>
        </div>

        <div className="assignment-list" aria-label="Assignable staff">
          {staffList.length > 0 ? (
            staffList.map((staff: Profile) => (
              <div className="assignment-row" key={staff.id}>
                <label className="checkbox-row">
                  <input name="staffId" type="checkbox" value={staff.id} />
                  <span>
                    <strong>{staff.full_name ?? "Unnamed staff member"}</strong>
                    <small>
                      {staff.department ?? "No department"} · {staff.university_id ?? "No ID"}
                    </small>
                  </span>
                </label>

                <select
                  aria-label={`Teaching role for ${staff.full_name ?? "staff member"}`}
                  name={`assignmentRole:${staff.id}`}
                  defaultValue="professor"
                >
                  {teachingAssignmentRoles.map((assignmentRole) => (
                    <option key={assignmentRole} value={assignmentRole}>
                      {teachingAssignmentRoleLabels[assignmentRole]}
                    </option>
                  ))}
                </select>
              </div>
            ))
          ) : (
            <p className="muted">
              No staff profiles exist yet. Create staff accounts before assigning courses.
            </p>
          )}
        </div>

        <div className="form-actions">
          <button
            className="button"
            type="submit"
            disabled={courseList.length === 0 || staffList.length === 0}
          >
            Save assignments
          </button>
        </div>
      </form>

      <div className="section-title">
        <div>
          <h2>Current assignments</h2>
          <p>Saved professor and TA links by course.</p>
        </div>
      </div>

      {assignmentList.length > 0 ? (
        <div className="table-list">
          {assignmentList.map((assignment: Assignment) => {
            const course = courseMap.get(assignment.course_id);
            const staff = staffMap.get(assignment.staff_id);

            return (
              <article className="course-row" key={assignment.id}>
                <div>
                  <span className="role-badge">
                    {teachingAssignmentRoleLabels[assignment.assignment_role]}
                  </span>
                  <h2>
                    {course ? `${course.code} · ${course.name}` : "Course unavailable"}
                  </h2>
                  <p className="muted">
                    {staff?.full_name ?? "Staff profile unavailable"}
                    {staff?.department ? ` · ${staff.department}` : ""}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No assignments yet</h2>
          <p>Saved professor and TA assignments will appear here.</p>
        </div>
      )}
    </AppShell>
  );
}
