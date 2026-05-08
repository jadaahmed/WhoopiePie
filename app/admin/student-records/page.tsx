import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import {
  studentRecordStatusLabels,
  type StudentRecordStatus,
} from "@/lib/facilities/options";
import { dashboardPathForRole, getSessionProfile } from "@/lib/auth/session";

type SearchParams = Record<string, string | string[] | undefined>;

function getParam(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function StudentRecordsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { displayName, profile, role, supabase } = await getSessionProfile();

  if (role !== "admin") {
    redirect(dashboardPathForRole(role));
  }

  const params = await searchParams;
  const query = getParam(params, "query") ?? "";
  const status = getParam(params, "status");
  let recordsQuery = supabase
    .from("student_records")
    .select("*")
    .order("full_name", { ascending: true });

  if (query) {
    recordsQuery = recordsQuery.or(
      `student_id.ilike.%${query}%,full_name.ilike.%${query}%`,
    );
  }

  const { data: records } = await recordsQuery;

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
          <h1>Student records</h1>
          <p>Search student records by name or student ID.</p>
        </div>
        <Link className="button" href="/admin/student-records/create">
          Create record
        </Link>
      </div>

      {status === "created" ? (
        <div className="message-banner success">
          Student record saved and available in the system.
        </div>
      ) : null}

      <form className="filter-panel compact-filter" action="/admin/student-records">
        <div className="field">
          <label htmlFor="query">Search</label>
          <input
            id="query"
            name="query"
            placeholder="Name or student ID"
            defaultValue={query}
          />
        </div>
        <div className="filter-actions">
          <button className="button" type="submit">
            Search
          </button>
          <Link className="button secondary" href="/admin/student-records">
            Clear
          </Link>
        </div>
      </form>

      {records && records.length > 0 ? (
        <div className="table-list">
          {records.map((record) => (
            <article className="course-row" key={record.id}>
              <div>
                <span className="role-badge">{record.student_id}</span>
                <h2>{record.full_name}</h2>
                <p className="muted">
                  {record.department} · {record.program} ·{" "}
                  {
                    studentRecordStatusLabels[
                      record.status as StudentRecordStatus
                    ]
                  }
                </p>
              </div>
              <Link className="button secondary" href={`/admin/student-records/${record.id}`}>
                Open record
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No student records found</h2>
          <p>
            {query
              ? "No records match the current name or student ID search."
              : "Create the first student record to start the registry."}
          </p>
        </div>
      )}
    </AppShell>
  );
}
