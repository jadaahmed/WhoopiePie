"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isTeachingAssignmentRole } from "@/lib/assignments/options";
import { dashboardPathForRole, getSessionProfile } from "@/lib/auth/session";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function assignCourseStaff(formData: FormData) {
  const { role, supabase, userId } = await getSessionProfile();

  if (role !== "admin") {
    redirect(dashboardPathForRole(role));
  }

  const courseId = readString(formData, "courseId");
  const staffIds = formData
    .getAll("staffId")
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  if (!courseId || staffIds.length === 0) {
    redirect("/admin/course-assignments?status=missing");
  }

  const rows = staffIds
    .map((staffId) => {
      const assignmentRole = readString(formData, `assignmentRole:${staffId}`);

      if (!isTeachingAssignmentRole(assignmentRole)) {
        return null;
      }

      return {
        course_id: courseId,
        staff_id: staffId,
        assignment_role: assignmentRole,
        assigned_by: userId,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (rows.length === 0) {
    redirect("/admin/course-assignments?status=missing-role");
  }

  const { error } = await supabase
    .from("course_staff_assignments")
    .upsert(rows, {
      onConflict: "course_id,staff_id",
    });

  if (error) {
    redirect("/admin/course-assignments?status=save-error");
  }

  revalidatePath("/admin/course-assignments");
  revalidatePath("/assigned-courses");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/staff");
  redirect("/admin/course-assignments?status=saved");
}
