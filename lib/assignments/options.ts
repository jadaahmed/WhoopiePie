export const teachingAssignmentRoles = ["professor", "ta"] as const;

export type TeachingAssignmentRole = (typeof teachingAssignmentRoles)[number];

export const teachingAssignmentRoleLabels: Record<TeachingAssignmentRole, string> = {
  professor: "Professor",
  ta: "TA",
};

export function isTeachingAssignmentRole(
  value: unknown,
): value is TeachingAssignmentRole {
  return (
    typeof value === "string" &&
    teachingAssignmentRoles.includes(value as TeachingAssignmentRole)
  );
}
