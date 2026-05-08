"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  isSupportedMaterial,
  maxMaterialSizeBytes,
  sanitizeFileName,
} from "@/lib/materials/options";
import { dashboardPathForRole, getSessionProfile } from "@/lib/auth/session";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function canManageCourse(courseId: string) {
  const session = await getSessionProfile();

  if (session.role === "student") {
    redirect(dashboardPathForRole(session.role));
  }

  if (session.role === "admin") {
    return session;
  }

  const [{ data: createdCourse }, { data: assignment }] = await Promise.all([
    session.supabase
      .from("courses")
      .select("id")
      .eq("id", courseId)
      .eq("created_by", session.userId)
      .maybeSingle(),
    session.supabase
      .from("course_staff_assignments")
      .select("id")
      .eq("course_id", courseId)
      .eq("staff_id", session.userId)
      .maybeSingle(),
  ]);

  if (!createdCourse && !assignment) {
    redirect("/course-materials?status=unauthorized");
  }

  return session;
}

export async function uploadCourseMaterial(formData: FormData) {
  const courseId = readString(formData, "courseId");
  const title = readString(formData, "title");
  const description = readString(formData, "description");
  const file = formData.get("file");

  if (!courseId || !title || !(file instanceof File) || file.size === 0) {
    redirect("/course-materials?status=missing");
  }

  const session = await canManageCourse(courseId);

  if (!isSupportedMaterial(file)) {
    redirect("/course-materials?status=file-type");
  }

  if (file.size > maxMaterialSizeBytes) {
    redirect("/course-materials?status=file-size");
  }

  const safeName = sanitizeFileName(file.name);
  const filePath = `${courseId}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await session.supabase.storage
    .from("course-materials")
    .upload(filePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    redirect("/course-materials?status=upload-error");
  }

  const { error } = await session.supabase.from("course_materials").insert({
    course_id: courseId,
    title,
    description: description || null,
    file_name: file.name,
    file_path: filePath,
    file_type: file.type || "application/octet-stream",
    file_size: file.size,
    uploaded_by: session.userId,
  });

  if (error) {
    await session.supabase.storage.from("course-materials").remove([filePath]);
    redirect("/course-materials?status=save-error");
  }

  revalidatePath("/course-materials");
  redirect("/course-materials?status=uploaded");
}

export async function updateCourseMaterial(formData: FormData) {
  const materialId = readString(formData, "materialId");
  const title = readString(formData, "title");
  const description = readString(formData, "description");

  if (!materialId || !title) {
    redirect("/course-materials?status=missing");
  }

  const session = await getSessionProfile();
  const { data: material } = await session.supabase
    .from("course_materials")
    .select("course_id")
    .eq("id", materialId)
    .single();

  if (!material) {
    redirect("/course-materials?status=missing");
  }

  await canManageCourse(material.course_id);

  const { error } = await session.supabase
    .from("course_materials")
    .update({
      title,
      description: description || null,
    })
    .eq("id", materialId);

  if (error) {
    redirect("/course-materials?status=save-error");
  }

  revalidatePath("/course-materials");
  redirect("/course-materials?status=updated");
}

export async function deleteCourseMaterial(formData: FormData) {
  const materialId = readString(formData, "materialId");

  if (!materialId) {
    redirect("/course-materials?status=missing");
  }

  const session = await getSessionProfile();
  const { data: material } = await session.supabase
    .from("course_materials")
    .select("course_id, file_path")
    .eq("id", materialId)
    .single();

  if (!material) {
    redirect("/course-materials?status=missing");
  }

  await canManageCourse(material.course_id);

  await session.supabase.storage.from("course-materials").remove([material.file_path]);
  const { error } = await session.supabase
    .from("course_materials")
    .delete()
    .eq("id", materialId);

  if (error) {
    redirect("/course-materials?status=save-error");
  }

  revalidatePath("/course-materials");
  redirect("/course-materials?status=deleted");
}
