import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createCourse } from "./actions";
import { courseTypeLabels, courseTypes } from "@/lib/courses/options";
import { dashboardPathForRole, getSessionProfile } from "@/lib/auth/session";

type SearchParams = Record<string, string | string[] | undefined>;

const errorMessages: Record<string, string> = {
  duplicate: "A course with this code already exists.",
  missing: "Enter the required course name, code, department, semester, and type.",
  save: "The course could not be saved. Check the details and try again.",
};

function getParam(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function CreateCoursePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { displayName, profile, role } = await getSessionProfile();

  if (role !== "staff") {
    redirect(dashboardPathForRole(role));
  }

  const params = await searchParams;
  const error = getParam(params, "error");

  return (
    <AppShell
      active="create-course"
      department={profile?.department}
      displayName={displayName}
      role={role}
    >
      <div className="page-header">
        <div>
          <p className="eyebrow">Curriculum module</p>
          <h1>Create course</h1>
          <p>Add a course to the catalog students use for study planning.</p>
        </div>
        <a className="button secondary" href="/courses">
          View catalog
        </a>
      </div>

      {error ? (
        <div className="message-banner error">
          {errorMessages[error] ?? errorMessages.save}
        </div>
      ) : null}

      <form className="dashboard-card form-card" action={createCourse}>
        <div className="two-column-form">
          <div className="field">
            <label htmlFor="name">Course name</label>
            <input id="name" name="name" required />
          </div>

          <div className="field">
            <label htmlFor="code">Course code</label>
            <input id="code" name="code" required />
          </div>

          <div className="field">
            <label htmlFor="department">Department</label>
            <input id="department" name="department" required />
          </div>

          <div className="field">
            <label htmlFor="semester">Semester</label>
            <input id="semester" name="semester" placeholder="Fall 2026" required />
          </div>

          <div className="field">
            <label htmlFor="type">Type</label>
            <select id="type" name="type" defaultValue="" required>
              <option value="" disabled>
                Select type
              </option>
              {courseTypes.map((type) => (
                <option key={type} value={type}>
                  {courseTypeLabels[type]}
                </option>
              ))}
            </select>
          </div>

          <div className="field field-wide">
            <label htmlFor="description">Description</label>
            <textarea id="description" name="description" rows={4} />
          </div>
        </div>

        <div className="form-actions">
          <a className="button secondary" href="/dashboard/staff">
            Cancel
          </a>
          <button className="button" type="submit">
            Save course
          </button>
        </div>
      </form>
    </AppShell>
  );
}
