import { AppShell } from "@/components/app-shell";
import { addCourseToStudyPlan } from "@/app/study-plan/actions";
import { courseTypeLabels } from "@/lib/courses/options";
import { getSessionProfile } from "@/lib/auth/session";
import type { Database } from "@/lib/types/database";

type Course = Database["public"]["Tables"]["courses"]["Row"];
type SearchParams = Record<string, string | string[] | undefined>;

const planMessages: Record<string, string> = {
  added: "Course added to your study plan.",
  duplicate: "This course is already in your study plan.",
  invalid: "Select a valid course before adding it to your study plan.",
  prerequisites: "Complete this course's prerequisites before adding it.",
  "save-error": "The course could not be added. Try again.",
};

function getParam(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function getUniqueOptions(courses: Course[], key: "department" | "semester") {
  return Array.from(new Set(courses.map((course) => course[key]))).sort();
}

function courseMatchesFilters(course: Course, filters: Record<string, string>) {
  const query = filters.search.toLowerCase();

  return (
    (!query ||
      course.name.toLowerCase().includes(query) ||
      course.code.toLowerCase().includes(query)) &&
    (!filters.department || course.department === filters.department) &&
    (!filters.semester || course.semester === filters.semester) &&
    (!filters.type || course.type === filters.type)
  );
}

function buildReturnTo(filters: Record<string, string>) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const query = params.toString();
  return query ? `/courses?${query}` : "/courses";
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { displayName, profile, role, supabase, userId } = await getSessionProfile();
  const params = await searchParams;
  const filters = {
    search: getParam(params, "search") ?? "",
    department: getParam(params, "department") ?? "",
    semester: getParam(params, "semester") ?? "",
    type: getParam(params, "type") ?? "",
  };

  const { data } = await supabase
    .from("courses")
    .select("*")
    .order("department", { ascending: true })
    .order("code", { ascending: true });

  const courses = data ?? [];
  const filteredCourses = courses.filter((course) => courseMatchesFilters(course, filters));
  const departments = getUniqueOptions(courses, "department");
  const semesters = getUniqueOptions(courses, "semester");
  const returnTo = buildReturnTo(filters);

  const { data: planRows } =
    role === "student"
      ? await supabase
          .from("study_plan_courses")
          .select("course_id")
          .eq("student_id", userId)
      : { data: [] };

  const plannedCourseIds = new Set(planRows?.map((row) => row.course_id) ?? []);
  const planMessage = getParam(params, "plan");
  const courseCreated = getParam(params, "created") === "1";

  return (
    <AppShell
      active="courses"
      department={profile?.department}
      displayName={displayName}
      role={role}
    >
      <div className="page-header">
        <div>
          <p className="eyebrow">Curriculum module</p>
          <h1>Course catalog</h1>
          <p>Search by name or code, then filter by department, semester, and type.</p>
        </div>
        {role === "staff" ? (
          <a className="button" href="/courses/create">
            Create course
          </a>
        ) : role === "admin" ? (
          <a className="button" href="/admin/course-assignments">
            Assign staff
          </a>
        ) : (
          <a className="button secondary" href="/study-plan">
            View study plan
          </a>
        )}
      </div>

      {courseCreated ? (
        <div className="message-banner success">
          Course saved and added to the catalog.
        </div>
      ) : null}

      {planMessage ? (
        <div className={`message-banner ${planMessage === "added" ? "success" : "error"}`}>
          {planMessages[planMessage] ?? planMessages["save-error"]}
        </div>
      ) : null}

      <form className="filter-panel" action="/courses">
        <div className="field">
          <label htmlFor="search">Search</label>
          <input
            id="search"
            name="search"
            placeholder="Course name or code"
            defaultValue={filters.search}
          />
        </div>

        <div className="field">
          <label htmlFor="department">Department</label>
          <select id="department" name="department" defaultValue={filters.department}>
            <option value="">All departments</option>
            {departments.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="semester">Semester</label>
          <select id="semester" name="semester" defaultValue={filters.semester}>
            <option value="">All semesters</option>
            {semesters.map((semester) => (
              <option key={semester} value={semester}>
                {semester}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="type">Type</label>
          <select id="type" name="type" defaultValue={filters.type}>
            <option value="">All types</option>
            {Object.entries(courseTypeLabels).map(([type, label]) => (
              <option key={type} value={type}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-actions">
          <button className="button" type="submit">
            Apply
          </button>
          <a className="button secondary" href="/courses">
            Clear
          </a>
        </div>
      </form>

      {filteredCourses.length > 0 ? (
        <div className="catalog-grid">
          {filteredCourses.map((course) => {
            const isPlanned = plannedCourseIds.has(course.id);

            return (
              <article className="course-card" key={course.id}>
                <header>
                  <span className="role-badge">{course.code}</span>
                  <span className="status">{courseTypeLabels[course.type]}</span>
                </header>
                <h2>{course.name}</h2>
                <dl className="detail-list">
                  <div>
                    <dt>Department</dt>
                    <dd>{course.department}</dd>
                  </div>
                  <div>
                    <dt>Semester</dt>
                    <dd>{course.semester}</dd>
                  </div>
                </dl>
                {course.description ? (
                  <p className="muted">{course.description}</p>
                ) : null}
                <footer>
                  {role === "student" ? (
                    <form action={addCourseToStudyPlan}>
                      <input type="hidden" name="courseId" value={course.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <button className="button" type="submit" disabled={isPlanned}>
                        {isPlanned ? "In study plan" : "Add to plan"}
                      </button>
                    </form>
                  ) : role === "admin" ? (
                    <a className="button secondary" href="/admin/course-assignments">
                      Assign staff
                    </a>
                  ) : (
                    <span className="muted">Visible in student catalog</span>
                  )}
                </footer>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No courses found</h2>
          <p>
            {courses.length === 0
              ? "No courses have been added to the catalog yet."
              : "No courses match the current search and filter criteria."}
          </p>
        </div>
      )}
    </AppShell>
  );
}
