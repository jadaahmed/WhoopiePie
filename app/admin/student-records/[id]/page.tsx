import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import {
  studentRecordStatusLabels,
  type StudentRecordStatus,
} from "@/lib/facilities/options";
import { dashboardPathForRole, getSessionProfile } from "@/lib/auth/session";

export default async function StudentRecordDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { displayName, profile, role, supabase } = await getSessionProfile();

  if (role !== "admin") {
    redirect(dashboardPathForRole(role));
  }

  const { id } = await params;
  const { data: record } = await supabase
    .from("student_records")
    .select("*")
    .eq("id", id)
    .single();

  if (!record) {
    notFound();
  }

  return (
    <AppShell
      active="student-records"
      department={profile?.department}
      displayName={displayName}
      role={role}
    >
      <div className="page-header">
        <div>
          <p className="eyebrow">Student record</p>
          <h1>{record.full_name}</h1>
          <p>
            {record.student_id} ·{" "}
            {studentRecordStatusLabels[record.status as StudentRecordStatus]}
          </p>
        </div>
        <Link className="button secondary" href="/admin/student-records">
          Back to records
        </Link>
      </div>

      <div className="dashboard-card form-card">
        <dl className="record-grid">
          <div>
            <dt>Email</dt>
            <dd>{record.email}</dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>{record.phone}</dd>
          </div>
          <div className="field-wide">
            <dt>Address</dt>
            <dd>{record.address}</dd>
          </div>
          <div>
            <dt>Department</dt>
            <dd>{record.department}</dd>
          </div>
          <div>
            <dt>Program</dt>
            <dd>{record.program}</dd>
          </div>
          <div>
            <dt>Academic level</dt>
            <dd>{record.academic_level}</dd>
          </div>
          <div>
            <dt>Enrollment year</dt>
            <dd>{record.enrollment_year}</dd>
          </div>
        </dl>
      </div>
    </AppShell>
  );
}
