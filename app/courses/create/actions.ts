"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isCourseType } from "@/lib/courses/options";
import { dashboardPathForRole, getSessionProfile } from "@/lib/auth/session";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createCourse(formData: FormData) {
  const { role, supabase, userId } = await getSessionProfile();

  if (role !== "staff") {
    redirect(dashboardPathForRole(role));
  }

  const name = readString(formData, "name");
  const code = readString(formData, "code").toUpperCase();
  const department = readString(formData, "department");
  const semester = readString(formData, "semester");
  const type = readString(formData, "type");
  const description = readString(formData, "description");

  if (!name || !code || !department || !semester || !isCourseType(type)) {
    redirect("/courses/create?error=missing");
  }

  const { error } = await supabase.from("courses").insert({
    name,
    code,
    department,
    semester,
    type,
    description: description || null,
    created_by: userId,
  });

  if (error) {
    const errorCode = error.code === "23505" ? "duplicate" : "save";
    redirect(`/courses/create?error=${errorCode}`);
  }

  revalidatePath("/courses");
  revalidatePath("/dashboard/staff");
  redirect("/courses?created=1");
}
