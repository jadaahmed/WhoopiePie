export const userRoles = ["student", "staff", "admin"] as const;

export type UserRole = (typeof userRoles)[number];

export const roleLabels: Record<UserRole, string> = {
  student: "Student",
  staff: "Staff",
  admin: "Administrator",
};

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && userRoles.includes(value as UserRole);
}

export function parseUserRole(value: FormDataEntryValue | unknown): UserRole | null {
  return isUserRole(value) ? value : null;
}
