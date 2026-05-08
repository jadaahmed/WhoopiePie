"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isUserRole, parseUserRole, roleLabels, type UserRole } from "@/lib/auth/roles";

export type AuthActionState = {
  message: string;
  status: "idle" | "error" | "success";
};

const defaultState: AuthActionState = {
  message: "",
  status: "idle",
};

function readRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getRoleFromMetadata(value: unknown): UserRole | null {
  if (!value || typeof value !== "object" || !("role" in value)) {
    return null;
  }

  const role = (value as { role?: unknown }).role;
  return isUserRole(role) ? role : null;
}

export async function signIn(
  _previousState: AuthActionState = defaultState,
  formData: FormData,
): Promise<AuthActionState> {
  void _previousState;

  const role = parseUserRole(formData.get("role"));
  const email = readRequiredString(formData, "email");
  const password = readRequiredString(formData, "password");

  if (!role || !email || !password) {
    return {
      message: "Choose a role and enter your email and password.",
      status: "error",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return {
      message: error?.message ?? "Unable to sign in.",
      status: "error",
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  const registeredRole = profile?.role ?? getRoleFromMetadata(data.user.user_metadata);

  if (registeredRole !== role) {
    await supabase.auth.signOut();

    return {
      message: registeredRole
        ? `This account is registered as ${roleLabels[registeredRole]}.`
        : "This account does not have a university role yet.",
      status: "error",
    };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signUp(
  _previousState: AuthActionState = defaultState,
  formData: FormData,
): Promise<AuthActionState> {
  void _previousState;

  const role = parseUserRole(formData.get("role"));
  const email = readRequiredString(formData, "email");
  const password = readRequiredString(formData, "password");
  const fullName = readRequiredString(formData, "fullName");
  const universityId = readRequiredString(formData, "universityId");
  const department = readRequiredString(formData, "department");

  if (!role || !email || !password || !fullName) {
    return {
      message: "Choose a role and enter the required account details.",
      status: "error",
    };
  }

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL;
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: origin ? `${origin}/auth/callback` : undefined,
      data: {
        role,
        full_name: fullName,
        university_id: universityId,
        department,
      },
    },
  });

  if (error) {
    return {
      message: error.message,
      status: "error",
    };
  }

  return {
    message: "Account created. Check your email if confirmation is enabled.",
    status: "success",
  };
}
