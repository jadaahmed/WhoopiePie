import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { removeCourseFromStudyPlan } from "./actions";
import { courseTypeLabels } from "@/lib/courses/options";
import { dashboardPathForRole, getSessionProfile } from "@/lib/auth/session";
import type { Database } from "@/lib/types/database";

type Course = Database["public"]["Tables"]["courses"]["Row"];
type SearchParams = Record<string, string | string[] | undefined>;

const planMessages: Record<string, string> = {
  added: "Course added to your study plan.",
  duplicate: "This course is already in your study plan.",
  invalid: "Select a valid course before updating your study plan.",
  prerequisites: "Complete this course's prerequisites before adding it.",
  removed: "Course removed from your study plan.",
  "save-error": "The study plan could not be updated. Try again.",
};

function getParam(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function StudyPlanPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { displayName, profile, role, supabase, userId } = await getSessionProfile();

  if (role !== "student") {
    redirect(dashboardPathForRole(role));
  }

  const params = await searchParams;
  const planMessage = getParam(params, "plan");

  const { data: planRows } = await supabase
    .from("study_plan_courses")
    .select("course_id, created_at")
    .eq("student_id", userId)
    .order("created_at", { ascending: true });

  const plannedCourseIds = planRows?.map((row) => row.course_id) ?? [];
  const { data: plannedCourses } =
    plannedCourseIds.length > 0
      ? await supabase
          .from("courses")
          .select("*")
          .in("id", plannedCourseIds)
          .order("code", { ascending: true })
      : { data: [] as Course[] };

  return (
    <AppShell
      active="study-plan"
      department={profile?.department}
      displayName={displayName}
      role={role}
    >
      <div className="page-header">
        <div>
          <p className="eyebrow">Curriculum module</p>
          <h1>Study plan</h1>
          <p>Your saved academic schedule for the logged-in student account.</p>
        </div>
        <a className="button" href="/courses">
          Add courses
        </a>
      </div>

      {planMessage ? (
        <div
          className={`message-banner ${
            ["added", "removed"].includes(planMessage) ? "success" : "error"
          }`}
        >
          {planMessages[planMessage] ?? planMessages["save-error"]}
        </div>
      ) : null}

      {plannedCourses && plannedCourses.length > 0 ? (
        <div className="table-list">
          {plannedCourses.map((course) => (
            <article className="course-row" key={course.id}>
              <div>
                <span className="role-badge">{course.code}</span>
                <h2>{course.name}</h2>
                <p className="muted">
                  {course.department} · {course.semester} · {courseTypeLabels[course.type]}
                </p>
              </div>
              <form action={removeCourseFromStudyPlan}>
                <input type="hidden" name="courseId" value={course.id} />
                <input type="hidden" name="returnTo" value="/study-plan" />
                <button className="button secondary" type="submit">
                  Remove
                </button>
              </form>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No courses in your study plan</h2>
          <p>Browse the catalog and add courses to start planning your semester.</p>
          <a className="button" href="/courses">
            Browse catalog
          </a>
        </div>
      )}
    </AppShell>
  );
}
