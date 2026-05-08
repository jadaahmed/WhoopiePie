"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { dashboardPathForRole, getSessionProfile } from "@/lib/auth/session";
import { appendStatusParam, safeReturnTo } from "@/lib/navigation/return-to";

async function requireStudentSession() {
  const session = await getSessionProfile();

  if (session.role !== "student") {
    redirect(dashboardPathForRole(session.role));
  }

  return session;
}

function readCourseId(formData: FormData) {
  const value = formData.get("courseId");
  return typeof value === "string" ? value : "";
}

function redirectBack(formData: FormData, status: string) {
  const returnTo = safeReturnTo(formData.get("returnTo"), "/courses");
  redirect(appendStatusParam(returnTo, "plan", status));
}

export async function addCourseToStudyPlan(formData: FormData) {
  const { supabase, userId } = await requireStudentSession();
  const courseId = readCourseId(formData);

  if (!courseId) {
    redirectBack(formData, "invalid");
  }

  const { data: existing } = await supabase
    .from("study_plan_courses")
    .select("id")
    .eq("student_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (existing) {
    redirectBack(formData, "duplicate");
  }

  const { data: prerequisites } = await supabase
    .from("course_prerequisites")
    .select("prerequisite_course_id")
    .eq("course_id", courseId);

  const prerequisiteIds =
    prerequisites?.map((row) => row.prerequisite_course_id) ?? [];

  if (prerequisiteIds.length > 0) {
    const { data: completedCourses } = await supabase
      .from("student_completed_courses")
      .select("course_id")
      .eq("student_id", userId)
      .in("course_id", prerequisiteIds);

    const completedIds = new Set(
      completedCourses?.map((row) => row.course_id) ?? [],
    );
    const hasMissingPrerequisite = prerequisiteIds.some((id) => !completedIds.has(id));

    if (hasMissingPrerequisite) {
      redirectBack(formData, "prerequisites");
    }
  }

  const { error } = await supabase.from("study_plan_courses").insert({
    student_id: userId,
    course_id: courseId,
  });

  if (error) {
    redirectBack(formData, error.code === "23505" ? "duplicate" : "save-error");
  }

  revalidatePath("/courses");
  revalidatePath("/study-plan");
  revalidatePath("/dashboard/student");
  redirectBack(formData, "added");
}

export async function removeCourseFromStudyPlan(formData: FormData) {
  const { supabase, userId } = await requireStudentSession();
  const courseId = readCourseId(formData);

  if (!courseId) {
    redirectBack(formData, "invalid");
  }

  await supabase
    .from("study_plan_courses")
    .delete()
    .eq("student_id", userId)
    .eq("course_id", courseId);

  revalidatePath("/courses");
  revalidatePath("/study-plan");
  revalidatePath("/dashboard/student");
  redirectBack(formData, "removed");
}
