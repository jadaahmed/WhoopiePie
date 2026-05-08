"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isCommunityPostType } from "@/lib/community/options";
import { dashboardPathForRole, getSessionProfile } from "@/lib/auth/session";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createCommunityPost(formData: FormData) {
  const { role, supabase, userId } = await getSessionProfile();

  if (role === "student") {
    redirect(dashboardPathForRole(role));
  }

  const title = readString(formData, "title");
  const description = readString(formData, "description");
  const category = readString(formData, "category");
  const postType = readString(formData, "postType");
  const postDate = readString(formData, "postDate");

  if (!title || !description || !category || !postDate || !isCommunityPostType(postType)) {
    redirect("/announcements/create?status=missing");
  }

  const { error } = await supabase.from("community_posts").insert({
    title,
    description,
    category,
    post_type: postType,
    post_date: postDate,
    created_by: userId,
  });

  if (error) {
    redirect("/announcements/create?status=save-error");
  }

  revalidatePath("/announcements");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard/student");
  redirect("/announcements?status=published");
}
