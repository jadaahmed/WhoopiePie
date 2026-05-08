"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { dashboardPathForRole, getSessionProfile } from "@/lib/auth/session";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createStudentRecord(formData: FormData) {
  const { role, supabase, userId } = await getSessionProfile();

  if (role !== "admin") {
    redirect(dashboardPathForRole(role));
  }

  const studentId = readString(formData, "studentId").toUpperCase();
  const fullName = readString(formData, "fullName");
  const email = readString(formData, "email");
  const phone = readString(formData, "phone");
  const address = readString(formData, "address");
  const department = readString(formData, "department");
  const program = readString(formData, "program");
  const academicLevel = readString(formData, "academicLevel");
  const enrollmentYear = Number(readString(formData, "enrollmentYear"));

  if (
    !studentId ||
    !fullName ||
    !email ||
    !phone ||
    !address ||
    !department ||
    !program ||
    !academicLevel ||
    !Number.isInteger(enrollmentYear)
  ) {
    redirect("/admin/student-records/create?status=missing");
  }

  const { data: existing } = await supabase
    .from("student_records")
    .select("id")
    .eq("student_id", studentId)
    .maybeSingle();

  if (existing) {
    redirect("/admin/student-records/create?status=duplicate");
  }

  const { error } = await supabase.from("student_records").insert({
    student_id: studentId,
    full_name: fullName,
    email,
    phone,
    address,
    department,
    program,
    academic_level: academicLevel,
    enrollment_year: enrollmentYear,
    created_by: userId,
  });

  if (error) {
    redirect(
      `/admin/student-records/create?status=${
        error.code === "23505" ? "duplicate" : "save-error"
      }`,
    );
  }

  revalidatePath("/admin/student-records");
  revalidatePath("/dashboard/admin");
  redirect("/admin/student-records?status=created");
}
