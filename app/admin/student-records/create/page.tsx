import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createStudentRecord } from "../actions";
import { dashboardPathForRole, getSessionProfile } from "@/lib/auth/session";

type SearchParams = Record<string, string | string[] | undefined>;

const statusMessages: Record<string, string> = {
  duplicate: "A student record with this student ID already exists.",
  missing: "Complete all required student information before saving.",
  "save-error": "The student record could not be saved. Try again.",
};

function getParam(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function CreateStudentRecordPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { displayName, profile, role } = await getSessionProfile();

  if (role !== "admin") {
    redirect(dashboardPathForRole(role));
  }

  const params = await searchParams;
  const status = getParam(params, "status");

  return (
    <AppShell
      active="student-records"
      department={profile?.department}
      displayName={displayName}
      role={role}
    >
      <div className="page-header">
        <div>
          <p className="eyebrow">Facilities module</p>
          <h1>Create student record</h1>
          <p>Register new students with personal, contact, and academic details.</p>
        </div>
        <Link className="button secondary" href="/admin/student-records">
          View records
        </Link>
      </div>

      {status ? (
        <div className="message-banner error">
          {statusMessages[status] ?? statusMessages["save-error"]}
        </div>
      ) : null}

      <form className="dashboard-card form-card" action={createStudentRecord}>
        <div className="two-column-form">
          <div className="field">
            <label htmlFor="studentId">Student ID</label>
            <input id="studentId" name="studentId" required />
          </div>

          <div className="field">
            <label htmlFor="fullName">Full name</label>
            <input id="fullName" name="fullName" required />
          </div>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required />
          </div>

          <div className="field">
            <label htmlFor="phone">Phone</label>
            <input id="phone" name="phone" required />
          </div>

          <div className="field field-wide">
            <label htmlFor="address">Address</label>
            <input id="address" name="address" required />
          </div>

          <div className="field">
            <label htmlFor="department">Department</label>
            <input id="department" name="department" required />
          </div>

          <div className="field">
            <label htmlFor="program">Program</label>
            <input id="program" name="program" required />
          </div>

          <div className="field">
            <label htmlFor="academicLevel">Academic level</label>
            <input id="academicLevel" name="academicLevel" placeholder="Year 1" required />
          </div>

          <div className="field">
            <label htmlFor="enrollmentYear">Enrollment year</label>
            <input id="enrollmentYear" name="enrollmentYear" type="number" min="1900" required />
          </div>
        </div>

        <div className="form-actions">
          <Link className="button secondary" href="/admin/student-records">
            Cancel
          </Link>
          <button className="button" type="submit">
            Save record
          </button>
        </div>
      </form>
    </AppShell>
  );
}
