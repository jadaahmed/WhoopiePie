import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ConfirmButton } from "@/app/reservations/confirm-button";
import {
  deleteCourseMaterial,
  updateCourseMaterial,
  uploadCourseMaterial,
} from "./actions";
import { maxMaterialSizeBytes, supportedMaterialExtensions } from "@/lib/materials/options";
import { getSessionProfile } from "@/lib/auth/session";
import type { Database } from "@/lib/types/database";

type Course = Database["public"]["Tables"]["courses"]["Row"];
type Material = Database["public"]["Tables"]["course_materials"]["Row"];
type SearchParams = Record<string, string | string[] | undefined>;

const statusMessages: Record<string, { kind: "success" | "error"; text: string }> = {
  deleted: { kind: "success", text: "Material deleted." },
  "file-size": {
    kind: "error",
    text: `File size must not exceed ${Math.floor(maxMaterialSizeBytes / 1024 / 1024)} MB.`,
  },
  "file-type": {
    kind: "error",
    text: `Supported formats: ${supportedMaterialExtensions.join(", ")}.`,
  },
  missing: { kind: "error", text: "Select a course, title, and supported file." },
  "save-error": { kind: "error", text: "Material details could not be saved. Try again." },
  unauthorized: { kind: "error", text: "You can only manage materials for your courses." },
  updated: { kind: "success", text: "Material details updated." },
  uploaded: { kind: "success", text: "Material uploaded and linked to the course." },
  "upload-error": { kind: "error", text: "The file could not be uploaded. Try again." },
};

function getParam(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

async function getVisibleCourses(
  supabase: Awaited<ReturnType<typeof getSessionProfile>>["supabase"],
  role: "admin" | "staff" | "student",
  userId: string,
) {
  if (role === "admin") {
    const { data } = await supabase
      .from("courses")
      .select("*")
      .order("code", { ascending: true });
    return data ?? [];
  }

  if (role === "staff") {
    const [{ data: courses }, { data: assignments }] = await Promise.all([
      supabase.from("courses").select("*").order("code", { ascending: true }),
      supabase
        .from("course_staff_assignments")
        .select("course_id")
        .eq("staff_id", userId),
    ]);
    const assignedIds = new Set(assignments?.map((row) => row.course_id) ?? []);
    return (courses ?? []).filter(
      (course) => course.created_by === userId || assignedIds.has(course.id),
    );
  }

  const { data: planRows } = await supabase
    .from("study_plan_courses")
    .select("course_id")
    .eq("student_id", userId);
  const courseIds = planRows?.map((row) => row.course_id) ?? [];

  if (courseIds.length === 0) {
    return [];
  }

  const { data } = await supabase
    .from("courses")
    .select("*")
    .in("id", courseIds)
    .order("code", { ascending: true });

  return data ?? [];
}

export default async function CourseMaterialsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { displayName, profile, role, supabase, userId } = await getSessionProfile();
  const params = await searchParams;
  const status = getParam(params, "status");
  const statusMessage = status ? statusMessages[status] : null;
  const courses = await getVisibleCourses(supabase, role, userId);
  const courseIds = courses.map((course: Course) => course.id);

  const { data: materials } =
    courseIds.length > 0
      ? await supabase
          .from("course_materials")
          .select("*")
          .in("course_id", courseIds)
          .order("created_at", { ascending: false })
      : { data: [] as Material[] };

  const signedUrls = new Map<string, string>();

  if (role === "student" && materials && materials.length > 0) {
    const signedResults = await Promise.all(
      materials.map(async (material) => {
        const { data } = await supabase.storage
          .from("course-materials")
          .createSignedUrl(material.file_path, 60 * 60);
        return [material.id, data?.signedUrl ?? ""] as const;
      }),
    );

    signedResults.forEach(([id, url]) => {
      signedUrls.set(id, url);
    });
  }

  const courseMap = new Map(courses.map((course: Course) => [course.id, course]));
  const canUpload = role !== "student";

  return (
    <AppShell
      active="course-materials"
      department={profile?.department}
      displayName={displayName}
      role={role}
    >
      <div className="page-header">
        <div>
          <p className="eyebrow">Curriculum module</p>
          <h1>Course materials</h1>
          <p>
            Upload, manage, or download course learning resources linked to courses.
          </p>
        </div>
        {role === "student" ? (
          <Link className="button secondary" href="/courses">
            Browse courses
          </Link>
        ) : null}
      </div>

      {statusMessage ? (
        <div className={`message-banner ${statusMessage.kind}`}>
          {statusMessage.text}
        </div>
      ) : null}

      {canUpload ? (
        <form className="dashboard-card form-card" action={uploadCourseMaterial}>
          <div className="two-column-form">
            <div className="field">
              <label htmlFor="courseId">Course</label>
              <select id="courseId" name="courseId" required>
                <option value="">Select course</option>
                {courses.map((course: Course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} · {course.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="title">Title</label>
              <input id="title" name="title" required />
            </div>
            <div className="field">
              <label htmlFor="file">File</label>
              <input
                id="file"
                name="file"
                type="file"
                accept={supportedMaterialExtensions.join(",")}
                required
              />
            </div>
            <div className="field field-wide">
              <label htmlFor="description">Description</label>
              <textarea id="description" name="description" rows={3} />
            </div>
          </div>
          <div className="form-actions">
            <button className="button" type="submit" disabled={courses.length === 0}>
              Upload material
            </button>
          </div>
        </form>
      ) : null}

      <div className="section-title">
        <div>
          <h2>Materials</h2>
          <p>
            {role === "student"
              ? "Materials from courses in your study plan."
              : "Materials for courses you can manage."}
          </p>
        </div>
      </div>

      {materials && materials.length > 0 ? (
        <div className="table-list">
          {materials.map((material: Material) => {
            const course = courseMap.get(material.course_id);
            const signedUrl = signedUrls.get(material.id);

            return (
              <article className="course-row" key={material.id}>
                <div>
                  <span className="role-badge">{course?.code ?? "Course"}</span>
                  <h2>{material.title}</h2>
                  <p className="muted">
                    {material.file_name} · {formatFileSize(material.file_size)}
                  </p>
                  {material.description ? (
                    <p className="muted">{material.description}</p>
                  ) : null}
                </div>

                {role === "student" ? (
                  signedUrl ? (
                    <a className="button" href={signedUrl}>
                      Download
                    </a>
                  ) : (
                    <span className="muted">Download unavailable</span>
                  )
                ) : (
                  <div className="material-actions">
                    <form className="inline-edit-form" action={updateCourseMaterial}>
                      <input type="hidden" name="materialId" value={material.id} />
                      <input name="title" defaultValue={material.title} required />
                      <input
                        name="description"
                        defaultValue={material.description ?? ""}
                        placeholder="Description"
                      />
                      <button className="button secondary" type="submit">
                        Save
                      </button>
                    </form>
                    <form action={deleteCourseMaterial}>
                      <input type="hidden" name="materialId" value={material.id} />
                      <ConfirmButton
                        className="button danger"
                        message="Delete this course material?"
                      >
                        Delete
                      </ConfirmButton>
                    </form>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No course materials</h2>
          <p>
            {role === "student"
              ? "Add courses to your study plan to see available materials."
              : "Upload the first material for a course you manage."}
          </p>
        </div>
      )}
    </AppShell>
  );
}
